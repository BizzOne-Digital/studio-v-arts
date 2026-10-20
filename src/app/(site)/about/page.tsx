import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { BookCTA, PageHero, Quotes, SectionHead } from "@/components/site/sections";
import { GalleryGrid, PLACEHOLDER_TILES } from "@/components/site/GalleryGrid";
import { Brush } from "@/components/site/Brush";
import { Photo } from "@/components/site/Photo";
import { Marquee, Mask, Parallax, Reveal, SplitText } from "@/components/site/motion";
import { getGallery, getTeam, getTestimonials } from "@/lib/content";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "About Studio V",
  description: "The story behind Studio V: a welcoming community space where creativity, wellness, learning and celebration come together.",
};

const VALUES = [
  { t: "Explore", b: "Try something new without pressure. Every interest is welcome.", i: 2 },
  { t: "Grow", b: "Build confidence at your own pace, alongside people who cheer you on.", i: 1 },
  { t: "Connect", b: "Meet neighbours, share a room, and find your people.", i: 4 },
  { t: "Celebrate", b: "Mark the big and small moments in a space that feels like yours.", i: 5 },
];
const WELCOME = ["Women", "Children", "Families", "Fitness lovers", "Learners", "Instructors", "Seniors", "Celebrations", "Community"];

export default async function About() {
  const [s, gallery, team, quotes] = await Promise.all([getSettings(), getGallery(), getTeam(), getTestimonials()]);
  const g = (n: number) => gallery[n];
  return (
    <>
      <PageHero eyebrow="About Studio V" title="Where creativity meets community." italic={["community."]} body={s.copy.introBody} tone="about" photo={0}>
        <Link href="/booking" className="btn btn-primary">Book Your Vibe</Link>
        <Link href="/experiences" className="btn btn-ghost">Explore Experiences</Link>
      </PageHero>

      <section className="bg-plum py-5 text-ivory on-dark"><Marquee items={WELCOME} /></section>

      {/* Story: sticky photo + editorial copy */}
      <section className="mx-auto max-w-[88rem] overflow-x-clip px-5 py-24 sm:px-8 sm:py-32">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <Mask from="bottom" className="relative aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[2rem] shadow-[0_40px_80px_-40px_rgba(58,15,53,.55)]">
                <Parallax speed={18} className="h-full"><Photo src={g(6)?.src} alt={g(6)?.alt ?? ""} tone="about" sizes="(min-width:1024px) 40vw, 90vw" /></Parallax>
              </Mask>
              <div className="pointer-events-none absolute -left-8 -top-8 -z-10 w-56 opacity-60"><Brush tone="lavender" /></div>
              <p className="hand mt-6 text-center text-3xl text-mauve-deep">{s.business.supportingLine}</p>
            </div>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <p className="eyebrow">Our story</p>
            <SplitText text="One room with room for everyone." italicWords={["everyone."]} className="display mt-4 text-[clamp(2rem,4.2vw,3.5rem)]" />
            <div className="mt-8 space-y-6 text-lg text-ink/80">
              <Reveal><p className="first-letter:float-left first-letter:mr-3 first-letter:font-[family-name:var(--font-playfair)] first-letter:text-7xl first-letter:leading-[0.8] first-letter:text-plum">
                Studio V brings creativity, wellness, learning and celebration together under one roof. It is a welcoming space to explore your interests, build confidence, meet people and make memories.
              </p></Reveal>
              <Reveal delay={0.1}><p>Dancers and chess players, painters and parents, children, seniors and curious beginners all share the same floor. Some come for a class. Some hire the space for their own. Many come for both.</p></Reveal>
            </div>
            <Reveal delay={0.15}>
              <figure className="mt-12 border-l-2 border-champagne pl-6">
                <blockquote className="display text-2xl leading-snug text-plum sm:text-3xl">To create a welcoming and inspiring community where every individual feels empowered to explore, grow, connect, and celebrate life.</blockquote>
                <figcaption className="eyebrow mt-4">Our vision</figcaption>
              </figure>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Statement over photo */}
      <section className="on-dark relative isolate overflow-hidden py-28 text-ivory sm:py-40">
        {g(12) ? <Image src={g(12).src} alt="" fill sizes="100vw" className="-z-20 object-cover" /> : <div className="absolute inset-0 -z-20 bg-plum" />}
        <div aria-hidden className="absolute inset-0 -z-10 bg-plum-deep/80" />
        <div aria-hidden className="pointer-events-none absolute -right-24 top-0 -z-10 w-[34rem] opacity-30"><Brush tone="champagne" loop /></div>
        <div className="mx-auto max-w-[88rem] px-5 sm:px-8">
          <SplitText text="Your Space." className="display text-[clamp(2.6rem,7vw,6.2rem)]" />
          <SplitText text="Your Passion." delay={0.2} className="display text-[clamp(2.6rem,7vw,6.2rem)] text-lavender" />
          <SplitText text="Your Vibe." delay={0.4} italicWords={["Vibe"]} className="display text-[clamp(2.6rem,7vw,6.2rem)] [&_.display-i]:!text-champagne-soft" />
        </div>
      </section>

      {/* Values with photos */}
      <section className="mx-auto max-w-[88rem] px-5 py-24 sm:px-8 sm:py-32">
        <SectionHead eyebrow="What we stand for" title="Community values." italic={["values."]} className="mb-14" />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v, i) => (
            <Reveal as="li" key={v.t} delay={i * 0.09} className={i % 2 ? "lg:mt-14" : ""}>
              <div className="group">
                <div className="relative aspect-[3/4] overflow-hidden rounded-t-[999px] rounded-b-[1.5rem]">
                  <div className="h-full w-full transition-transform duration-[1000ms] group-hover:scale-110"><Photo src={g(v.i)?.src} alt={g(v.i)?.alt ?? ""} tone="about" seed={i} sizes="(min-width:1024px) 22vw, 45vw" /></div>
                  <span className="display absolute bottom-3 left-5 text-5xl text-ivory drop-shadow">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="display mt-5 text-3xl">{v.t}</h3>
                <p className="mt-2 text-ink/75">{v.b}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </section>

      <section className="bg-sand py-24">
        <div className="mx-auto max-w-[88rem] px-5 sm:px-8">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <SectionHead eyebrow="Inside Studio V" title="The space." italic={["space."]} />
            <Link href="/gallery" className="ulink font-semibold text-plum">Full gallery &rarr;</Link>
          </div>
          <GalleryGrid items={gallery.length ? gallery : PLACEHOLDER_TILES} limit={6} />
        </div>
      </section>

      {team.length ? (
        <section className="mx-auto max-w-[88rem] px-5 py-24 sm:px-8">
          <SectionHead eyebrow="The team" title="The people behind the vibe." italic={["vibe."]} className="mb-12" />
          <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {team.slice(0, 4).map((m, i) => (
              <Reveal as="li" key={m.id} delay={i * 0.08}>
                <Mask from="bottom" className="aspect-[3/4] overflow-hidden rounded-t-[999px] rounded-b-2xl"><Parallax speed={12} className="h-full"><Photo src={m.image} alt={m.imageAlt} tone="about" sizes="25vw" /></Parallax></Mask>
                <h3 className="display mt-5 text-3xl">{m.name}</h3>
                <p className="eyebrow mt-1">{m.role}</p>
              </Reveal>
            ))}
          </ul>
          <Link href="/team" className="ulink mt-10 inline-block font-semibold text-plum">Meet the whole team &rarr;</Link>
        </section>
      ) : null}

      {quotes.length ? (
        <section className="mx-auto max-w-[88rem] px-5 pb-24 sm:px-8">
          <SectionHead eyebrow="Kind words" title="From our community." italic={["community."]} className="mb-14" />
          <Quotes items={quotes.slice(0, 3)} />
        </section>
      ) : null}
      <BookCTA />
    </>
  );
}
