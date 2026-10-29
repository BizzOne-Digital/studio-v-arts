"use server";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import { col, insert, lockStudio, nextSort, tx } from "@/lib/db";
import { loadOffers, rescheduleRental, seatsLeft, sessionConflict, setBookingStatus } from "@/lib/booking";
import { CATEGORY_KEYS, slugify } from "@/lib/format";
import { cleanImageUrl, deleteUploadByUrl } from "@/lib/uploads";
import { notifyStatus } from "@/lib/notify";
import { validateOffer } from "@/lib/pricing";
import { getSettings, launchChecklist, saveSettings, type DayHours, type Settings } from "@/lib/settings";
import { isDateStr, isTimeStr, minutesOf, zonedToUtc } from "@/lib/time";
import type { FormState } from "@/components/admin/ui";
import { cents, num } from "@/components/admin/server-ui";

const ok = (message: string): FormState => ({ ok: true, message });
const bad = (message: string): FormState => ({ ok: false, message });
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const chk = (fd: FormData, k: string) => fd.get(k) === "on";
const upd = async (name: string, id: string, set: Record<string, unknown>) => (await col(name)).updateOne({ _id: id } as any, { $set: set });

/** Wraps every admin mutation: authenticates on the server first, then reports errors without leaking internals. */
function guard(fn: (fd: FormData) => Promise<FormState>) {
  return async (_prev: FormState, fd: FormData): Promise<FormState> => {
    await assertAdmin();
    try {
      const r = await fn(fd);
      if (r?.ok) { revalidatePath("/", "layout"); updateTag("content"); }
      return r;
    } catch (e: any) {
      if (e?.digest?.startsWith?.("NEXT_REDIRECT")) throw e;
      console.error("admin action failed", e);
      return bad("Could not save. Please check the values and try again.");
    }
  };
}
function guardBound<A extends unknown[]>(fn: (...a: A) => Promise<FormState>) {
  return async (...args: [...A, FormState, FormData]): Promise<FormState> => {
    await assertAdmin();
    try {
      const r = await fn(...(args.slice(0, -2) as unknown as A));
      if (r?.ok) { revalidatePath("/", "layout"); updateTag("content"); }
      return r;
    } catch (e) {
      console.error("admin action failed", e);
      return bad("Could not complete that action.");
    }
  };
}

/** Saves a new image URL on a document and removes the old stored upload if it was replaced or cleared. */
async function swapImage(name: string, id: string, newUrl: string, field = "image_url") {
  const c = await col(name);
  const old = await c.findOne({ _id: id } as any, { projection: { [field]: 1 } });
  await c.updateOne({ _id: id } as any, { $set: { [field]: newUrl, image_id: null } });
  if (old?.[field] && old[field] !== newUrl) await deleteUploadByUrl(old[field]);
}

const zfirst = (e: z.ZodError) => e.issues[0]?.message ?? "Check the form values.";


