import "server-only";
import { cached } from "./cache";
import { col } from "./db";
import { loadOffers, loadUsage } from "./booking";
import { mediaSrc } from "./media";
import type { Category } from "./format";

export type Service = {
  id: string; slug: string; title: string; summary: string; description: string; category: Category;
  image: string | null; imageAlt: string; audience: string; ageInfo: string; durationMinutes: number | null;
  priceCents: number | null; priceNote: string; instructor: string; capacity: number | null;
  bookingType: "class" | "rental" | "enquiry"; featuredOrder: number | null; upcoming: number;
};

const mapService = (r: any, upcoming: number): Service => ({
  id: r.id, slug: r.slug, title: r.title, summary: r.summary, description: r.description, category: r.category,
  image: r.image_url || mediaSrc(r.image_id), imageAlt: r.image_alt, audience: r.audience, ageInfo: r.age_info,
  durationMinutes: r.duration_minutes ?? null, priceCents: r.price_cents ?? null, priceNote: r.price_note, instructor: r.instructor,
  capacity: r.capacity ?? null, bookingType: r.booking_type, featuredOrder: r.featured_order ?? null, upcoming,
});

async function loadServices(): Promise<Service[]> {
  const [rows, up] = await Promise.all([
    (await col("services")).find({ status: "published" }).sort({ sort_order: 1, created_at: 1 }).toArray(),
    (await col("sessions")).aggregate([{ $match: { status: "published", starts_at: { $gt: new Date() } } }, { $group: { _id: "$service_id", n: { $sum: 1 } } }]).toArray(),
  ]);
  const counts = new Map(up.map((x) => [x._id as string, x.n as number]));
  return rows.map((r) => mapService(r, counts.get(r.id) ?? 0));
}

export type PublicSession = {
  id: string; serviceId: string; serviceSlug: string; title: string; category: Category; startsAt: Date; endsAt: Date;
  instructor: string; priceCents: number | null; seatsLeft: number; capacity: number; image: string | null; imageAlt: string; audience: string;
};

async function loadSessions(limit = 60): Promise<PublicSession[]> {
  // One round of parallel queries (Atlas round trips dominate page time).
  const [sessions, services, booked] = await Promise.all([
    (await col("sessions")).find({ status: "published", starts_at: { $gt: new Date() } }).sort({ starts_at: 1 }).limit(limit * 2).toArray(),
    (await col("services")).find({ status: "published", booking_type: "class" }).toArray(),
    (await col("bookings")).aggregate([
      { $match: { session_id: { $ne: null }, status: { $in: ["pending", "confirmed", "completed"] } } },
      { $group: { _id: "$session_id", n: { $sum: "$attendees" } } },
    ]).toArray(),
  ]);
  const byId = new Map(services.map((x) => [x.id as string, x]));
  const taken = new Map(booked.map((x) => [x._id as string, x.n as number]));
  return sessions
    .filter((x) => byId.has(x.service_id))
    .slice(0, limit)
    .map((x) => {
      const sv = byId.get(x.service_id)!;
      return {
        id: x.id, serviceId: x.service_id, serviceSlug: sv.slug, title: sv.title, category: sv.category, startsAt: x.starts_at, endsAt: x.ends_at,
        instructor: x.instructor || sv.instructor, priceCents: x.price_cents ?? sv.price_cents ?? null,
        seatsLeft: Math.max(0, x.capacity - (taken.get(x.id) ?? 0)), capacity: x.capacity,
        image: sv.image_url || mediaSrc(sv.image_id), imageAlt: sv.image_alt, audience: sv.audience,
      };
    });
}

async function loadTestimonials() {
  const rows = await (await col("testimonials")).find({ status: "published" }).sort({ sort_order: 1, created_at: 1 }).toArray();
  return rows.map((r) => ({ id: r.id as string, author_name: r.author_name as string, author_role: r.author_role as string, quote: r.quote as string }));
}

async function loadFaqs(homeOnly = false) {
  const rows = await (await col("faqs")).find({ status: "published", ...(homeOnly ? { show_on_home: true } : {}) }).sort({ sort_order: 1, created_at: 1 }).toArray();
  return rows.map((r) => ({ id: r.id as string, question: r.question as string, answer: r.answer as string }));
}

async function loadTeam() {
  const rows = await (await col("team_members")).find({ status: "published" }).sort({ sort_order: 1, created_at: 1 }).toArray();
  return rows.map((r) => ({
    id: r.id as string, name: r.name as string, role: r.role as string, bio: r.bio as string,
    image: r.image_url || mediaSrc(r.image_id), imageAlt: (r.image_alt || r.name) as string,
  }));
}

async function loadGallery() {
  const rows = await (await col("gallery_images")).find({ status: "published" }).sort({ sort_order: 1, created_at: 1 }).toArray();
  return rows.map((r) => ({ id: r.id as string, src: (r.image_url || mediaSrc(r.image_id))!, alt: r.alt as string, caption: r.caption as string }));
}

async function loadLiveOffers() {
  const { dateStrIn } = await import("./time");
  const { getSettings } = await import("./settings");
  const { offerIsLive } = await import("./pricing");
  const s = await getSettings();
  const [offers, usage] = await Promise.all([loadOffers(), loadUsage()]);
  const today = dateStrIn(new Date(), s.booking.timezone);
  return offers.filter((o) => offerIsLive(o, today, usage)).map((o) => ({ ...o, used: usage[o.id] ?? 0 }));
}

const rehydrate = (rows: PublicSession[]): PublicSession[] => rows.map((r) => ({ ...r, startsAt: new Date(r.startsAt), endsAt: new Date(r.endsAt) }));

// Public content is cached across requests and expired immediately when the admin saves (see updateTag in admin actions).
export const getServices = cached("services", ["content"], loadServices);
export const getTestimonials = cached("testimonials", ["content"], loadTestimonials);
export const getFaqs = cached("faqs", ["content"], loadFaqs);
export const getTeam = cached("team", ["content"], loadTeam);
export const getGallery = cached("gallery", ["content"], loadGallery);
// Seat counts and promo usage change with bookings, so these also expire when a booking is made.
const cachedSessions = cached("sessions", ["content", "bookings"], loadSessions, 180);
export const getUpcomingSessions = async (limit = 60) => rehydrate(await cachedSessions(limit));
export const getLiveOffers = cached("live-offers", ["content", "bookings"], loadLiveOffers, 180);
