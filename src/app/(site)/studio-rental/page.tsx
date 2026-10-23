import Link from "next/link";
import type { Metadata } from "next";
import { BookCTA, PageHero, SectionHead, Steps } from "@/components/site/sections";
import { Magnetic, Reveal } from "@/components/site/motion";
import { getServices } from "@/lib/content";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Studio Rental",
  description: "Hire Studio VM by the hour: an approximately 600 sq ft room for your own class, workshop or small gathering.",
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function StudioRental() {
  const [s, services] = await Promise.all([getSettings(), getServices()]);
  const b = s.booking;
  const svc = services.find((x) => x.category === "rental");
  const open = b.rentalHours.map((d, i) => ({ ...d, day: DAYS[i] })).filter((d) => d.enabled);
  return (
    <>
      <PageHero
        eyebrow="Studio rental"
        title="Your room, your rules."
        italic={["rules."]}
        body={`${s.copy.rentalBody}`}
        tone="rental"
        image={svc?.image}
        imageAlt={svc?.imageAlt}
      >
        <Magnetic><Link href="/booking?type=rental" className="btn btn-primary">Check availability</Link></Magnetic>
        <Link href="/pricing" className="btn btn-ghost">See pricing</Link>
      </PageHero>

      <section className="mx-auto max-w-[88rem] px-5 py-20 sm:px-8">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHead eyebrow="The space" title="Flexible by design." italic={["design."]} />
            <Reveal delay={0.2}><p className="mt-6 text-lg text-ink/80">
              Approximately {s.business.sizeSqFt} sq ft, suited to classes, workshops, rehearsals and intimate gatherings. Bring your own group and make it yours.
            </p></Reveal>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:col-span-7">
            <Reveal className="rounded-[2rem] bg-lilac p-8">
              <h3 className="display text-3xl">What rental covers</h3>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-ink/85">
                <li>Use of the studio space for your booked time</li>
                <li>Up to {b.rentalMaxAttendees} people per booking</li>
                <li>Setup and cleanup time of {b.bufferBeforeMin + b.bufferAfterMin} minutes between bookings</li>
              </ul>
            </Reveal>
            <Reveal delay={0.1} className="rounded-[2rem] bg-sand p-8">
              <h3 className="display text-3xl">Not included</h3>
              <p className="mt-4 text-ink/85">Rental is for the space only. Instructors, materials, catering and childcare are not included in the rental price.</p>
            </Reveal>
            <Reveal delay={0.15} className="rounded-[2rem] border border-plum/20 p-8 sm:col-span-2">
              <h3 className="display text-3xl">Booking windows</h3>
              {open.length ? (
                <ul className="mt-4 grid gap-x-8 gap-y-1 sm:grid-cols-2">
                  {open.map((d) => <li key={d.day} className="flex justify-between border-b border-plum/10 py-1.5"><span>{d.day}</span><span className="font-semibold">{d.open} - {d.close}</span></li>)}
                </ul>
              ) : <p className="mt-4 text-ink/70">Rental hours will be published soon.</p>}
              <p className="mt-4 text-sm text-ink/70">
                Sessions run {b.minHours} to {b.maxHours} hours. Please book at least {b.leadTimeHours} hours ahead. Times shown in {b.timezone.replace("_", " ")} time.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-sand py-24">
        <div className="mx-auto max-w-[88rem] px-5 sm:px-8">
          <SectionHead eyebrow="How it works" title="Three simple steps." italic={["simple"]} className="mb-14" />
          <Steps steps={[
            { title: "Choose your time", body: "Pick a date, start time and length. Only genuinely free times are shown." },
            { title: "Send your request", body: "Tell us what you are planning and how many people are coming. You will see the price before you submit." },
            { title: "We confirm", body: "Your request stays pending until our team confirms it. Your reference shows the current status." },
          ]} />
        </div>
      </section>
      <BookCTA title="Reserve the studio." body="See what is free and send your request in a couple of minutes." />
    </>
  );
}
