import Link from "next/link";
import type { Metadata } from "next";
import { Hero } from "@/components/site/Hero";
import { ExperiencePanels, type Panel } from "@/components/site/ExperiencePanels";
import { GalleryGrid, PLACEHOLDER_TILES } from "@/components/site/GalleryGrid";
import { BookCTA, FaqList, Quotes, SectionHead } from "@/components/site/sections";
import { Brush } from "@/components/site/Brush";
import { Magnetic, Marquee, Mask, Parallax, Reveal, SplitText } from "@/components/site/motion";
import { Photo } from "@/components/site/Photo";
import { OrgJsonLd } from "@/components/site/JsonLd";
import { getFaqs, getGallery, getLiveOffers, getServices, getTeam, getTestimonials, getUpcomingSessions } from "@/lib/content";
import { CATEGORIES, CATEGORY_KEYS, money } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { fmtDate, fmtTime } from "@/lib/time";
import { offerTerms } from "@/lib/pricing";

export const metadata: Metadata = {
  title: { absolute: "Studio VM | Own Your Vibe: dance, yoga, creative classes and studio rental" },
  description: "Studio VM brings movement, creativity, learning and celebration under one roof. Book a class or rent a flexible 600 sq ft studio.",
};

const TONE = { move: "move", create: "create", learn: "learn", connect: "connect", rental: "rental" } as const;

