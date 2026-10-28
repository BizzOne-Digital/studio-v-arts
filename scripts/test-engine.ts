// Booking-engine checks. Run against a scratch database:  npm run test:engine
// Uses the demo seed (live bookings, two rooms, six demo class sessions). WARNING: deletes all bookings.
import { col } from "../src/lib/db";
import { createClassBooking, createRentalBooking, daySlots, quoteRental, rescheduleRental, setBookingStatus } from "../src/lib/booking";
import { priceRental, type OfferRow } from "../src/lib/pricing";
import { DEFAULT_SETTINGS } from "../src/lib/settings";
import { addDays, dateStrIn } from "../src/lib/time";

let failed = 0;
const check = (name: string, ok: boolean, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  " + extra : ""}`);
  if (!ok) failed++;
};
const cust = (i: number) => ({ name: `Test ${i}`, email: `t${i}@example.com`, phone: "5145550100", notes: "" });
const free = (d: Awaited<ReturnType<typeof daySlots>>) => d.slots.filter((s) => s.state === "free").map((s) => s.start);

async function main() {
  await (await col("bookings")).deleteMany({});
  await (await col("booking_slots")).deleteMany({});
  const rooms = await (await col("rooms")).find({}).sort({ sort_order: 1 }).toArray();
  const [main, priv] = [rooms[0], rooms[1]];
  check("two rooms exist (main + private)", !!main && !!priv, `${main?.name} / ${priv?.name}`);

  // 1. Class capacity under concurrent submissions
  const ses = (await (await col("sessions")).find({ status: "published" }).sort({ starts_at: 1 }).limit(1).toArray())[0];
  const results = await Promise.all(Array.from({ length: 12 }, (_, i) => createClassBooking(cust(i), ses.id, 1)));
  const okN = results.filter((r) => r.ok).length;
  check("class: 12 parallel single-seat requests never exceed capacity", okN === ses.capacity, `accepted=${okN} capacity=${ses.capacity}`);
  check("class: full class rejects", !(await createClassBooking(cust(99), ses.id, 1)).ok);

  // 2. Slot grid + one shared calendar per room
  const date = addDays(dateStrIn(new Date(), DEFAULT_SETTINGS.booking.timezone), 5);
  const g1 = await daySlots(main.id, date);
  check("slot grid lists hourly slots", g1.slots.length >= 8 && g1.slots.some((s) => s.state === "free"), `${g1.slots.length} slots`);
  const start = free(g1)[2];
  const par = await Promise.all(Array.from({ length: 6 }, (_, i) => createRentalBooking(cust(i), [{ date, start, minutes: 120 }], 4, "Dance rehearsal", main.id, "Rehearsal")));
  check("rental: 6 parallel identical requests -> exactly 1 accepted", par.filter((r) => r.ok).length === 1);
  const g2 = await daySlots(main.id, date);
  const idx = g2.slots.findIndex((s) => s.start === start);
  check("booked hours show as Booked (2 slots)", g2.slots[idx].state === "booked" && g2.slots[idx + 1].state === "booked");
  check("the hour right after the booking is still free (no buffers)", g2.slots[idx + 2].state === "free");
  const gp = await daySlots(priv.id, date);
  check("private studio is unaffected by a main studio booking", gp.slots[idx].state === "free");
  const privOk = await createRentalBooking(cust(70), [{ date, start, minutes: 60 }], 2, "Solo practice", priv.id, "Rehearsal");
  check("same hour can be booked in the private studio", privOk.ok);
  const dup = await createRentalBooking(cust(71), [{ date, start, minutes: 60 }], 2, "Overlap", main.id, "Other");
  check("same hour in the main studio is refused", !dup.ok);
  check("capacity per room enforced", !(await createRentalBooking(cust(72), [{ date, start: free(g2)[0], minutes: 60 }], 99, "Too many", priv.id, "Other")).ok);

  // 3. Pricing: room rate, no stacking, floor, promo
  const first = par.find((r) => r.ok) as any;
  check("price: 2h x $25 main studio rate computed on server", first?.subtotalCents === 5000, `subtotal=${first?.subtotalCents}`);
  check("price: private studio $15/h", privOk.ok && (privOk as any).subtotalCents === 1500);

  const offers: OfferRow[] = [
    { id: "a", slug: "a", title: "Regular", description: "", kind: "percent_off", params: { percent: 50, minSessions: 6 }, active: true, limit_count: null, starts_on: null, ends_on: null, show_on_home: false, sort_order: 0 },
    { id: "b", slug: "b", title: "Bundle", description: "", kind: "package", params: { sessions: 6, hoursEach: 1, totalCents: 15000 }, active: true, limit_count: null, starts_on: null, ends_on: null, show_on_home: false, sort_order: 1 },
  ];
  const mk = (n: number) => Array.from({ length: n }, (_, i) => ({ start: new Date(Date.UTC(2030, 0, 1 + i, 15)), end: new Date(Date.UTC(2030, 0, 1 + i, 16)) }));
  const s = structuredClone(DEFAULT_SETTINGS);
  s.booking.regularRateCents = 4000;
  check("discount: 5 sessions is not 'more than five' -> regular rate", priceRental({ slots: mk(5), settings: s, offers, usage: {} })?.subtotalCents === 20000);
  check("discount: never stack, bundle wins at 150", priceRental({ slots: mk(6), settings: s, offers, usage: {} })?.subtotalCents === 15000);
  s.booking.regularRateCents = 3000;
  check("discount: floored to the minimum rate", priceRental({ slots: mk(6), settings: s, offers: [offers[0]], usage: {} })?.subtotalCents === 15000);
  const lim: OfferRow = { ...offers[0], id: "c", kind: "flat_rate", params: { rateCents: 2500 }, limit_count: 100 };
  s.booking.regularRateCents = 5000;
  const atLimit = priceRental({ slots: mk(1), settings: s, offers: [lim], usage: { c: 100 } });
  check("promo: limit reached -> regular rate", atLimit?.subtotalCents === 5000 && atLimit.offerId === null);
  check("promo: 100th booking still gets the offer", priceRental({ slots: mk(1), settings: s, offers: [lim], usage: { c: 99 } })?.offerId === "c");

  // 4. Status, reschedule, release
  const id = first.id as string;
  check("status: pending -> confirmed", (await setBookingStatus(id, "confirmed")).ok);
  check("status: confirmed cannot be declined", !(await setBookingStatus(id, "declined")).ok);
  const other = await createRentalBooking(cust(50), [{ date, start: free(g2)[free(g2).length - 1], minutes: 60 }], 2, "Workshop", main.id, "Workshops");
  check("rental: another free hour accepted", other.ok);
  if (other.ok) check("reschedule: onto an occupied time rejected", !(await rescheduleRental(other.id, [{ date, start, minutes: 60 }])).ok);
  await setBookingStatus(id, "cancelled");
  check("cancel: the hours become free again", free(await daySlots(main.id, date)).includes(start));

  // 5. Quote path
  const q = await quoteRental([{ date, start, minutes: 180 }], main.id);
  check("quote: 3h at $25 = $75", q.ok && (q as any).subtotalCents === 7500);

  console.log(failed ? `\n${failed} FAILED` : "\nAll engine checks passed");
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
