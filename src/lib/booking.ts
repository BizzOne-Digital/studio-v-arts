import "server-only";
import crypto from "node:crypto";
import { col, insert, lockStudio, tx, type ClientSession } from "./db";
import { addTax, priceRental, type OfferRow, type PriceSlot, type Quote } from "./pricing";
import { mainRoomId, roomRate } from "./rooms";
import { getSettings, type Settings } from "./settings";
import { addDays, dateStrIn, fromMinutes, isDateStr, isTimeStr, minutesOf, weekdayOf, zonedToUtc } from "./time";

export type SlotInput = { date: string; start: string; minutes: number };
export type Busy = { start: Date; end: Date; kind: "class" | "rental" };
type Fail = { ok: false; error: string; field?: string };
export type Result<T> = ({ ok: true } & T) | Fail;
const fail = (error: string, field?: string): Fail => ({ ok: false, error, field });

/** A bookable space. Each room has its own calendar: a booking in one room never blocks another. */
type RoomDoc = { id: string; name: string; price_cents: number; after_price_cents?: number | null; price_until?: string | null; capacity: number; active?: boolean };
type RoomRef = { id: string; mainId: string };

async function findRoom(idOrSlug: string, ses?: ClientSession): Promise<RoomDoc | null> {
  const c = await col("rooms");
  const r = (await c.findOne({ _id: idOrSlug } as any, { session: ses })) ?? (await c.findOne({ slug: idOrSlug }, { session: ses }));
  return (r as unknown as RoomDoc) ?? null;
}

/* ---------- loaders ---------- */

export async function loadOffers(s?: ClientSession): Promise<OfferRow[]> {
  return (await (await col("offers")).find({}, { session: s }).sort({ sort_order: 1, created_at: 1 }).toArray()) as unknown as OfferRow[];
}

/** Promo usage = rental bookings holding the offer (pending, confirmed or completed). Declined/cancelled release it. */
export async function loadUsage(s?: ClientSession, excludeBookingId?: string): Promise<Record<string, number>> {
  const match: any = { offer_id: { $ne: null }, kind: "rental", status: { $in: ["pending", "confirmed", "completed"] } };
  if (excludeBookingId) match._id = { $ne: excludeBookingId };
  const rows = await (await col("bookings")).aggregate([{ $match: match }, { $group: { _id: "$offer_id", n: { $sum: 1 } } }], { session: s }).toArray();
  return Object.fromEntries(rows.map((x) => [x._id, x.n]));
}

async function loadBlocked(s?: ClientSession) {
  const rows = await (await col("blocked_dates")).find({}, { session: s }).toArray();
  return rows.map((r) => ({ s: r.date_start as string, e: r.date_end as string }));
}

/** Everything that occupies the given room between from and to. Classes and legacy bookings belong to the main room. */
export async function loadBusy(s: ClientSession | undefined, from: Date, to: Date, room: RoomRef, ex?: { bookingId?: string; sessionId?: string }): Promise<Busy[]> {
  const sf: any = { status: "published", starts_at: { $lt: to }, ends_at: { $gt: from } };
  if (ex?.sessionId) sf._id = { $ne: ex.sessionId };
  const kf: any = { active: true, starts_at: { $lt: to }, ends_at: { $gt: from } };
  if (ex?.bookingId) kf.booking_id = { $ne: ex.bookingId };
  const [sessions, slots] = await Promise.all([
    (await col("sessions")).find(sf, { session: s }).toArray(),
    (await col("booking_slots")).find(kf, { session: s }).toArray(),
  ]);
  const here = (r: any) => (r.room_id ?? room.mainId) === room.id;
  return [
    ...sessions.filter(here).map((r) => ({ start: r.starts_at as Date, end: r.ends_at as Date, kind: "class" as const })),
    ...slots.filter(here).map((r) => ({ start: r.starts_at as Date, end: r.ends_at as Date, kind: "rental" as const })),
  ];
}

