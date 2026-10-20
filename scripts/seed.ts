import { col, ensureIndexes, insert, nextSort } from "../src/lib/db";
import { DEFAULT_SETTINGS } from "../src/lib/settings";
import { slugify } from "../src/lib/format";
import { addDays, dateStrIn, zonedToUtc } from "../src/lib/time";

const demo = process.argv.includes("--demo");

const SERVICES: [string, string, string, string, "class" | "enquiry" | "rental", "published" | "draft"][] = [
  ["Dance Classes", "move", "Move with music and let confidence follow.", "Dance sessions for people who want to move, express themselves and have fun. Styles, levels and schedules are published as they are confirmed.", "class", "published"],
  ["Yoga", "move", "Slow down, stretch and breathe.", "Yoga for building strength, flexibility and calm in a welcoming room.", "class", "published"],
  ["Zumba", "move", "Dance-fitness that feels like a party.", "Upbeat, music-driven fitness classes that keep the energy high.", "class", "published"],
  ["Fitness", "move", "Get stronger in good company.", "Fitness sessions to build strength, stamina and routine.", "class", "published"],
  ["Painting", "create", "Pick up a brush and make something yours.", "Guided painting sessions for people who want to create, relax and try something new.", "class", "published"],
  ["Costume Making", "create", "Design, cut and stitch.", "Hands-on costume-making workshops for performances, dress-up and imagination.", "class", "published"],
  ["Creative Workshops", "create", "Make something with your hands.", "Themed creative workshops led by local instructors and makers.", "class", "published"],
  ["Chess", "learn", "Think a few moves ahead.", "Chess sessions that build focus, patience and strategy.", "class", "published"],
  ["Board Games", "learn", "Play together.", "Relaxed board game sessions for friends, families and newcomers.", "class", "published"],
  ["Tutoring", "learn", "Learning support in a calm space.", "Tutoring and academic support. Subjects and availability are shared as they are confirmed.", "enquiry", "published"],
  ["Educational Workshops", "learn", "Curious minds welcome.", "Educational workshops for learners of different ages.", "class", "published"],
  ["Small Birthdays", "connect", "An intimate celebration in your own space.", "Host a small birthday in the studio. Contact us to discuss your plans and date.", "enquiry", "published"],
  ["Community Gatherings & Baithaks", "connect", "Come together and talk.", "A welcoming room for community gatherings, baithaks and conversation.", "enquiry", "published"],
  ["Lunch-and-Learn Events", "connect", "Learn something over lunch.", "Short talks and shared learning for small groups.", "enquiry", "published"],
  ["Studio Rental", "rental", "A flexible room, by the hour.", "Hire the studio, approximately 600 sq ft, for your own class, workshop or small gathering. Rental covers the space only.", "rental", "published"],
  ["Mom-and-Baby Sessions", "move", "Proposed program.", "Draft: awaiting owner confirmation of format and availability.", "enquiry", "draft"],
  ["Seniors' Programs", "move", "Proposed program.", "Draft: awaiting owner confirmation of format and availability.", "enquiry", "draft"],
  ["Child Supervision During Classes", "learn", "Proposed program.", "Draft: awaiting owner confirmation of format, ratios and availability.", "enquiry", "draft"],
  ["Wine-and-Paint Evenings", "create", "Proposed program.", "Draft: awaiting owner confirmation of format and licensing.", "enquiry", "draft"],
  ["No-Flame, No-Smoke Food Workshops", "create", "Proposed program.", "Draft: awaiting owner confirmation of format and availability.", "enquiry", "draft"],
];

const OFFERS = [
  ["intro-rental-rate", "Launch rental rate", "Studio rental at an introductory hourly rate for our first rental bookings.", "flat_rate", { rateCents: 2500 }, 100, true],
  ["multi-session-discount", "Book six or more sessions", "A discount on the regular rental rate when you book more than five sessions together.", "percent_off", { percent: 50, minSessions: 6 }, null, false],
  ["off-peak-rental", "Off-peak rental", "A reduced rate for quieter times. Define the days and times before activating.", "flat_rate", { rateCents: 2500, window: { days: [], from: "", to: "" } }, null, false],
  ["six-session-bundle", "Six-session bundle", "Six one-hour studio rental sessions for a fixed price. Space hire only.", "package", { sessions: 6, hoursEach: 1, totalCents: 15000 }, null, false],
  ["creative-gathering", "Two-hour creative gathering", "A two-hour studio rental for a small creative gathering. Space hire only.", "package", { sessions: 1, hoursEach: 2, totalCents: 5000 }, null, false],
] as const;

