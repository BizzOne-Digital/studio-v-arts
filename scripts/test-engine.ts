// Booking-engine checks. Run against a scratch database:  npm run test:engine
// Uses the demo seed (live bookings, 25 CAD intro offer, six demo class sessions). WARNING: deletes all bookings.
import { col } from "../src/lib/db";
import { availabilityFor, createClassBooking, createRentalBooking, quoteRental, rescheduleRental, setBookingStatus } from "../src/lib/booking";
import { priceRental, type OfferRow } from "../src/lib/pricing";
import { DEFAULT_SETTINGS } from "../src/lib/settings";
import { addDays, dateStrIn, weekdayOf } from "../src/lib/time";

let failed = 0;
const check = (name: string, ok: boolean, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  " + extra : ""}`);
  if (!ok) failed++;
};
const cust = (i: number) => ({ name: `Test ${i}`, email: `t${i}@example.com`, phone: "5145550100", notes: "" });

async function nextOpenDate(offset: number) {
  const tz = DEFAULT_SETTINGS.booking.timezone;
  let d = addDays(dateStrIn(new Date(), tz), offset);
  while (!DEFAULT_SETTINGS.booking.rentalHours[weekdayOf(d)].enabled) d = addDays(d, 1);
  return d;
}

async function main() {
  await (await col("bookings")).deleteMany({}); await (await col("booking_slots")).deleteMany({});

  // 1. Class capacity under concurrent submissions
  const ses = (await (await col("sessions")).find({ status: "published" }).sort({ starts_at: 1 }).limit(1).toArray())[0];
  const results = await Promise.all(Array.from({ length: 12 }, (_, i) => createClassBooking(cust(i), ses.id, 1)));
  const okN = results.filter((r) => r.ok).length;
  check("class: 12 parallel single-seat requests never exceed capacity", okN === ses.capacity, `accepted=${okN} capacity=${ses.capacity}`);
  const over = await createClassBooking(cust(99), ses.id, 1);
  check("class: full class rejects", !over.ok);

  // 2. Rentals share one room: parallel identical requests, only one wins
  const date = await nextOpenDate(5);
  const av = await availabilityFor(date, 60);
  check("availability returns start times", av.starts.length > 0, `${av.starts.length} starts`);
  const start = av.starts[2];
  const par = await Promise.all(
    Array.from({ length: 6 }, (_, i) => createRentalBooking(cust(i), [{ date, start, minutes: 60 }], 4, "Dance rehearsal")),
  );
  check("rental: 6 parallel identical requests -> exactly 1 accepted", par.filter((r) => r.ok).length === 1);
  const av2 = await availabilityFor(date, 60);
  check("rental: taken time disappears from availability", !av2.starts.includes(start));
  const [h, m] = start.split(":").map(Number);
  const adjacent = `${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  check("rental: back-to-back start inside buffer is blocked", !av2.starts.includes(adjacent));

  // 3. Price: intro 25/h, floor, no stacking
  const first = par.find((r) => r.ok) as any;
  check("price: intro rate 25 CAD/hour computed on server", first?.subtotalCents === 2500, `subtotal=${first?.subtotalCents}`);

  const offers: OfferRow[] = [
    { id: "a", slug: "a", title: "Regular", description: "", kind: "percent_off", params: { percent: 50, minSessions: 6 }, active: true, limit_count: null, starts_on: null, ends_on: null, show_on_home: false, sort_order: 0 },
    { id: "b", slug: "b", title: "Bundle", description: "", kind: "package", params: { sessions: 6, hoursEach: 1, totalCents: 15000 }, active: true, limit_count: null, starts_on: null, ends_on: null, show_on_home: false, sort_order: 1 },
  ];
  const mk = (n: number) => Array.from({ length: n }, (_, i) => ({ start: new Date(Date.UTC(2030, 0, 1 + i, 15)), end: new Date(Date.UTC(2030, 0, 1 + i, 16)) }));
  const s = structuredClone(DEFAULT_SETTINGS);
  s.booking.regularRateCents = 4000;
  const five = priceRental({ slots: mk(5), settings: s, offers, usage: {} });
  check("discount: 5 sessions is not 'more than five' -> regular rate", five?.subtotalCents === 5 * 4000 && five.offerId === null);
  const six = priceRental({ slots: mk(6), settings: s, offers, usage: {} });
  check("discount: 6 sessions at 40/h with 50% off and 150 bundle -> never stack, floor 25/h", six?.subtotalCents === 15000, `got ${six?.subtotalCents}`);
  s.booking.regularRateCents = 3000;
  const floor = priceRental({ slots: mk(6), settings: s, offers: [offers[0]], usage: {} });
  check("discount: 50% of 30 would be 15 -> floored to 25/h", floor?.subtotalCents === 6 * 2500, `got ${floor?.subtotalCents}`);
  const lim: OfferRow = { ...offers[0], id: "c", kind: "flat_rate", params: { rateCents: 2500 }, limit_count: 100 };
  s.booking.regularRateCents = 5000;
  const atLimit = priceRental({ slots: mk(1), settings: s, offers: [lim], usage: { c: 100 } });
  check("promo: limit of 100 reached -> falls back to regular", atLimit?.subtotalCents === 5000 && atLimit.offerId === null);
  const below = priceRental({ slots: mk(1), settings: s, offers: [lim], usage: { c: 99 } });
  check("promo: 100th booking still gets the offer", below?.offerId === "c");
  const noRate = priceRental({ slots: mk(1), settings: { ...s, booking: { ...s.booking, regularRateCents: null } }, offers: [], usage: {} });
  check("pricing: no rate configured -> unpriced (not invented)", noRate === null);

  // 4. Declining releases the slot; reschedule revalidates
  const id = first.id as string;
  const cf = await setBookingStatus(id, "confirmed");
  check("status: pending -> confirmed", cf.ok);
  const bad = await setBookingStatus(id, "declined");
  check("status: confirmed cannot be declined", !bad.ok);
  const other = await createRentalBooking(cust(50), [{ date, start: av.starts[av.starts.length - 1], minutes: 60 }], 2, "Workshop");
  check("rental: second booking at a free time accepted", other.ok);
  if (other.ok) {
    const clash = await rescheduleRental(other.id, [{ date, start, minutes: 60 }]);
    check("reschedule: onto an occupied time rejected", !clash.ok);
  }
  await setBookingStatus(id, "cancelled");
  const av3 = await availabilityFor(date, 60);
  check("cancel: slot becomes available again", av3.starts.includes(start));

  // 5. Quote path
  const q = await quoteRental([{ date, start, minutes: 120 }]);
  check("quote: 2h at 25/h = 50 CAD", q.ok && (q as any).subtotalCents === 5000);

  console.log(failed ? `\n${failed} FAILED` : "\nAll engine checks passed");
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