/* ---------------- ordering ---------------- */
const ORDERABLE = ["services", "testimonials", "faqs", "team_members", "gallery_images", "offers", "rooms"] as const;
export const moveRow = guardBound(async (table: string, id: string, dir: "up" | "down") => {
  if (!(ORDERABLE as readonly string[]).includes(table)) return bad("Unknown list.");
  const c = await col(table);
  const rows = await c.find({}, { projection: { _id: 1 } }).sort({ sort_order: 1, created_at: 1 }).toArray();
  const i = rows.findIndex((r) => r._id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return ok("Order unchanged.");
  [rows[i], rows[j]] = [rows[j], rows[i]];
  await c.bulkWrite(rows.map((r, k) => ({ updateOne: { filter: { _id: r._id }, update: { $set: { sort_order: k } } } })));
  return ok("Order updated.");
});

export const moveFeatured = guardBound(async (id: string, dir: "up" | "down") => {
  const c = await col("services");
  const rows = await c.find({ featured_order: { $ne: null } }, { projection: { _id: 1 } }).sort({ featured_order: 1 }).toArray();
  const i = rows.findIndex((r) => r._id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return ok("Order unchanged.");
  [rows[i], rows[j]] = [rows[j], rows[i]];
  await c.bulkWrite(rows.map((r, k) => ({ updateOne: { filter: { _id: r._id }, update: { $set: { featured_order: k + 1 } } } })));
  return ok("Featured order updated.");
});

export const toggleFeatured = guardBound(async (id: string, on: boolean) => {
  const c = await col("services");
  if (on) {
    const top = await c.find({ featured_order: { $ne: null } }).sort({ featured_order: -1 }).limit(1).toArray();
    await upd("services", id, { featured_order: (top[0]?.featured_order ?? 0) + 1 });
  } else await upd("services", id, { featured_order: null });
  return ok(on ? "Marked as featured." : "Removed from featured.");
});

export const deleteRow = guardBound(async (table: string, id: string) => {
  const allowed = ["testimonials", "faqs", "team_members", "gallery_images", "blocked_dates"];
  if (!allowed.includes(table)) return bad("Not allowed.");
  const c = await col(table);
  const doc = await c.findOne({ _id: id } as any);
  await c.deleteOne({ _id: id } as any);
  if (doc?.image_url) await deleteUploadByUrl(doc.image_url);
  return ok("Deleted.");
});

/* ---------------- services ---------------- */
export const saveService = guard(async (fd) => {
  const p = z.object({
    id: z.string().uuid().optional().or(z.literal("")),
    title: z.string().trim().min(2, "Title is required.").max(120),
    category: z.enum(CATEGORY_KEYS as [string, ...string[]]),
    bookingType: z.enum(["class", "rental", "enquiry"]),
    status: z.enum(["draft", "published", "archived"]),
  }).safeParse({ id: str(fd, "id"), title: str(fd, "title"), category: str(fd, "category"), bookingType: str(fd, "bookingType"), status: str(fd, "status") });
  if (!p.success) return bad(zfirst(p.error));
  const price = cents(fd.get("price"));
  if (price != null && price < 0) return bad("Price cannot be negative.");
  const duration = num(fd.get("duration")), capacity = num(fd.get("capacity"));
  if ((duration != null && (!Number.isInteger(duration) || duration <= 0)) || (capacity != null && (!Number.isInteger(capacity) || capacity <= 0))) return bad("Duration and capacity must be whole numbers above 0.");
  const imageUrl = cleanImageUrl(fd.get("image_url"));
  const fields: Record<string, unknown> = {
    title: p.data.title, summary: str(fd, "summary").slice(0, 240), description: str(fd, "description").slice(0, 3000), category: p.data.category,
    booking_type: p.data.bookingType, status: p.data.status, audience: str(fd, "audience").slice(0, 160), age_info: str(fd, "ageInfo").slice(0, 80),
    duration_minutes: duration, price_cents: price, price_note: str(fd, "priceNote").slice(0, 120), instructor: str(fd, "instructor").slice(0, 120),
    capacity, image_alt: str(fd, "imageAlt").slice(0, 200), updated_at: new Date(),
  };
  const c = await col("services");
  if (p.data.id) {
    await upd("services", p.data.id, fields);
    await swapImage("services", p.data.id, imageUrl);
    return ok("Service saved.");
  }
  let slug = slugify(p.data.title);
  while (await c.findOne({ slug })) slug += "-" + Math.floor(Math.random() * 90 + 10);
  await insert("services", { ...fields, slug, image_url: imageUrl, image_id: null, featured_order: null, sort_order: await nextSort("services") });
  return ok("Service created.");
});

export const setServiceStatus = guardBound(async (id: string, status: "draft" | "published" | "archived") => {
  await upd("services", id, { status, updated_at: new Date() });
  return ok(`Service is now ${status}.`);
});

/* ---------------- class sessions ---------------- */
export const saveSession = guard(async (fd) => {
  const s = await getSettings();
  const tz = s.booking.timezone;
  const id = str(fd, "id");
  const date = str(fd, "date"), start = str(fd, "start"), minutes = Number(fd.get("minutes"));
  if (!isDateStr(date) || !isTimeStr(start) || !Number.isInteger(minutes) || minutes < 15 || minutes > 720) return bad("Enter a valid date, start time and length.");
  const serviceId = str(fd, "serviceId");
  const status = str(fd, "status");
  if (!["draft", "published"].includes(status)) return bad("Choose a status.");
  const capacity = Number(fd.get("capacity"));
  if (!Number.isInteger(capacity) || capacity < 1) return bad("Capacity must be 1 or more.");
  const price = cents(fd.get("price"));
  if (!(await (await col("services")).findOne({ _id: serviceId, booking_type: "class" } as any))) return bad("Choose a class service. Only services with booking type 'class' can have sessions.");
  const startsAt = zonedToUtc(date, start, tz);
  const endsAt = new Date(startsAt.getTime() + minutes * 60_000);
  return tx(async (ses) => {
    await lockStudio(ses);
    if (status === "published") {
      const c = await sessionConflict(ses, startsAt, endsAt, s, id || undefined);
      if (c) return bad(c);
    }
    const fields = { service_id: serviceId, starts_at: startsAt, ends_at: endsAt, capacity, price_cents: price, instructor: str(fd, "instructor"), status, notes: str(fd, "notes") };
    const c = await col("sessions");
    if (id) {
      const cur = await c.findOne({ _id: id } as any, { session: ses });
      if (!cur) return bad("Session not found.");
      if (cur.status === "cancelled") return bad("Cancelled sessions cannot be edited.");
      if ((await seatsLeft(ses, id, capacity)) < 0) return bad("Capacity is lower than the seats already requested.");
      await c.updateOne({ _id: id } as any, { $set: fields }, { session: ses });
      return ok("Session saved.");
    }
    await insert("sessions", fields, ses);
    return ok("Session created.");
  });
});

export const cancelSession = guardBound(async (id: string) => {
  const affected = await tx(async (ses) => {
    await lockStudio(ses);
    await (await col("sessions")).updateOne({ _id: id } as any, { $set: { status: "cancelled" } }, { session: ses });
    const bc = await col("bookings");
    const rows = await bc.find({ session_id: id, status: { $in: ["pending", "confirmed"] } }, { session: ses, projection: { _id: 1 } }).toArray();
    const now = new Date();
    if (rows.length) await bc.updateMany({ _id: { $in: rows.map((r) => r._id) } } as any, { $set: { status: "cancelled", status_changed_at: now, updated_at: now } }, { session: ses });
    return rows.map((r) => r._id as string);
  });
  for (const bid of affected) await notifyStatus(bid, "cancelled").catch(() => false);
  return ok(`Session cancelled. ${affected.length} booking${affected.length === 1 ? "" : "s"} cancelled.`);
});

/* ---------------- availability + blocked dates ---------------- */
export const saveAvailability = guard(async (fd) => {
  const s = await getSettings();
  const hours: DayHours[] = [];
  for (let i = 0; i < 7; i++) {
    const h = { enabled: chk(fd, `en${i}`), open: str(fd, `open${i}`), close: str(fd, `close${i}`) };
    if (h.enabled && (!isTimeStr(h.open) || !isTimeStr(h.close) || minutesOf(h.close) <= minutesOf(h.open))) return bad("Each open day needs an opening time before its closing time.");
    hours.push({ enabled: h.enabled, open: isTimeStr(h.open) ? h.open : "09:00", close: isTimeStr(h.close) ? h.close : "21:00" });
  }
  const n = (k: string) => Number(fd.get(k));
  const tz = str(fd, "timezone");
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); } catch { return bad("Unknown timezone. Use a name like America/Toronto."); }
  const v = { lead: n("lead"), before: n("before"), after: n("after"), min: n("minHours"), max: n("maxHours"), step: n("step"), slots: n("slots"), att: n("att") };
  if (![v.lead, v.before, v.after].every((x) => Number.isInteger(x) && x >= 0 && x <= 720)) return bad("Lead time and buffers must be whole numbers (0 or more).");
  if (!(v.min > 0 && v.max >= v.min && v.max <= 24)) return bad("Hours: minimum must be above 0 and not more than the maximum.");
  if (![15, 30, 60].includes(v.step)) return bad("Start-time step must be 15, 30 or 60 minutes.");
  if ((v.min * 60) % v.step || (v.max * 60) % v.step) return bad("Minimum and maximum hours must fit the start-time step.");
  if (!(Number.isInteger(v.slots) && v.slots >= 1 && v.slots <= 24 && Number.isInteger(v.att) && v.att >= 1)) return bad("Check sessions per request and maximum attendees.");
  const next: Settings = { ...s, booking: { ...s.booking, rentalHours: hours, timezone: tz, leadTimeHours: v.lead, bufferBeforeMin: v.before, bufferAfterMin: v.after, minHours: v.min, maxHours: v.max, slotStepMin: v.step, maxSlotsPerBooking: v.slots, rentalMaxAttendees: v.att } };
  await saveSettings(next);
  return ok("Availability saved.");
});

