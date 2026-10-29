import type { Metadata } from "next";
import { BookingFlow } from "@/components/site/BookingFlow";
import { PageHero } from "@/components/site/sections";
import { getUpcomingSessions } from "@/lib/content";
import { col } from "@/lib/db";
import { getRooms } from "@/lib/rooms";
import { emailConfigured, getSettings } from "@/lib/settings";
import { dateStrIn } from "@/lib/time";

export const metadata: Metadata = {
  title: "Book the Studio",
  description: "Pick a room, choose a date on the calendar and book your hours at Studio VM. See live availability and pay by Interac e-transfer.",
};

const BOOKING_CATEGORIES = ["Dance classes", "Workshops", "Fitness", "Rehearsal", "Birthday events", "Other"];

export default async function Booking({ searchParams }: { searchParams: Promise<{ type?: string; session?: string; service?: string; room?: string }> }) {
  const q = await searchParams;
  const [s, sessions, rooms, blocked] = await Promise.all([
    getSettings(), getUpcomingSessions(100), getRooms(),
    (async () => (await (await col("blocked_dates")).find({}).toArray()).map((x) => ({ s: x.date_start as string, e: x.date_end as string })))(),
  ]);
  const b = s.booking;
  const slugRow = q.service ? await (await col("services")).findOne({ slug: q.service, status: "published" }) : null;
  const initialMode = q.type === "class" || q.session || q.service ? "class" : "rental";
  const views = sessions.map((x) => ({ id: x.id, title: x.title, startsAt: x.startsAt.toISOString(), endsAt: x.endsAt.toISOString(), instructor: x.instructor, priceCents: x.priceCents, seatsLeft: x.seatsLeft, audience: x.audience, serviceSlug: x.serviceSlug }));
  const taxNote = b.tax.configured ? (b.tax.enabled ? `${b.tax.label || "Tax"} of ${b.tax.ratePct}% is added to the total.` : "Prices shown are all-inclusive.") : "";
  return (
    <>
      <PageHero eyebrow="Book the studio" title="Pick a day. Pick your hours." italic={["hours."]} body="Choose a room, select a date on the calendar and tap the hours you want. Booked hours are shown so you never double-book." tone="hero" photo={0} />
      <section className="mx-auto max-w-4xl px-5 pb-32 sm:px-8">
        <BookingFlow
          live={b.live}
          tz={b.timezone}
          terms={b.terms}
          waiver={b.waiver}
          cancellation={b.cancellation}
          taxNote={taxNote}
          today={dateStrIn(new Date(), b.timezone)}
          sessions={views}
          initialMode={initialMode}
          initialSession={views.find((v) => v.id === q.session)?.id}
          serviceSlug={slugRow ? q.service : undefined}
          rooms={rooms.map((r) => ({ id: r.id, slug: r.slug, name: r.name, sizeSqFt: r.sizeSqFt, minHours: r.minHours, priceCents: r.priceCents, priceNote: r.priceNote, capacity: r.capacity, uses: r.uses, image: r.image, imageAlt: r.imageAlt, description: r.description }))}
          initialRoom={q.room}
          rules={{ minHours: b.minHours, maxHours: b.maxHours, stepMin: b.slotStepMin }}
          openDays={b.rentalHours.map((d) => d.enabled)}
          blocked={blocked}
          categories={BOOKING_CATEGORIES}
          pay={{ interacEmail: s.payment.interacEmail, instructions: s.payment.instructions }}
          emailOn={emailConfigured()}
        />
      </section>
    </>
  );
}
