import type { Metadata } from "next";
import { BookingFlow } from "@/components/site/BookingFlow";
import { PageHero } from "@/components/site/sections";
import { getUpcomingSessions } from "@/lib/content";
import { col } from "@/lib/db";
import { emailConfigured, getSettings } from "@/lib/settings";
import { dateStrIn } from "@/lib/time";

export const metadata: Metadata = {
  title: "Book a Class or the Studio",
  description: "Request a seat in a Studio V class, or reserve the studio by the hour. Clear pricing, live availability, no payment taken online.",
};

export default async function Booking({ searchParams }: { searchParams: Promise<{ type?: string; session?: string; service?: string }> }) {
  const q = await searchParams;
  const [s, sessions] = await Promise.all([getSettings(), getUpcomingSessions(100)]);
  const b = s.booking;
  const slugRow = q.service ? await (await col("services")).findOne({ slug: q.service, status: "published" }) : null;
  const initialMode = q.type === "rental" ? "rental" : "class";
  const views = sessions.map((x) => ({ id: x.id, title: x.title, startsAt: x.startsAt.toISOString(), endsAt: x.endsAt.toISOString(), instructor: x.instructor, priceCents: x.priceCents, seatsLeft: x.seatsLeft, audience: x.audience, serviceSlug: x.serviceSlug }));
  const taxNote = b.tax.configured ? (b.tax.enabled ? `${b.tax.label || "Tax"} of ${b.tax.ratePct}% is added to the total.` : "No tax is added by this website at booking.") : "";
  return (
    <>
      <PageHero eyebrow="Book Your Vibe" title="Book your vibe." italic={["vibe."]} body="Join a scheduled class or rent the studio privately. Every request is reviewed and confirmed by our team." tone="hero" photo={0} />
      <section className="mx-auto max-w-4xl px-5 pb-32 sm:px-8">
        <BookingFlow
          live={b.live}
          tz={b.timezone}
          terms={b.terms}
          cancellation={b.cancellation}
          taxNote={taxNote}
          today={dateStrIn(new Date(), b.timezone)}
          sessions={views}
          initialMode={initialMode}
          initialSession={views.find((v) => v.id === q.session)?.id}
          serviceSlug={slugRow ? q.service : undefined}
          rules={{ minHours: b.minHours, maxHours: b.maxHours, stepMin: b.slotStepMin, maxSlots: b.maxSlotsPerBooking, maxAttendees: b.rentalMaxAttendees, leadHours: b.leadTimeHours }}
          emailOn={emailConfigured()}
        />
      </section>
    </>
  );
}