export const addBlockedDate = guard(async (fd) => {
  const a = str(fd, "from"), b = str(fd, "to") || a;
  if (!isDateStr(a) || !isDateStr(b) || b < a) return bad("Choose a valid date range.");
  await insert("blocked_dates", { date_start: a, date_end: b, reason: str(fd, "reason").slice(0, 120) });
  return ok("Dates blocked.");
});

/* ---------------- bookings ---------------- */
export const changeStatus = guardBound(async (id: string, next: string) => {
  const r = await setBookingStatus(id, next);
  if (!r.ok) return bad(r.error);
  const sent = await notifyStatus(id, next).catch(() => false);
  return ok(`Marked ${next}.${["confirmed", "cancelled", "declined"].includes(next) ? (sent ? " Customer emailed." : " No email sent (email not configured or failed).") : ""}`);
});

export const saveBookingMeta = guard(async (fd) => {
  const pay = str(fd, "payment");
  if (!["unpaid", "paid", "refunded", "waived"].includes(pay)) return bad("Invalid payment status.");
  await upd("bookings", str(fd, "id"), { internal_notes: str(fd, "notes").slice(0, 4000), payment_status: pay, updated_at: new Date() });
  return ok("Notes and payment status saved.");
});

export const reschedule = guard(async (fd) => {
  const id = str(fd, "id");
  const n = Number(fd.get("count"));
  const slots = Array.from({ length: n }, (_, i) => ({ date: str(fd, `date${i}`), start: str(fd, `start${i}`), minutes: Number(fd.get(`minutes${i}`)) }));
  const r = await rescheduleRental(id, slots);
  if (!r.ok) return bad(r.error);
  return ok(`Rescheduled after re-checking availability. New total ${(r.totalCents / 100).toFixed(2)} CAD.`);
});

