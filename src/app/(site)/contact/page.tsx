import Link from "next/link";
import type { Metadata } from "next";
import { ContactForm } from "@/components/site/ContactForm";
import { OrgJsonLd } from "@/components/site/JsonLd";
import { FaqList, PageHero, Quotes, SectionHead } from "@/components/site/sections";
import { getFaqs, getTestimonials } from "@/lib/content";
import { Reveal } from "@/components/site/motion";
import { addressLine, getSettings, hasAddress, mapLinks } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Info & Contact",
  description: "Get in touch with Studio VM by form, email or phone. Find our details, hours and directions.",
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function Contact({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  const [s, faqs, quotes] = await Promise.all([getSettings(), getFaqs(), getTestimonials()]);
  const b = s.business;
  const map = mapLinks(s);
  const socials = (Object.entries(s.social) as [string, string][]).filter(([, v]) => v);
  const tel = b.phone.replace(/[^\d+]/g, "");
  return (
    <>
      <OrgJsonLd s={s} />
      <PageHero eyebrow="Info & Contact" title="Let's talk." italic={["talk."]} body="Send us a message, or reach us directly. We read everything and reply personally." tone="connect" photo={4} />

      <section className="mx-auto grid max-w-[88rem] gap-16 px-5 pb-24 sm:px-8 lg:grid-cols-12">
        <Reveal className="lg:col-span-7">
          <h2 className="display text-4xl sm:text-5xl">Send a message</h2>
          <div className="mt-8"><ContactForm topic={topic?.slice(0, 120)} /></div>
        </Reveal>

        <Reveal delay={0.15} className="space-y-10 lg:col-span-4 lg:col-start-9">
          <div>
            <h2 className="eyebrow">Email</h2>
            <p className="mt-2 break-words"><a className="ulink display text-2xl sm:text-3xl" href={`mailto:${b.email}`}>{b.email}</a></p>
            {b.secondaryEmail ? <p className="mt-2"><a className="ulink" href={`mailto:${b.secondaryEmail}`}>{b.secondaryEmail}</a></p> : null}
          </div>
          <div>
            <h2 className="eyebrow">Phone</h2>
            <p className="mt-2"><a className="ulink display text-2xl sm:text-3xl" href={`tel:${tel}`}>{b.phone}</a></p>
          </div>
          {hasAddress(s.address) ? (
            <div>
              <h2 className="eyebrow">Studio address</h2>
              <p className="mt-2 text-lg">{addressLine(s.address)}</p>
              {map ? <a className="btn btn-ghost mt-4" href={map.directions} target="_blank" rel="noopener noreferrer">Get Directions<span className="sr-only"> (opens in a new tab)</span></a> : null}
            </div>
          ) : null}
          {s.hours.published ? (
            <div>
              <h2 className="eyebrow">Hours</h2>
              <dl className="mt-3">
                {s.hours.days.map((d, i) => (
                  <div key={i} className="flex justify-between border-b border-plum/10 py-1.5"><dt>{DAYS[i]}</dt><dd className="font-semibold">{d.enabled ? `${d.open} - ${d.close}` : "Closed"}</dd></div>
                ))}
              </dl>
              {s.hours.note ? <p className="mt-2 text-sm text-ink/70">{s.hours.note}</p> : null}
            </div>
          ) : null}
          {socials.length ? (
            <div>
              <h2 className="eyebrow">Follow along</h2>
              <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                {socials.map(([k, v]) => <li key={k}><a className="ulink font-semibold capitalize" href={v} target="_blank" rel="noopener noreferrer">{k}<span className="sr-only"> (opens in a new tab)</span></a></li>)}
              </ul>
            </div>
          ) : null}
          <Link href="/booking" className="btn btn-primary">Book Your Vibe</Link>
        </Reveal>
      </section>

      {map ? (
        <section aria-label="Map" className="mx-auto max-w-[88rem] px-5 pb-28 sm:px-8">
          <div className="overflow-hidden rounded-[2rem] border border-plum/15">
            <iframe title={`Map showing ${addressLine(s.address)}`} src={map.embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-[26rem] w-full border-0" />
          </div>
        </section>
      ) : <div className="pb-16" />}
      {faqs.length ? (
        <section id="faq" className="mx-auto max-w-5xl px-5 pb-24 sm:px-8">
          <SectionHead eyebrow="Good to know" title="Quick answers." italic={["answers."]} className="mb-10" />
          <FaqList items={faqs} />
        </section>
      ) : null}
      {quotes.length ? (
        <section id="reviews" className="mx-auto max-w-[88rem] px-5 pb-24 sm:px-8">
          <SectionHead eyebrow="Kind words" title="From our community." italic={["community."]} className="mb-12" />
          <Quotes items={quotes.slice(0, 6)} />
        </section>
      ) : null}
    </>
  );
}