export default async function Home() {
  const [s, services, sessions, offers, gallery, quotes, faqs, team] = await Promise.all([
    getSettings(), getServices(), getUpcomingSessions(3), getLiveOffers(), getGallery(), getTestimonials(), getFaqs(true), getTeam(),
  ]);
  const tz = s.booking.timezone;
  const panels: Panel[] = CATEGORY_KEYS.map((k) => {
    const items = services.filter((x) => x.category === k);
    const withImg = items.find((x) => x.image);
    return { key: k, label: CATEGORIES[k].label, blurb: CATEGORIES[k].blurb, tone: TONE[k], image: withImg?.image ?? null, imageAlt: withImg?.imageAlt ?? "", items: items.map((x) => x.title) };
  });
  const offer = offers.find((o) => o.show_on_home);
  const tiles = gallery.length ? gallery.map((g) => ({ ...g })) : PLACEHOLDER_TILES;

  return (
    <>
      <OrgJsonLd s={s} />
      <Hero heroSub={s.copy.heroSub} />

      <section aria-label="What happens at Studio VM" className="on-dark grain relative overflow-hidden bg-plum py-8 text-ivory">
        <Marquee items={["Dance", "Yoga", "Painting", "Chess", "Zumba", "Workshops", "Celebrations", "Community"]} />
      </section>

      {/* Introduction */}
      <section id="intro" className="relative mx-auto overflow-x-clip max-w-[88rem] px-5 py-28 sm:px-8 sm:py-40">
        <div className="grid items-center gap-16 lg:grid-cols-12">
          <div className="lg:col-span-6 lg:pr-10">
            <SectionHead eyebrow="Welcome to Studio VM" title={s.copy.introHeading} italic={["belong."]} />
            <Reveal delay={0.2}><p className="mt-8 max-w-xl text-lg text-ink/80">{s.copy.introBody}</p></Reveal>
            <Reveal delay={0.3}><p className="hand mt-8 text-4xl text-mauve-deep">{s.business.supportingLine}</p></Reveal>
            <Reveal delay={0.4} className="mt-8"><Link href="/about" className="ulink font-semibold text-plum">Our story &rarr;</Link></Reveal>
          </div>
          <div className="relative lg:col-span-6">
            <div className="pointer-events-none absolute -left-10 -top-10 w-72 opacity-70"><Brush tone="lavender" /></div>
            <div className="relative grid grid-cols-5 gap-4">
              <Mask className="col-span-3 mt-16 aspect-[3/4.4] overflow-hidden rounded-t-[999px] rounded-b-3xl" from="bottom">
                <Parallax speed={25} className="h-full"><Photo src={gallery[2]?.src ?? gallery[0]?.src} alt={gallery[2]?.alt ?? gallery[0]?.alt ?? ""} tone="move" sizes="30vw" /></Parallax>
              </Mask>
              <Mask className="col-span-2 aspect-[3/4] overflow-hidden rounded-[2rem]" from="left" delay={0.2}>
                <Parallax speed={-20} className="h-full"><Photo src={gallery[3]?.src ?? gallery[1]?.src} alt={gallery[3]?.alt ?? gallery[1]?.alt ?? ""} tone="create" sizes="20vw" /></Parallax>
              </Mask>
            </div>
          </div>
        </div>
      </section>

      {/* Signature: experience fan */}
      <section className="bg-sand py-24 sm:py-32">
        <div className="mx-auto max-w-[88rem] px-5 sm:px-8">
          <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
            <SectionHead eyebrow="Experiences" title="Find the thing that moves you." italic={["moves"]} />
            <Reveal><Link href="/experiences" className="btn btn-ghost">See every experience</Link></Reveal>
          </div>
          <ExperiencePanels panels={panels} />
        </div>
      </section>

      {/* Upcoming classes */}
      {sessions.length ? (
        <section className="mx-auto max-w-[88rem] px-5 py-24 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHead eyebrow="Coming up" title="Next on the schedule." italic={["schedule."]} />
            <Link href="/schedule" className="ulink font-semibold text-plum">Full schedule &rarr;</Link>
          </div>
          <ul className="mt-12 grid gap-5 md:grid-cols-3">
            {sessions.map((x, i) => (
              <Reveal as="li" key={x.id} delay={i * 0.1} className="group rounded-[2rem] border border-plum/15 bg-white/60 p-7 transition-colors hover:bg-lilac">
                <p className="eyebrow">{fmtDate(x.startsAt, tz)}</p>
                <h3 className="display mt-2 text-3xl">{x.title}</h3>
                <p className="mt-2 text-ink/75">{fmtTime(x.startsAt, tz)} - {fmtTime(x.endsAt, tz, true)}</p>
                <p className="mt-1 text-sm text-ink/70">{x.seatsLeft > 0 ? `${x.seatsLeft} seat${x.seatsLeft === 1 ? "" : "s"} left` : "Full"}{x.priceCents != null ? ` · ${money(x.priceCents)}` : ""}</p>
                <Link href={x.seatsLeft > 0 ? `/booking?session=${x.id}` : "/schedule"} className="ulink mt-5 inline-block font-semibold text-plum">{x.seatsLeft > 0 ? "Request a seat" : "View schedule"} &rarr;</Link>
              </Reveal>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Rental */}
      <section className="on-dark grain relative overflow-hidden bg-plum-deep py-28 text-ivory sm:py-40">
        <div aria-hidden className="pointer-events-none absolute -right-40 top-0 w-[44rem] opacity-25"><Brush tone="champagne" loop /></div>
        <div className="relative mx-auto grid max-w-[88rem] items-center gap-16 px-5 sm:px-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="eyebrow !text-lavender">Studio rental</p>
            <p className="display mt-4 text-[clamp(4rem,12vw,10rem)] leading-[0.8] text-champagne-soft" aria-label="Approximately 600 square feet">
              <span aria-hidden>~600</span>
              <span aria-hidden className="display-i ml-3 text-[0.3em] text-ivory">sq ft</span>
            </p>
            <SplitText text={s.copy.rentalHeading} className="display mt-8 text-[clamp(1.8rem,3.6vw,2.8rem)] max-w-2xl" />
            <Reveal delay={0.2}><p className="mt-6 max-w-xl text-lg text-ivory/80">{s.copy.rentalBody}</p></Reveal>
            <Reveal delay={0.3} className="mt-9 flex flex-wrap gap-4">
              <Magnetic><Link href="/booking?type=rental" className="btn btn-light">Reserve the studio</Link></Magnetic>
              <Link href="/studio-rental" className="btn btn-outline-light">About the space</Link>
            </Reveal>
          </div>
          <Mask className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-t-[999px] rounded-b-[2rem] lg:col-span-5" from="bottom">
            <Photo src={services.find((x) => x.category === "rental")?.image} alt={services.find((x) => x.category === "rental")?.imageAlt ?? ""} tone="rental" sizes="30vw" />
          </Mask>
        </div>
      </section>

      {/* Launch offer */}
      {offer ? (
        <section className="mx-auto max-w-[88rem] px-5 py-24 sm:px-8">
          <Reveal className="relative overflow-hidden rounded-[2.5rem] bg-champagne-soft px-8 py-14 sm:px-16">
            <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 w-72 opacity-50"><Brush tone="plum" /></div>
            <p className="eyebrow">Launch offer</p>
            <h2 className="display mt-3 max-w-3xl text-4xl sm:text-6xl">{offer.title}</h2>
            <p className="mt-4 max-w-2xl text-lg text-ink/80">{offer.description}</p>
            <ul className="mt-6 max-w-2xl list-disc space-y-1 pl-5 text-sm text-ink/80">
              {offerTerms(offer, s.booking.minRateCents).slice(0, 3).map((t) => <li key={t}>{t}</li>)}
            </ul>
            <Link href="/pricing" className="btn btn-primary mt-8">See all terms</Link>
          </Reveal>
        </section>
      ) : null}

      {/* Gallery */}
      <section className="mx-auto max-w-[88rem] px-5 py-24 sm:px-8">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <SectionHead eyebrow="The space" title="A look inside." italic={["inside."]} />
          <Link href="/gallery" className="ulink font-semibold text-plum">Open the gallery &rarr;</Link>
        </div>
        <GalleryGrid items={tiles} limit={8} />
        {!gallery.length ? <p className="mt-4 text-sm text-ink/60">Illustrations shown while studio photography is being added.</p> : null}
      </section>

      {team.length ? (
        <section className="mx-auto max-w-[88rem] px-5 pb-24 sm:px-8">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <SectionHead eyebrow="The team" title="Meet your instructors." italic={["instructors."]} />
            <Link href="/team" className="ulink font-semibold text-plum">Instructors &amp; classes &rarr;</Link>
          </div>
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {team.slice(0, 4).map((m, i) => (
              <Reveal as="li" key={m.id} delay={i * 0.08}>
                <div className="aspect-[3/4] overflow-hidden rounded-t-[999px] rounded-b-2xl"><Photo src={m.image} alt={m.imageAlt} tone="about" sizes="25vw" /></div>
                <h3 className="display mt-4 text-2xl">{m.name}</h3>
                <p className="eyebrow mt-1">{m.role}</p>
              </Reveal>
            ))}
          </ul>
        </section>
      ) : null}

      {quotes.length ? (
        <section className="bg-lilac/50 py-24 sm:py-32">
          <div className="mx-auto max-w-[88rem] px-5 sm:px-8">
            <SectionHead eyebrow="Kind words" title="From our community." italic={["community."]} className="mb-14" />
            <Quotes items={quotes.slice(0, 3)} />
          </div>
        </section>
      ) : null}

      {faqs.length ? (
        <section className="mx-auto max-w-5xl px-5 py-24 sm:px-8">
          <SectionHead eyebrow="Good to know" title="Quick answers." italic={["answers."]} className="mb-12" />
          <FaqList items={faqs} />
          <Link href="/faq" className="ulink mt-8 inline-block font-semibold text-plum">More questions &rarr;</Link>
        </section>
      ) : null}

      <BookCTA title={s.copy.closingHeading} body={s.copy.closingBody} />
    </>
  );
}