/* ---------- conflict + slot rules ---------- */

/** Two uses of the same room need setup + cleanup between them (zero unless configured). */
export const gapMs = (s: Settings) => (s.booking.bufferBeforeMin + s.booking.bufferAfterMin) * 60_000;

export function findConflict(range: { start: Date; end: Date }, busy: Busy[], s: Settings): Busy | null {
  const gap = gapMs(s);
  return busy.find((b) => range.start.getTime() < b.end.getTime() + gap && b.start.getTime() < range.end.getTime() + gap) ?? null;
}

export function resolveSlot(
  input: SlotInput, s: Settings, blocked: { s: string; e: string }[], now: Date, opts: { skipLead?: boolean } = {},
): { ok: true; start: Date; end: Date } | Fail {
  const b = s.booking;
  if (!isDateStr(input.date) || !isTimeStr(input.start)) return fail("Choose a valid date and start time.", "slot");
  const minutes = Number(input.minutes);
  if (!Number.isInteger(minutes) || minutes % b.slotStepMin !== 0) return fail("Choose a valid duration.", "slot");
  if (minutes < b.minHours * 60 || minutes > b.maxHours * 60) return fail(`Bookings run from ${b.minHours} to ${b.maxHours} hours.`, "slot");
  if (blocked.some((x) => input.date >= x.s && input.date <= x.e)) return fail("The studio is unavailable on that date.", "slot");
  const h = b.rentalHours[weekdayOf(input.date)];
  if (!h?.enabled) return fail("The studio is not open for rentals on that day.", "slot");
  const startMin = minutesOf(input.start);
  if (startMin % b.slotStepMin !== 0 || startMin < minutesOf(h.open) || startMin + minutes > minutesOf(h.close))
    return fail(`Bookings on that day run ${h.open} to ${h.close}.`, "slot");
  const start = zonedToUtc(input.date, input.start, b.timezone);
  const end = new Date(start.getTime() + minutes * 60_000);
  if (!opts.skipLead && start.getTime() < now.getTime() + b.leadTimeHours * 3_600_000)
    return fail(b.leadTimeHours > 0 ? `Bookings need at least ${b.leadTimeHours} hours notice.` : "That time has already passed.", "slot");
  return { ok: true, start, end };
}

export type DaySlot = { start: string; end: string; state: "free" | "booked" | "past" };

/** The whole day as a slot grid for one room, so the public calendar can show free, booked and past slots. */
export async function daySlots(roomIdOrSlug: string, date: string): Promise<{ slots: DaySlot[]; reason: string; open?: string; close?: string; step: number }> {
  const s = await getSettings();
  const b = s.booking;
  const step = b.slotStepMin;
  if (!isDateStr(date)) return { slots: [], reason: "Choose a valid date.", step };
  const room = await findRoom(roomIdOrSlug);
  const mainId = (await mainRoomId()) ?? "";
  if (!room) return { slots: [], reason: "Choose a room.", step };
  const blocked = await loadBlocked();
  const h = b.rentalHours[weekdayOf(date)];
  if (!h?.enabled) return { slots: [], reason: "The studio is closed on this day.", step };
  if (blocked.some((x) => date >= x.s && date <= x.e)) return { slots: [], reason: "The studio is unavailable on this date.", step };
  const busy = await loadBusy(undefined, zonedToUtc(addDays(date, -1), "00:00", b.timezone), zonedToUtc(addDays(date, 2), "00:00", b.timezone), { id: room.id, mainId });
  const now = Date.now();
  const slots: DaySlot[] = [];
  for (let m = minutesOf(h.open); m + step <= minutesOf(h.close); m += step) {
    const start = zonedToUtc(date, fromMinutes(m), b.timezone);
    const end = new Date(start.getTime() + step * 60_000);
    let state: DaySlot["state"] = "free";
    if (start.getTime() < now + b.leadTimeHours * 3_600_000) state = "past";
    else if (findConflict({ start, end }, busy, s)) state = "booked";
    slots.push({ start: fromMinutes(m), end: fromMinutes(m + step), state });
  }
  return { slots, reason: "", open: h.open, close: h.close, step };
}