/* ---------------- testimonials / faqs / team / gallery ---------------- */
export const saveTestimonial = guard(async (fd) => {
  const p = z.object({ name: z.string().trim().min(2, "Name is required.").max(100), quote: z.string().trim().min(10, "Quote is too short.").max(1000), status: z.enum(["draft", "published"]) })
    .safeParse({ name: str(fd, "name"), quote: str(fd, "quote"), status: str(fd, "status") });
  if (!p.success) return bad(zfirst(p.error));
  const id = str(fd, "id");
  const f = { author_name: p.data.name, author_role: str(fd, "role").slice(0, 100), quote: p.data.quote, status: p.data.status };
  if (id) await upd("testimonials", id, f);
  else await insert("testimonials", { ...f, sort_order: await nextSort("testimonials") });
  return ok("Testimonial saved.");
});

export const saveFaq = guard(async (fd) => {
  const p = z.object({ q: z.string().trim().min(5, "Question is required.").max(200), a: z.string().trim().min(5, "Answer is required.").max(2000), status: z.enum(["draft", "published"]) })
    .safeParse({ q: str(fd, "question"), a: str(fd, "answer"), status: str(fd, "status") });
  if (!p.success) return bad(zfirst(p.error));
  const id = str(fd, "id");
  const f = { question: p.data.q, answer: p.data.a, status: p.data.status, show_on_home: chk(fd, "home"), category: str(fd, "category").slice(0, 60) || "General" };
  if (id) await upd("faqs", id, f);
  else await insert("faqs", { ...f, sort_order: await nextSort("faqs") });
  return ok("FAQ saved.");
});

export const saveTeam = guard(async (fd) => {
  const name = str(fd, "name");
  if (name.length < 2) return bad("Name is required.");
  const status = str(fd, "status") === "published" ? "published" : "draft";
  const imageUrl = cleanImageUrl(fd.get("image_url"));
  const id = str(fd, "id");
  const f: Record<string, unknown> = { name, role: str(fd, "role").slice(0, 120), bio: str(fd, "bio").slice(0, 2000), status, image_alt: str(fd, "imageAlt").slice(0, 200) };
  if (id) {
    await upd("team_members", id, f);
    await swapImage("team_members", id, imageUrl);
  } else await insert("team_members", { ...f, image_url: imageUrl, image_id: null, sort_order: await nextSort("team_members") });
  return ok("Team member saved.");
});

