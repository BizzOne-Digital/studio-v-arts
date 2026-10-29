import Link from "next/link";
import type { Metadata } from "next";
import { BookCTA, EmptyNote, PageHero, SectionHead, Steps } from "@/components/site/sections";
import { Magnetic, Reveal } from "@/components/site/motion";
import { Photo } from "@/components/site/Photo";
import { money } from "@/lib/format";
import { getRooms } from "@/lib/rooms";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Studio Rental",
  description: "Rent the Main Studio or the Private Studio by the hour at Studio VM for dance classes, workshops, fitness, rehearsals and birthday events.",
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function StudioRental() {
  const [s, rooms] = await Promise.all([getSettings(), getRooms()]);
  const b = s.booking;
  const open = b.rentalHours.map((d, i) => ({ ...d, day: DAYS[i] })).filter((d) => d.enabled);
  return (
    <>
      <PageHero
        eyebrow="Studio rental"
        title="Rent a studio by the hour."
        italic={["hour."]}
        body="Two rooms for dance classes, workshops, fitness, rehearsals and birthday events. Check live availability and book the hours you need."
        tone="rental"
        photo={0}
      >
        <Magnetic><Link href="/booking" className="btn btn-primary">Check availability</Link></Magnetic>
      </PageHero>

      <section className="mx-auto max-w-[88rem] px-5 pb-20 sm:px-8">
        {rooms.length === 0 ? <EmptyNote>Our rooms will be listed here soon.</EmptyNote> : (
          <ul className="grid gap-8 lg:grid-cols-2">
            {rooms.map((r, i) => (
              <Reveal as="li" key={r.id} delay={i * 0.1} className="overflow-hidden rounded-[2rem] border border-plum/15 bg-white">
                <div className="aspect-[16/10]"><Photo src={r.image} alt={r.imageAlt || r.name} tone="rental" seed={i} sizes="(min-width:1024px) 45vw, 95vw" /></div>
                <div className="p-7 sm:p-9">
                  <p className="eyebrow">{[r.sizeSqFt ? `${r.sizeSqFt} sq ft` : null, `Up to ${r.capacity} people`, `Minimum ${r.minHours} hour${r.minHours === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}</p>
                  <h2 className="display mt-2 text-3xl sm:text-4xl">{r.name}</h2>
                  <p className="mt-3 text-2xl font-semibold text-plum">{money(r.priceCents)}<span className="text-base font-normal text-ink/60"> / hour</span></p>
                  {r.priceNote ? <p className="mt-1 text-sm text-ink/65">{r.priceNote}</p> : null}
                  {r.description ? <p className="mt-4 text-ink/80">{r.description}</p> : null}
                  {r.uses.length ? <ul className="mt-5 flex flex-wrap gap-2 text-sm">{r.uses.map((u) => <li key={u} className="rounded-full border border-plum/25 px-3 py-1">{u}</li>)}</ul> : null}
                  <Link href={`/booking?room=${r.slug}`} className="btn btn-primary mt-7">Book now</Link>
                </div>
              </Reveal>
            ))}
          </ul>
        )}
        <Reveal className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-[2rem] bg-plum p-8 text-ivory on-dark">
          <div>
            <h3 className="display text-2xl sm:text-3xl">Need a longer or recurring rental?</h3>
            <p className="mt-1 text-ivory/80">Book several hours in one go, or contact us about weekly and long-term rentals.</p>
          </div>
          <Link href="/contact?topic=Longer%20or%20recurring%20studio%20rental" className="btn btn-light">Contact us</Link>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Reveal className="rounded-[2rem] bg-sand p-8">
            <h3 className="display text-3xl">Opening hours for bookings</h3>
            {open.length ? (
              <ul className="mt-4 grid gap-x-8 gap-y-1 sm:grid-cols-2">
                {open.map((d) => <li key={d.day} className="flex justify-between border-b border-plum/10 py-1.5"><span>{d.day}</span><span className="font-semibold">{d.open} - {d.close}</span></li>)}
              </ul>
            ) : <p className="mt-4 text-ink/70">Booking hours will be published soon.</p>}
            <p className="mt-4 text-sm text-ink/70">Times shown in {b.timezone.replace("_", " ")} time. Rentals cover the space only.</p>
          </Reveal>
          <Reveal delay={0.1} className="rounded-[2rem] bg-lilac p-8">
            <h3 className="display text-3xl">Good for</h3>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {["Dance classes", "Workshops", "Fitness", "Rehearsal", "Private practice"].map((x) => <li key={x} className="flex items-center gap-2"><span aria-hidden className="h-2 w-2 rounded-full bg-champagne" />{x}</li>)}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="bg-sand py-24">
        <div className="mx-auto max-w-[88rem] px-5 sm:px-8">
          <SectionHead eyebrow="How it works" title="Three simple steps." italic={["simple"]} className="mb-14" />
          <Steps steps={[
            { title: "Pick your time", body: "Choose a room and a date, then tap the hours you want. Booked hours are marked so you can see exactly what is free." },
            { title: "Send your request", body: "Add your details and the reason for your booking. Your slot is held as Pending straight away." },
            { title: "Pay by Interac e-transfer", body: "Send the e-transfer to the email shown at checkout. Once the studio confirms your payment you receive a confirmation email." },
          ]} />
        </div>
      </section>
      <BookCTA title="Reserve your hours." body="See what is free and send your request in a couple of minutes." />
    </>
  );
}