/* ---------- pricing helpers ---------- */

async function validateAndPrice(
  ses: ClientSession | undefined, s: Settings, slots: SlotInput[], opts: { excludeBookingId?: string; skipLead?: boolean }, room: RoomDoc, mainId: string,
): Promise<Result<{ ranges: PriceSlot[]; quote: Quote }>> {
  const b = s.booking;
  if (!slots.length) return fail("Choose a date and time.", "slot");
  if (slots.length > b.maxSlotsPerBooking) return fail(`You can request up to ${b.maxSlotsPerBooking} sessions at once.`, "slot");
  const blocked = await loadBlocked(ses);
  const now = new Date();
  const ranges: PriceSlot[] = [];
  for (const sl of slots) {
    const r = resolveSlot(sl, s, blocked, now, { skipLead: opts.skipLead });
    if (!r.ok) return r;
    ranges.push({ start: r.start, end: r.end });
  }
  const sorted = [...ranges].sort((a, c) => a.start.getTime() - c.start.getTime());
  for (let i = 1; i < sorted.length; i++)
    if (sorted[i].start.getTime() < sorted[i - 1].end.getTime() + gapMs(s)) return fail("Two of your sessions overlap.", "slot");
  const busy = await loadBusy(
    ses,
    new Date(sorted[0].start.getTime() - 86_400_000),
    new Date(sorted[sorted.length - 1].end.getTime() + 86_400_000),
    { id: room.id, mainId },
    { bookingId: opts.excludeBookingId },
  );
  for (const r of ranges) if (findConflict(r, busy, s)) return fail("That time has just been booked by someone else. Please choose another.", "slot");
  const rate = roomRate({ priceCents: room.price_cents, afterPriceCents: room.after_price_cents ?? null, priceUntil: room.price_until ?? null }, dateStrIn(new Date(), b.timezone));
  // The room's own hourly price is the "regular" rate; any active offers can only lower it, never below the minimum.
  const s2: Settings = { ...s, booking: { ...s.booking, regularRateCents: rate, minRateCents: Math.min(s.booking.minRateCents, rate) } };
  const offers = await loadOffers(ses);
  const usage = await loadUsage(ses, opts.excludeBookingId);
  const quote = priceRental({ slots: ranges, settings: s2, offers, usage });
  if (!quote) return fail("Online pricing is not available for this selection yet. Please contact the studio.", "slot");
  return { ok: true, ranges, quote };
}

/** Server-side quote for the booking summary. Read-only. */
export async function quoteRental(slots: SlotInput[], roomIdOrSlug: string) {
  const s = await getSettings();
  const room = await findRoom(roomIdOrSlug);
  if (!room || room.active === false) return fail("Choose a room.", "room");
  const r = await validateAndPrice(undefined, s, slots, {}, room, (await mainRoomId()) ?? "");
  if (!r.ok) return r;
  const t = addTax(r.quote.subtotalCents, s);
  return { ok: true as const, ...r.quote, ...t, roomName: room.name, taxLabel: s.booking.tax.enabled ? s.booking.tax.label || "Tax" : "" };
}

/* ---------- create ---------- */

const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
async function newReference(ses: ClientSession) {
  for (;;) {
    const bytes = crypto.randomBytes(6);
    const ref = "SV-" + Array.from(bytes, (x) => REF_ALPHABET[x % REF_ALPHABET.length]).join("");
    if (!(await (await col("bookings")).findOne({ reference: ref }, { session: ses }))) return ref;
  }
}

export type Customer = { name: string; email: string; phone: string; notes: string };