const FAQS: [string, string, boolean][] = [
  ["How do I book?", "Choose a scheduled class or a studio rental on the Booking page and send your request. Your request stays pending until our team confirms it.", true],
  ["Is my booking confirmed straight away?", "No. Every online booking is a request until the studio confirms it. Your reference number and current status are shown on screen after you submit.", true],
  ["Can I rent the studio?", "Yes. The studio is approximately 600 sq ft and can be hired by the hour for suitable classes, workshops and small gatherings. Rental covers the space only. Instructors, materials, catering and childcare are not included.", true],
  ["Can I book on behalf of my child?", "Yes. Bookings for children are made by a parent or guardian, using the adult's name and contact details.", false],
  ["Do you take payments on this website?", "This website does not collect online payments. Booking status and payment status are tracked separately by the studio.", false],
  ["How do I ask a question first?", "Use the form on the Contact page, or email or call us. Our details are listed there.", false],
];

async function main() {
  const settings = await col("settings");
  await ensureIndexes((settings as any).db);
  await settings.updateOne({ _id: "site" } as any, { $setOnInsert: { value: DEFAULT_SETTINGS, updated_at: new Date() } }, { upsert: true });

  if ((await (await col("services")).countDocuments()) === 0) {
    let i = 0;
    for (const [title, cat, summary, desc, type, status] of SERVICES)
      await insert("services", {
        slug: slugify(title), title, summary, description: desc, category: cat, image_id: null, image_alt: "", audience: "", age_info: "",
        duration_minutes: null, price_cents: null, price_note: "", instructor: "", capacity: null, booking_type: type, status,
        featured_order: null, sort_order: i++, updated_at: new Date(),
      });
    console.log("Seeded services (proposed programs are drafts).");
  }
  if ((await (await col("offers")).countDocuments()) === 0) {
    let i = 0;
    for (const [slug, title, desc, kind, params, limit, home] of OFFERS)
      await insert("offers", { slug, title, description: desc, kind, params, active: false, limit_count: limit, starts_on: null, ends_on: null, show_on_home: home, sort_order: i++ });
    console.log("Seeded offers (all inactive until the owner activates them).");
  }
  if ((await (await col("faqs")).countDocuments()) === 0) {
    for (const [question, answer, home] of FAQS) await insert("faqs", { question, answer, status: "published", show_on_home: home, sort_order: await nextSort("faqs") });
    console.log("Seeded FAQs.");
  }

  if (demo) {
    console.log("Applying DEMO data. Do not use in production.");
    const cur = (await settings.findOne({ _id: "site" } as any))!.value;
    cur.booking = {
      ...cur.booking, live: true,
      terms: "DEMO TERMS. Replace with your own booking terms before launch.",
      cancellation: "DEMO CANCELLATION TERMS. Replace before launch.",
      tax: { configured: true, enabled: false, ratePct: 0, label: "" },
    };
    await settings.updateOne({ _id: "site" } as any, { $set: { value: cur } });
    await (await col("offers")).updateOne({ slug: "intro-rental-rate" }, { $set: { active: true } });
    const titles = ["Yoga", "Zumba", "Dance Classes", "Painting", "Chess"];
    await (await col("services")).updateMany({ title: { $in: titles } }, { $set: { price_cents: 1800, capacity: 10, duration_minutes: 60, instructor: "Demo Instructor" } });
    const ids = await (await col("services")).find({ title: { $in: titles } }).toArray();
    if ((await (await col("sessions")).countDocuments()) === 0) {
      const tz = cur.booking.timezone;
      const today = dateStrIn(new Date(), tz);
      let k = 0;
      for (let d = 2; d < 16; d++) {
        const sv = ids[k++ % ids.length];
        const start = zonedToUtc(addDays(today, d), d % 2 ? "18:00" : "10:00", tz);
        await insert("sessions", { service_id: sv.id, starts_at: start, ends_at: new Date(start.getTime() + 3600_000), capacity: 6, price_cents: null, instructor: "", status: "published", notes: "" });
      }
    }
  }
  console.log("Seed complete.");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
