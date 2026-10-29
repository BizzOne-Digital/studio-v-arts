// Studio VM phase-2b data from the client's written answers: room limits, hours, waiver, tagline and FAQs.
// Idempotent. Seed calls it for new databases; run `npm run db:v3` on an existing one.
import { col, insert, nextSort } from "../src/lib/db";
import { DEFAULT_WAIVER } from "../src/lib/waiver";

const FAQS: { category: string; q: string; a: string; home?: boolean }[] = [
  { category: "Booking & Payment", home: true, q: "How do I book?", a: "Choose a room on the Book the Studio page, pick a date on the calendar and tap the hours you want. Add your details, accept the booking agreement and send your request. Then send an Interac e-transfer and include your booking reference." },
  { category: "Booking & Payment", home: true, q: "Is my booking confirmed straight away?", a: "No. Your slot is held as Pending until the studio verifies your Interac e-transfer. Once it is approved your booking changes to Booking Confirmed and you receive a confirmation email." },
  { category: "Our Spaces & Rooms", home: true, q: "What spaces are available for rent?", a: "We feature two beautifully updated rooms with newly done walls, premium hardwood flooring, and elegant fluted panel mirrors:\nMain Studio: Approximately 600 sq. ft., ideal for larger classes, group rehearsals, and workshops.\nPrivate Studio: Approximately 120 sq. ft., perfect for solo practice, private lessons, content creation, or intimate sessions." },
  { category: "Our Spaces & Rooms", q: "Can I rent the entire facility?", a: "Yes! You can reserve the Main Studio and Private Studio individually as separate rooms, or together as a complete full-studio rental for total privacy. To book both rooms for the same hours, contact us and we will arrange it." },
  { category: "Studio Uses & Classes", q: "What can the studio be used for?", a: "The space is optimized for private practice, independent rehearsals, and instructor-led sessions. In the future, the studio will also host its own house-run paid classes." },
  { category: "Studio Uses & Classes", q: "Can I throw a party or social gathering here?", a: "No. We strictly prohibit parties, rowdy groups, or social gatherings at any time. The space is dedicated exclusively to practice, fitness, dance, and instructional workshops." },
  { category: "Substances, Conduct & Security", q: "What is your policy on smoking and alcohol?", a: "We enforce a strict, zero-tolerance policy against smoking, vaping, alcohol, and drugs of any kind. Anyone violating this rule will be asked to leave immediately and will forfeit their booking fee." },
  { category: "Substances, Conduct & Security", q: "How do you handle disruptive behavior or fighting?", a: "Any form of fighting, verbal abuse, or aggressive behavior will result in immediate removal, cancellation of your account, and potential legal action. We maintain a peaceful, professional environment for all creators." },
  { category: "Substances, Conduct & Security", q: "Is my safety and privacy protected?", a: "Yes. For your safety, security, and to ensure rules are followed, the studio is monitored by 24/7 video surveillance in the main rooms." },
  { category: "Cleaning & Damages", q: "What are my cleanup responsibilities?", a: "You must clean up after yourself. This includes placing all trash in bins, wiping down touched surfaces, and returning any equipment to its original spot before your booking ends." },
  { category: "Cleaning & Damages", q: "What happens if something breaks during my session?", a: "The primary account holder who booked the slot is financially liable for any damages to the property, hardwood flooring, fluted mirrors, or electronics that occur during their time." },
];

// the generic questions created by the first seed; they are replaced by the set above
const OLD = new Set([
  "How do I book?", "Is my booking confirmed straight away?", "Can I rent the studio?", "Can I book on behalf of my child?",
  "Do you take payments on this website?", "How do I ask a question first?",
]);

export async function applyV3() {
  // ---- rooms
  const rooms = await col("rooms");
  await rooms.updateOne({ slug: "main-studio" }, { $set: { capacity: 25, min_hours: 1, size_sqft: 600, price_cents: 2500, price_note: "Introductory price for the first 3 months from our public launch" } });
  await rooms.updateOne({ slug: "private-studio" }, { $set: { capacity: 6, min_hours: 2, size_sqft: 120, price_cents: 1500, price_note: "Introductory price for the first 3 months from our public launch" } });

  // ---- settings
  const settings = await col("settings");
  const doc = await settings.findOne({ _id: "site" } as any);
  if (doc) {
    const v = doc.value;
    v.business = { ...v.business, name: "STUDIO VM Arts, Wellness & Learning Centre Inc.", shortName: "Studio VM", tagline: "Vibe. Move. Repeat." };
    v.booking = { ...v.booking, rentalMaxAttendees: 25, rentalHours: Array.from({ length: 7 }, () => ({ enabled: true, open: "08:00", close: "22:00" })) };
    if (!v.booking.waiver) v.booking.waiver = DEFAULT_WAIVER;
    v.copy = { ...v.copy };
    v.copy.aboutStory ||= "Studio VM brings creativity, wellness, learning and celebration together under one roof. It is a welcoming space to explore your interests, build confidence, meet people and make memories.\n\nDancers and chess players, painters and parents, children, seniors and curious beginners all share the same floor. Some come for a class. Some hire the space for their own. Many come for both.";
    v.copy.aboutVision ||= "To create a welcoming and inspiring community where every individual feels empowered to explore, grow, connect, and celebrate life.";
    await settings.updateOne({ _id: "site" } as any, { $set: { value: v } });
  }

  // ---- FAQs: replace the untouched first-seed set, then add any question that is missing
  const faqs = await col("faqs");
  const existing = await faqs.find({}).toArray();
  if (existing.length && existing.every((f) => OLD.has(f.question))) await faqs.deleteMany({});
  for (const f of FAQS) {
    if (await faqs.findOne({ question: f.q })) { await faqs.updateOne({ question: f.q }, { $set: { category: f.category } }); continue; }
    await insert("faqs", { question: f.q, answer: f.a, category: f.category, status: "published", show_on_home: !!f.home, sort_order: await nextSort("faqs") });
  }
  console.log("Phase 2b data applied: room limits, 8 am to 10 pm hours, waiver, tagline, FAQs.");
}

if (process.argv[1]?.endsWith("v3.ts")) {
  applyV3().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