export async function createRentalBooking(c: Customer, slots: SlotInput[], attendees: number, reason: string, roomIdOrSlug: string, category: string) {
  const s = await getSettings();
  if (!s.booking.live) return fail("Online booking is not open yet.");
  const mainId = (await mainRoomId()) ?? "";
  return tx(async (ses): Promise<Result<{ id: string; reference: string; totalCents: number; subtotalCents: number; first: Date; roomName: string }>> => {
    await lockStudio(ses);
    const room = await findRoom(roomIdOrSlug, ses);
    if (!room || room.active === false) return fail("Choose a room.", "room");
    if (!Number.isInteger(attendees) || attendees < 1 || attendees > room.capacity) return fail(`This room holds up to ${room.capacity} people.`, "attendees");
    const r = await validateAndPrice(ses, s, slots, {}, room, mainId);
    if (!r.ok) return r;
    const t = addTax(r.quote.subtotalCents, s);
    const reference = await newReference(ses);
    const now = new Date();
    const b = await insert("bookings", {
      reference, kind: "rental", status: "pending", payment_status: "unpaid", customer_name: c.name, customer_email: c.email,
      customer_phone: c.phone, attendees, session_id: null, service_id: null, room_id: room.id, room_name: room.name, category,
      activity: reason, customer_notes: c.notes, internal_notes: "",
      subtotal_cents: r.quote.subtotalCents, tax_cents: t.taxCents, total_cents: t.totalCents, currency: "CAD", offer_id: r.quote.offerId,
      price_breakdown: { label: r.quote.label, hours: r.quote.hours, perHourCents: r.quote.perHourCents },
      updated_at: now, status_changed_at: now,
    }, ses);
    for (const sl of r.ranges) await insert("booking_slots", { booking_id: b.id, room_id: room.id, starts_at: sl.start, ends_at: sl.end, active: true }, ses);
    return { ok: true, id: b.id, reference, totalCents: t.totalCents, subtotalCents: r.quote.subtotalCents, first: r.ranges[0].start, roomName: room.name };
  });
}

export async function seatsLeft(ses: ClientSession | undefined, sessionId: string, capacity: number) {
  const r = await (await col("bookings")).aggregate(
    [{ $match: { session_id: sessionId, status: { $in: ["pending", "confirmed", "completed"] } } }, { $group: { _id: null, n: { $sum: "$attendees" } } }],
    { session: ses },
  ).toArray();
  return capacity - (r[0]?.n ?? 0);
}

export async function createClassBooking(c: Customer, sessionId: string, attendees: number) {
  const s = await getSettings();
  if (!s.booking.live) return fail("Online booking is not open yet.");
  if (!Number.isInteger(attendees) || attendees < 1) return fail("Enter the number of attendees.", "attendees");
  return tx(async (ses): Promise<Result<{ id: string; reference: string; totalCents: number; subtotalCents: number; first: Date; title: string }>> => {
    await lockStudio(ses);
    const sess = await (await col("sessions")).findOne({ _id: sessionId } as any, { session: ses });
    const svc = sess ? await (await col("services")).findOne({ _id: sess.service_id } as any, { session: ses }) : null;
    if (!sess || !svc || sess.status !== "published" || svc.status !== "published" || svc.booking_type !== "class")
      return fail("That class is not available to book.", "session");
    if (new Date(sess.starts_at).getTime() <= Date.now()) return fail("That class has already started.", "session");
    const price = sess.price_cents ?? svc.price_cents ?? null;
    if (price == null) return fail("This class has no online price yet. Please contact the studio to book.", "session");
    const left = await seatsLeft(ses, sessionId, sess.capacity);
    if (left <= 0) return fail("Sorry, this class is full.", "session");
    if (attendees > left) return fail(`Only ${left} seat${left === 1 ? "" : "s"} left.`, "attendees");
    const sub = price * attendees;
    const t = addTax(sub, s);
    const reference = await newReference(ses);
    const now = new Date();
    const b = await insert("bookings", {
      reference, kind: "class", status: "pending", payment_status: "unpaid", customer_name: c.name, customer_email: c.email, customer_phone: c.phone,
      attendees, session_id: sessionId, service_id: svc.id, room_id: null, room_name: "", category: "", activity: "", customer_notes: c.notes, internal_notes: "",
      subtotal_cents: sub, tax_cents: t.taxCents, total_cents: t.totalCents, currency: "CAD", offer_id: null,
      price_breakdown: { label: "Class", unitCents: price }, updated_at: now, status_changed_at: now,
    }, ses);
    return { ok: true, id: b.id, reference, totalCents: t.totalCents, subtotalCents: sub, first: new Date(sess.starts_at), title: svc.title };
  });
}

