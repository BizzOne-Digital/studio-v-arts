// Studio VM phase-2 data: two bookable rooms, placeholder instructors, booking defaults.
// Idempotent: safe to run on a fresh database (called from seed) and on the live one (npm run db:v2).
import { col, insert, nextSort } from "../src/lib/db";

const ROOMS = [
  {
    slug: "main-studio", name: "Main Studio", size_sqft: 600, price_cents: 2500, capacity: 25, min_hours: 1,
    price_note: "Introductory price for the first 3 months from our public launch",
    description: "Our main studio, approximately 600 sq ft, for dance classes, workshops, fitness, rehearsals and birthday events.",
    uses: ["Dance classes", "Workshops", "Fitness", "Rehearsal", "Birthday events"],
  },
  {
    slug: "private-studio", name: "Private Studio", size_sqft: 120 as number | null, price_cents: 1500, capacity: 6, min_hours: 2,
    price_note: "Introductory price for the first 3 months from our public launch",
    description: "A smaller private room for one-to-one lessons, small groups and solo practice.",
    uses: ["Private lessons", "Solo practice", "Small groups"],
  },
];

export async function applyV2(opts: { goLive?: boolean } = {}) {
  // ---- rooms
  const rooms = await col("rooms");
  if ((await rooms.countDocuments()) === 0) {
    let i = 0;
    for (const r of ROOMS)
      await insert("rooms", { ...r, after_price_cents: null, price_until: null, image_url: "", image_id: null, image_alt: "", active: true, sort_order: i++, updated_at: new Date() });
    console.log("Added the Main Studio and Private Studio.");
  }
  // gallery photos for the room cards (first run only, when no image is set)
  const gal = await (await col("gallery_images")).find({ status: "published" }).sort({ sort_order: 1 }).limit(15).toArray();
  const pick = (n: number) => gal[n]?.image_url || (gal[n]?.image_id ? `/api/media/${gal[n].image_id}` : "");
  for (const [slug, n] of [["main-studio", 13], ["private-studio", 12]] as const) {
    const r = await rooms.findOne({ slug });
    if (r && !r.image_url && !r.image_id && pick(n)) await rooms.updateOne({ slug }, { $set: { image_url: pick(n), image_alt: slug === "main-studio" ? "Open studio floor" : "Quiet learning corner" } });
  }

  // ---- booking defaults for the new flow
  const settings = await col("settings");
  const doc = await settings.findOne({ _id: "site" } as any);
  if (doc) {
    const v = doc.value;
    v.booking = { ...v.booking, leadTimeHours: 0, bufferBeforeMin: 0, bufferAfterMin: 0, slotStepMin: 60, minHours: 1, maxHours: 8, rentalMaxAttendees: 25, rentalHours: Array.from({ length: 7 }, () => ({ enabled: true, open: "08:00", close: "22:00" })) };
    v.payment ??= { interacEmail: v.business?.email || "yourstudiovm@gmail.com", instructions: "Send your Interac e-transfer to the email address above and include your booking reference in the message. Your booking stays Pending until the studio confirms your payment.", notifyEmail: "", confirmInstructions: "" };
    v.business = { ...v.business, name: "STUDIO VM Arts, Wellness & Learning Centre Inc.", shortName: "Studio VM", tagline: "Vibe. Move. Repeat." };
    if (opts.goLive) {
    // Terms are interim and factual (they describe the pending-until-paid flow). Replace them with the studio's own wording.
    if (!v.booking.terms) v.booking.terms = "A booking is a request until the studio confirms your Interac e-transfer. Your slot is held as Pending while payment is checked.";
    if (!v.booking.cancellation) v.booking.cancellation = "To change or cancel a booking, please contact the studio.";
    v.booking.tax = { ...v.booking.tax, configured: true };
    v.booking.live = true;
    }
    await settings.updateOne({ _id: "site" } as any, { $set: { value: v } });
    console.log("Booking settings updated (hourly slots, no notice period, no buffers, live bookings on).");
  }
  // every existing booking_slot / booking belongs to the main studio (room_id missing = main)

  // ---- placeholder instructors (editable in Admin, Team)
  const team = await col("team_members");
  if ((await team.countDocuments()) === 0) {
    for (const n of [1, 2])
      await insert("team_members", {
        name: `Instructor ${n}`, role: "Placeholder", bio: "This is a placeholder profile. Edit the name, bio and photo in the admin panel, under Team.",
        image_url: "", image_id: null, image_alt: `Instructor ${n}`, status: "published", sort_order: await nextSort("team_members"),
      });
    console.log("Added placeholder instructors.");
  }
}

if (process.argv[1]?.endsWith("v2.ts")) {
  applyV2({ goLive: true }).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