export const addGalleryPhoto = guard(async (fd) => {
  const imageUrl = cleanImageUrl(fd.get("image_url"));
  if (!imageUrl) return bad("Upload a photo first.");
  const alt = str(fd, "alt");
  if (alt.length < 3) return bad("Add short alt text describing the photo (for screen readers).");
  await insert("gallery_images", { image_url: imageUrl, image_id: null, alt: alt.slice(0, 200), caption: str(fd, "caption").slice(0, 200), status: "published", sort_order: await nextSort("gallery_images") });
  return ok("Photo added.");
});

export const saveGalleryItem = guard(async (fd) => {
  await upd("gallery_images", str(fd, "id"), { alt: str(fd, "alt").slice(0, 200), caption: str(fd, "caption").slice(0, 200), status: str(fd, "status") === "draft" ? "draft" : "published" });
  return ok("Photo saved.");
});

/* ---------------- pricing and offers ---------------- */
export const savePricing = guard(async (fd) => {
  const s = await getSettings();
  const regular = cents(fd.get("regular"));
  const min = cents(fd.get("min"));
  if (min == null || min < 0) return bad("Enter the minimum hourly rate.");
  if (regular != null && regular < min) return bad(`The regular rate cannot be below the minimum rate (${(min / 100).toFixed(2)} CAD).`);
  const rate = Number(fd.get("taxRate") ?? 0);
  if (!(rate >= 0 && rate <= 50)) return bad("Tax rate must be between 0 and 50.");
  if (chk(fd, "taxEnabled") && !(rate > 0)) return bad("Enter a tax rate above 0, or turn tax off.");
  await saveSettings({ ...s, booking: { ...s.booking, regularRateCents: regular, showRegularRate: chk(fd, "showRegular") && regular != null, minRateCents: min,
    tax: { configured: chk(fd, "taxConfirmed"), enabled: chk(fd, "taxEnabled"), ratePct: rate, label: str(fd, "taxLabel").slice(0, 30) } } });
  return ok("Pricing settings saved.");
});

export const saveOffer = guard(async (fd) => {
  const s = await getSettings();
  const min = s.booking.minRateCents;
  const kind = str(fd, "kind");
  const title = str(fd, "title");
  if (title.length < 3) return bad("Title is required.");
  let params: any = {};
  if (kind === "flat_rate") {
    params = { rateCents: cents(fd.get("rate")) };
    const days = [0, 1, 2, 3, 4, 5, 6].filter((d) => chk(fd, `day${d}`));
    const from = str(fd, "from"), to = str(fd, "to");
    if (days.length || from || to) {
      if (from && to && (!isTimeStr(from) || !isTimeStr(to) || minutesOf(to) <= minutesOf(from))) return bad("Time window must have a start before its end.");
      params.window = { days, from, to };
    }
  } else if (kind === "percent_off") params = { percent: Number(fd.get("percent")), minSessions: Number(fd.get("minSessions")) };
  else if (kind === "package") params = { sessions: Number(fd.get("sessions")), hoursEach: Number(fd.get("hoursEach")), totalCents: cents(fd.get("total")) };
  else return bad("Choose an offer type.");
  const err = validateOffer(kind, params, min);
  if (err) return bad(err);
  const limit = num(fd.get("limit"));
  if (limit != null && (!Number.isInteger(limit) || limit < 1)) return bad("Limit must be a whole number of bookings, or empty for no limit.");
  const from = str(fd, "startsOn") || null, to = str(fd, "endsOn") || null;
  if ((from && !isDateStr(from)) || (to && !isDateStr(to)) || (from && to && to < from)) return bad("Check the start and end dates (leave empty for none).");
  const id = str(fd, "id");
  const f = { title, description: str(fd, "description").slice(0, 500), kind, params, active: chk(fd, "active"), limit_count: limit, starts_on: from, ends_on: to, show_on_home: chk(fd, "home") };
  if (id) await upd("offers", id, f);
  else {
    const c = await col("offers");
    let slug = slugify(title);
    while (await c.findOne({ slug })) slug += "-" + Math.floor(Math.random() * 90 + 10);
    await insert("offers", { ...f, slug, sort_order: await nextSort("offers") });
  }
  return ok(chk(fd, "active") ? "Offer saved and active." : "Offer saved as inactive.");
});

