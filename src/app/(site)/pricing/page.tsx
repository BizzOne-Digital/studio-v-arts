import Link from "next/link";
import type { Metadata } from "next";
import { BookCTA, EmptyNote, PageHero, SectionHead } from "@/components/site/sections";
import { Reveal } from "@/components/site/motion";
import { getLiveOffers, getServices } from "@/lib/content";
import { money } from "@/lib/format";
import { offerTerms } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Pricing & Offers",
  description: "Class prices, studio rental rates and current offers at Studio V, in Canadian dollars, with clear terms.",
};

export default async function Pricing() {
  const [s, services, offers] = await Promise.all([getSettings(), getServices(), getLiveOffers()]);
  const b = s.booking;
  const priced = services.filter((x) => x.bookingType === "class" && x.priceCents != null);
  const showRegular = b.showRegularRate && b.regularRateCents != null;
  const rentalPrices = showRegular || offers.length > 0;
  return (
    <>
      <PageHero eyebrow="Pricing & offers" title="Clear prices. No surprises." italic={["surprises."]} body="All prices are in Canadian dollars. Classes and studio rental are priced separately." tone="connect" photo={6} />

      <section className="mx-auto max-w-[88rem] px-5 pb-20 sm:px-8">
        <SectionHead eyebrow="Studio rental" title="Hire the room by the hour." italic={["hour."]} />
        {rentalPrices ? (
          <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {showRegular ? (
              <Reveal as="li" className="rounded-[2rem] border border-plum/20 p-8">
                <p className="eyebrow">Regular rate</p>
                <p className="display mt-4 text-6xl">{money(b.regularRateCents)}<span className="text-xl text-ink/60"> / hour</span></p>
                <p className="mt-4 text-sm text-ink/75">Space hire only. Instructors, materials, catering and childcare are not included.</p>
              </Reveal>
            ) : null}
            {offers.map((o, i) => (
              <Reveal as="li" key={o.id} delay={(i + 1) * 0.08} className="rounded-[2rem] bg-lilac p-8">
                <p className="eyebrow">Offer</p>
                <h3 className="display mt-2 text-3xl">{o.title}</h3>
                <p className="mt-2 text-ink/80">{o.description}</p>
                <p className="display mt-4 text-5xl text-plum">
                  {o.kind === "flat_rate" ? <>{money(o.params.rateCents)}<span className="text-xl text-ink/60"> / hour</span></> : null}
                  {o.kind === "percent_off" ? <>{o.params.percent}% off</> : null}
                  {o.kind === "package" ? <>{money(o.params.totalCents)}</> : null}
                </p>
                <ul className="mt-5 list-disc space-y-1.5 pl-5 text-sm text-ink/80">
                  {offerTerms(o, b.minRateCents).map((t) => <li key={t}>{t}</li>)}
                </ul>
              </Reveal>
            ))}
          </ul>
        ) : (
          <div className="mt-10"><EmptyNote>Rental pricing is being finalised. <Link href="/contact?topic=Studio%20rental" className="ulink font-semibold text-plum">Contact us for a quote</Link>.</EmptyNote></div>
        )}
        <div className="mt-8"><Link href="/booking?type=rental" className="btn btn-primary">Check rental availability</Link></div>
      </section>

      <section className="bg-sand py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <SectionHead eyebrow="Classes" title="Class prices." italic={["prices."]} />
          {priced.length ? (
            <ul className="mt-10 divide-y divide-plum/15 border-y border-plum/15">
              {priced.map((x) => (
                <li key={x.id} className="flex items-baseline justify-between gap-6 py-5">
                  <span><span className="display text-2xl">{x.title}</span>{x.durationMinutes ? <span className="ml-3 text-sm text-ink/60">{x.durationMinutes} min</span> : null}</span>
                  <span className="font-semibold text-plum">{money(x.priceCents)} per person</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-10"><EmptyNote>Class prices are shown here as each class is confirmed. Prices also appear on every scheduled session.</EmptyNote></div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-24 sm:px-8">
        <SectionHead eyebrow="Terms" title="The fine print, plainly." italic={["plainly."]} />
        <div className="mt-10 space-y-10">
          <div><h3 className="display text-3xl">Booking terms</h3><p className="mt-3 whitespace-pre-line text-ink/80">{b.terms || "Booking terms will be published here before online booking opens."}</p></div>
          <div><h3 className="display text-3xl">Cancellation</h3><p className="mt-3 whitespace-pre-line text-ink/80">{b.cancellation || "Cancellation terms will be published here before online booking opens."}</p></div>
          {b.tax.configured ? (
            <div><h3 className="display text-3xl">Tax</h3><p className="mt-3 text-ink/80">{b.tax.enabled ? `${b.tax.label || "Tax"} of ${b.tax.ratePct}% is added to booking totals.` : "No tax is added by this website at booking."}</p></div>
          ) : null}
          <p className="text-ink/70">This website does not collect online payments. Every online booking is a request until the studio confirms it.</p>
        </div>
      </section>
      <BookCTA />
    </>
  );
}