/* ---------- status changes + reschedule (admin) ---------- */

const TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "declined", "cancelled"],
  confirmed: ["cancelled", "completed"],
};

export async function setBookingStatus(id: string, next: string): Promise<Result<{ prev: string }>> {
  return tx(async (ses) => {
    await lockStudio(ses);
    const b = await (await col("bookings")).findOne({ _id: id } as any, { session: ses });
    if (!b) return fail("Booking not found.");
    if (!TRANSITIONS[b.status]?.includes(next)) return fail(`A ${b.status} booking cannot be marked ${next}.`);
    const now = new Date();
    await (await col("bookings")).updateOne({ _id: id } as any, { $set: { status: next, status_changed_at: now, updated_at: now } }, { session: ses });
    if (next === "declined" || next === "cancelled") await (await col("booking_slots")).updateMany({ booking_id: id }, { $set: { active: false } }, { session: ses });
    return { ok: true, prev: b.status as string };
  });
}

export async function rescheduleRental(id: string, slots: SlotInput[]): Promise<Result<{ totalCents: number }>> {
  const s = await getSettings();
  const mainId = (await mainRoomId()) ?? "";
  return tx(async (ses): Promise<Result<{ totalCents: number }>> => {
    await lockStudio(ses);
    const b = await (await col("bookings")).findOne({ _id: id } as any, { session: ses });
    if (!b || b.kind !== "rental") return fail("Only rental bookings can be rescheduled here.");
    if (!["pending", "confirmed"].includes(b.status)) return fail("Only pending or confirmed bookings can be rescheduled.");
    const room = await findRoom(b.room_id ?? mainId, ses);
    if (!room) return fail("The room for this booking no longer exists.");
    const v = await validateAndPrice(ses, s, slots, { excludeBookingId: id, skipLead: true }, room, mainId);
    if (!v.ok) return v;
    const t = addTax(v.quote.subtotalCents, s);
    await (await col("booking_slots")).deleteMany({ booking_id: id }, { session: ses });
    for (const sl of v.ranges) await insert("booking_slots", { booking_id: id, room_id: room.id, starts_at: sl.start, ends_at: sl.end, active: true }, ses);
    await (await col("bookings")).updateOne({ _id: id } as any, { $set: {
      subtotal_cents: v.quote.subtotalCents, tax_cents: t.taxCents, total_cents: t.totalCents, offer_id: v.quote.offerId, updated_at: new Date(),
      price_breakdown: { label: v.quote.label, hours: v.quote.hours, perHourCents: v.quote.perHourCents },
    } }, { session: ses });
    return { ok: true, totalCents: t.totalCents };
  });
}

/** Checks a proposed class session against rentals and other published sessions in the main room. Call inside tx after lockStudio. */
export async function sessionConflict(ses: ClientSession | undefined, start: Date, end: Date, s: Settings, excludeSessionId?: string): Promise<string | null> {
  const mainId = (await mainRoomId()) ?? "";
  const busy = await loadBusy(ses, new Date(start.getTime() - 86_400_000), new Date(end.getTime() + 86_400_000), { id: mainId, mainId }, { sessionId: excludeSessionId });
  const c = findConflict({ start, end }, busy, s);
  if (!c) return null;
  return c.kind === "rental"
    ? "That time clashes with a studio booking in the main studio."
    : "That time clashes with another class.";
}