export const deleteOffer = guardBound(async (id: string) => {
  if ((await (await col("bookings")).countDocuments({ offer_id: id })) > 0) return bad("This offer has been used by bookings. Deactivate it instead of deleting.");
  await (await col("offers")).deleteOne({ _id: id } as any);
  return ok("Offer deleted.");
});

/* ---------------- website settings ---------------- */
const url = z.string().trim().max(300).refine((v) => v === "" || /^https:\/\/[^\s]+$/.test(v), "Social links must start with https://");

export const saveBusiness = guard(async (fd) => {
  const s = await getSettings();
  const p = z.object({
    email: z.string().trim().email("Enter a valid contact email."),
    secondaryEmail: z.string().trim().email("Enter a valid additional email.").or(z.literal("")),
    phone: z.string().trim().min(7, "Enter a phone number.").max(30),
    instagram: url, facebook: url, tiktok: url, youtube: url, whatsapp: url,
  }).safeParse(Object.fromEntries(["email", "secondaryEmail", "phone", "instagram", "facebook", "tiktok", "youtube", "whatsapp"].map((k) => [k, str(fd, k)])));
  if (!p.success) return bad(zfirst(p.error));
  const logoUrl = cleanImageUrl(fd.get("logo_url"));
  const days: DayHours[] = [];
  for (let i = 0; i < 7; i++) {
    const h = { enabled: chk(fd, `hen${i}`), open: str(fd, `hopen${i}`), close: str(fd, `hclose${i}`) };
    if (h.enabled && (!isTimeStr(h.open) || !isTimeStr(h.close) || minutesOf(h.close) <= minutesOf(h.open))) return bad("Each open day needs an opening time before its closing time.");
    days.push({ enabled: h.enabled, open: isTimeStr(h.open) ? h.open : "09:00", close: isTimeStr(h.close) ? h.close : "17:00" });
  }
  const street = str(fd, "street"), city = str(fd, "city");
  if (chk(fd, "verified") && (!street || !city)) return bad("Enter a street and city before marking the address as verified.");
  const T = (k: string, n = 600) => str(fd, k).slice(0, n);
  await saveSettings({
    ...s,
    business: { ...s.business, name: T("name", 120) || s.business.name, shortName: T("shortName", 40) || s.business.shortName, tagline: T("tagline", 80) || s.business.tagline, supportingLine: T("supportingLine", 120), email: p.data.email, secondaryEmail: p.data.secondaryEmail, phone: p.data.phone, logoId: "", logoUrl },
    address: { street: T("street", 120), city: T("city", 80), region: T("region", 60), postal: T("postal", 20), country: T("country", 60), verified: chk(fd, "verified") },
    social: { instagram: p.data.instagram, facebook: p.data.facebook, tiktok: p.data.tiktok, youtube: p.data.youtube, whatsapp: p.data.whatsapp },
    hours: { published: chk(fd, "hoursPublished"), days, note: T("hoursNote", 200) },
    copy: { heroSub: T("heroSub", 300) || s.copy.heroSub, introHeading: T("introHeading", 120) || s.copy.introHeading, introBody: T("introBody", 800) || s.copy.introBody, rentalHeading: T("rentalHeading", 120) || s.copy.rentalHeading, rentalBody: T("rentalBody", 600) || s.copy.rentalBody, closingHeading: T("closingHeading", 120) || s.copy.closingHeading, closingBody: T("closingBody", 400) || s.copy.closingBody, aboutStory: str(fd, "aboutStory").slice(0, 3000) || s.copy.aboutStory, aboutVision: T("aboutVision", 500) || s.copy.aboutVision },
  });
  if (s.business.logoUrl && s.business.logoUrl !== logoUrl) await deleteUploadByUrl(s.business.logoUrl);
  return ok("Website settings saved.");
});

export const saveTerms = guard(async (fd) => {
  const s = await getSettings();
  await saveSettings({ ...s, booking: { ...s.booking, terms: str(fd, "terms").slice(0, 4000), cancellation: str(fd, "cancellation").slice(0, 4000), waiver: str(fd, "waiver").slice(0, 12000) } });
  return ok("Terms saved.");
});

