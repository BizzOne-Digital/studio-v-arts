import type { Settings } from "./settings";
import { dateStrIn, minutesOf, timeStrIn, weekdayOf } from "./time";

export type OfferRow = {
  id: string; slug: string; title: string; description: string;
  kind: "flat_rate" | "percent_off" | "package";
  params: any; active: boolean; limit_count: number | null;
  starts_on: string | null; ends_on: string | null; show_on_home: boolean; sort_order: number;
};

export type PriceSlot = { start: Date; end: Date };
export type Quote = {
  hours: number;
  subtotalCents: number;
  offerId: string | null;
  offerTitle: string | null;
  regularTotalCents: number | null;
  perHourCents: number;
  label: string;
};

const hoursOf = (s: PriceSlot) => (s.end.getTime() - s.start.getTime()) / 3_600_000;

export function offerIsLive(o: OfferRow, todayStr: string, usage: Record<string, number>) {
  if (!o.active) return false;
  if (o.starts_on && todayStr < o.starts_on) return false;
  if (o.ends_on && todayStr > o.ends_on) return false;
  if (o.limit_count != null && (usage[o.id] ?? 0) >= o.limit_count) return false;
  return true;
}

function inWindow(slot: PriceSlot, w: any, tz: string) {
  if (!w) return true;
  const days: number[] = Array.isArray(w.days) ? w.days : [];
  if (days.length && !days.includes(weekdayOf(dateStrIn(slot.start, tz)))) return false;
  if (w.from && w.to) {
    if (minutesOf(timeStrIn(slot.start, tz)) < minutesOf(w.from)) return false;
    const endLocal = minutesOf(timeStrIn(slot.end, tz)) || 24 * 60;
    if (endLocal > minutesOf(w.to)) return false;
  }
  return true;
}

/**
 * Server-side rental pricing. Discounts never stack: the single cheapest eligible option wins,
 * and no discounted result can fall below the minimum hourly rate.
 */
export function priceRental(args: {
  slots: PriceSlot[]; settings: Settings; offers: OfferRow[]; usage: Record<string, number>;
}): Quote | null {
  const { slots, settings, offers, usage } = args;
  const tz = settings.booking.timezone;
  const min = settings.booking.minRateCents;
  const hours = slots.reduce((a, s) => a + hoursOf(s), 0);
  if (!slots.length || hours <= 0) return null;
  const floor = Math.round(min * hours);
  const today = dateStrIn(new Date(), tz);
  const regular = settings.booking.regularRateCents;
  const regularTotal = regular != null ? Math.round(regular * hours) : null;

  type Cand = { total: number; offer: OfferRow | null; label: string };
  const cands: Cand[] = [];
  if (regularTotal != null) cands.push({ total: Math.max(regularTotal, floor), offer: null, label: "Regular rate" });

  for (const o of offers) {
    if (!offerIsLive(o, today, usage)) continue;
    const p = o.params ?? {};
    if (o.kind === "flat_rate" && Number.isInteger(p.rateCents) && slots.every((s) => inWindow(s, p.window, tz))) {
      cands.push({ total: Math.max(Math.round(p.rateCents * hours), floor), offer: o, label: o.title });
    } else if (o.kind === "percent_off" && regular != null && slots.length >= (p.minSessions ?? 1) && p.percent > 0 && p.percent < 100) {
      cands.push({ total: Math.max(Math.round(regular * hours * (1 - p.percent / 100)), floor), offer: o, label: o.title });
    } else if (
      o.kind === "package" && slots.length === p.sessions && slots.every((s) => Math.abs(hoursOf(s) - p.hoursEach) < 1e-6) &&
      Number.isInteger(p.totalCents) && p.totalCents >= floor
    ) {
      cands.push({ total: p.totalCents, offer: o, label: o.title });
    }
  }
  if (!cands.length) return null;
  cands.sort((a, b) => a.total - b.total);
  const best = cands[0];
  return {
    hours,
    subtotalCents: best.total,
    offerId: best.offer?.id ?? null,
    offerTitle: best.offer?.title ?? null,
    regularTotalCents: regularTotal,
    perHourCents: Math.round(best.total / hours),
    label: best.label,
  };
}

export function addTax(subtotal: number, s: Settings) {
  const t = s.booking.tax;
  const tax = t.enabled ? Math.round((subtotal * t.ratePct) / 100) : 0;
  return { taxCents: tax, totalCents: subtotal + tax };
}

/** Plain-language terms for an offer, shown publicly beside it. */
export function offerTerms(o: OfferRow, minRateCents: number): string[] {
  const p = o.params ?? {};
  const t: string[] = [];
  if (o.kind === "flat_rate") {
    t.push(`Studio rental at ${(p.rateCents / 100).toFixed(0)} CAD per hour, space hire only.`);
    if (p.window?.days?.length || p.window?.from) t.push("Applies only to the days and times listed in the offer.");
  }
  if (o.kind === "percent_off") t.push(`${p.percent}% off the regular rental rate when you book ${p.minSessions} or more sessions together.`);
  if (o.kind === "package") t.push(`${p.sessions} session${p.sessions > 1 ? "s" : ""} of ${p.hoursEach} hour${p.hoursEach > 1 ? "s" : ""} for a total of ${(p.totalCents / 100).toFixed(0)} CAD, space hire only.`);
  if (o.limit_count) t.push(`Limited to the first ${o.limit_count} eligible rental bookings. One booking counts once, however many hours it includes.`);
  if (o.starts_on || o.ends_on) t.push(`Valid ${o.starts_on ? "from " + o.starts_on : ""}${o.ends_on ? " until " + o.ends_on : ""}.`);
  t.push("Offers cannot be combined. The lowest eligible price applies.");
  t.push(`Rental prices never fall below ${(minRateCents / 100).toFixed(0)} CAD per hour.`);
  t.push("Rental covers the space only. Instructors, materials, catering and childcare are not included.");
  return t;
}

/** Validate offer params on save; returns an error string or null. */
export function validateOffer(kind: string, p: any, minRateCents: number): string | null {
  if (kind === "flat_rate") {
    if (!Number.isInteger(p.rateCents) || p.rateCents < minRateCents) return `Rate must be at least ${minRateCents / 100} CAD per hour.`;
  } else if (kind === "percent_off") {
    if (!(p.percent > 0 && p.percent < 100)) return "Percent must be between 1 and 99.";
    if (!Number.isInteger(p.minSessions) || p.minSessions < 2) return "Minimum sessions must be 2 or more. For 'more than five', use 6.";
  } else if (kind === "package") {
    if (!Number.isInteger(p.sessions) || p.sessions < 1) return "Sessions must be 1 or more.";
    if (!(p.hoursEach > 0)) return "Hours per session must be greater than 0.";
    if (!Number.isInteger(p.totalCents) || p.totalCents < Math.round(minRateCents * p.sessions * p.hoursEach))
      return `Package total cannot be less than the minimum rate (${minRateCents / 100} CAD x total hours).`;
  } else return "Unknown offer type.";
  return null;
}