export const setLive = guardBound(async (on: boolean) => {
  const s = await getSettings();
  if (on) {
    const offers = await loadOffers();
    const hasPrice = s.booking.regularRateCents != null || offers.some((o) => o.active && (o.kind === "flat_rate" || o.kind === "package")) || (await (await col("rooms")).countDocuments({ active: { $ne: false }, price_cents: { $gt: 0 } })) > 0;
    const missing = launchChecklist(s, hasPrice).filter((c) => !c.ok).map((c) => c.label);
    if (missing.length) return bad(`Cannot enable live bookings yet. Missing: ${missing.join("; ")}.`);
  }
  await saveSettings({ ...s, booking: { ...s.booking, live: on } });
  return ok(on ? "Live bookings are ON." : "Live bookings are OFF. Visitors can browse but not submit.");
});

export const setMessageStatus = guardBound(async (id: string, status: "new" | "read" | "archived") => {
  await upd("contact_messages", id, { status });
  return ok("Updated.");
});

/* ---------------- rooms ---------------- */
export const saveRoom = guard(async (fd) => {
  const name = str(fd, "name");
  if (name.length < 2) return bad("Room name is required.");
  const price = cents(fd.get("price"));
  if (price == null || price < 0) return bad("Enter the price per hour.");
  const capacity = Number(fd.get("capacity"));
  if (!Number.isInteger(capacity) || capacity < 1) return bad("Maximum people must be 1 or more.");
  const minHours = Number(fd.get("minHours") || 1);
  if (!Number.isInteger(minHours) || minHours < 1 || minHours > 12) return bad("Minimum booking must be a whole number of hours (1 to 12).");
  const size = num(fd.get("size"));
  const after = cents(fd.get("afterPrice"));
  const until = str(fd, "priceUntil") || null;
  if (until && !isDateStr(until)) return bad("Check the date the introductory price ends.");
  if (after != null && !until) return bad("Add the date the introductory price ends, or clear the later price.");
  const fields: Record<string, unknown> = {
    name, size_sqft: size, price_cents: price, after_price_cents: after, price_until: until, price_note: str(fd, "priceNote").slice(0, 160),
    capacity, min_hours: minHours, description: str(fd, "description").slice(0, 1200), image_alt: str(fd, "imageAlt").slice(0, 200), active: chk(fd, "active"),
    uses: str(fd, "uses").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 12), image_url: cleanImageUrl(fd.get("image_url")), updated_at: new Date(),
  };
  const id = str(fd, "id");
  if (id) {
    const old = await (await col("rooms")).findOne({ _id: id } as any);
    await upd("rooms", id, { ...fields, image_id: null });
    if (old?.image_url && old.image_url !== fields.image_url) await deleteUploadByUrl(old.image_url);
    return ok("Room saved.");
  }
  const c = await col("rooms");
  let slug = slugify(name);
  while (await c.findOne({ slug })) slug += "-" + Math.floor(Math.random() * 90 + 10);
  await insert("rooms", { ...fields, slug, image_id: null, sort_order: await nextSort("rooms") });
  return ok("Room added.");
});

export const deleteRoom = guardBound(async (id: string) => {
  if ((await (await col("bookings")).countDocuments({ room_id: id })) > 0) return bad("This room has bookings. Turn off \"Bookable online\" instead of deleting it.");
  const c = await col("rooms");
  const doc = await c.findOne({ _id: id } as any);
  await c.deleteOne({ _id: id } as any);
  if (doc?.image_url) await deleteUploadByUrl(doc.image_url);
  return ok("Room deleted.");
});

/* ---------------- payments and emails ---------------- */
export const savePayments = guard(async (fd) => {
  const s = await getSettings();
  const email = z.string().trim().email("Enter a valid Interac email address.").safeParse(str(fd, "interacEmail"));
  if (!email.success) return bad(zfirst(email.error));
  const notify = str(fd, "notifyEmail");
  if (notify && !z.string().email().safeParse(notify).success) return bad("Enter a valid email for booking notifications, or leave it empty.");
  await saveSettings({ ...s, payment: { interacEmail: email.data, instructions: str(fd, "instructions").slice(0, 1500), notifyEmail: notify, confirmInstructions: str(fd, "confirmInstructions").slice(0, 3000) } });
  return ok("Payment and email settings saved.");
});
