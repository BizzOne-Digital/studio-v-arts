import Link from "next/link";
import { ArtPlate, type Tone } from "./ArtPlate";
import { Brush } from "./Brush";
import { Magnetic, Mask, Parallax, Reveal, SplitText } from "./motion";
import { Photo } from "./Photo";
import { cn } from "@/lib/cn";
import { getGallery } from "@/lib/content";

/** Interior page header: oversized title, supporting copy and an arched art/photo block. */
export async function PageHero({
  eyebrow, title, italic = [], body, tone = "hero", image, imageAlt = "", photo, children,
}: { eyebrow: string; title: string; italic?: string[]; body?: string; tone?: Tone; image?: string | null; imageAlt?: string; photo?: number; children?: React.ReactNode }) {
  if (!image && photo != null) {
    const g = (await getGallery())[photo];
    if (g) { image = g.src; imageAlt = g.alt; }
  }
  return (
    <section className="relative overflow-hidden pt-28 pb-12 sm:pt-32 sm:pb-16">
      <div aria-hidden className="pointer-events-none absolute -left-40 top-10 h-[34rem] w-[34rem] rounded-full bg-lilac blur-3xl opacity-70" />
      <div className="relative mx-auto grid max-w-[88rem] items-center gap-10 px-5 sm:px-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Reveal y={12}><p className="eyebrow">{eyebrow}</p></Reveal>
          <SplitText as="h1" text={title} italicWords={italic} immediate className="display mt-5 text-[clamp(2.4rem,6.2vw,5.4rem)]" />
          {body ? <Reveal delay={0.5}><p className="mt-8 max-w-xl text-lg text-ink/80">{body}</p></Reveal> : null}
          {children ? <Reveal delay={0.65} className="mt-8 flex flex-wrap gap-3">{children}</Reveal> : null}
        </div>
        <div className="relative lg:col-span-5">
          <div className="pointer-events-none absolute -right-10 -top-16 w-[22rem] max-w-[80%] opacity-80"><Brush tone="lavender" duration={2.4} /></div>
          <Mask from="bottom" delay={0.2} className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-t-[999px] rounded-b-[2rem] shadow-[0_40px_80px_-40px_rgba(21,18,14,.55)]">
            <Parallax speed={20} className="h-full w-full">
              <Photo src={image} alt={imageAlt} tone={tone} priority sizes="(min-width:1024px) 34vw, 90vw" />
            </Parallax>
          </Mask>
        </div>
      </div>
    </section>
  );
}

export function SectionHead({ eyebrow, title, italic, body, className, light }: { eyebrow?: string; title: string; italic?: string[]; body?: string; className?: string; light?: boolean }) {
  return (
    <div className={cn("max-w-3xl", className)}>
      {eyebrow ? <Reveal y={10}><p className={cn("eyebrow", light && "!text-lavender")}>{eyebrow}</p></Reveal> : null}
      <SplitText text={title} italicWords={italic} className={cn("display mt-4 text-[clamp(2rem,4.4vw,3.7rem)]", light && "[&_.display-i]:!text-champagne-soft")} />
      {body ? <Reveal delay={0.2}><p className={cn("mt-6 max-w-2xl text-lg", light ? "text-ivory/80" : "text-ink/75")}>{body}</p></Reveal> : null}
    </div>
  );
}

export function BookCTA({ title = "Ready to own your vibe?", body = "Pick a class or reserve the studio. Every request is reviewed personally and confirmed by our team." }: { title?: string; body?: string }) {
  return (
    <section className="px-5 pb-24 pt-8 sm:px-8">
      <div className="on-dark grain relative mx-auto max-w-[88rem] overflow-hidden rounded-[2.5rem] bg-plum px-6 py-20 text-ivory sm:px-16 sm:py-28">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 w-[30rem] opacity-60"><Brush tone="champagne" /></div>
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 w-[26rem] opacity-30"><Brush tone="lavender" delay={0.8} /></div>
        <div className="relative max-w-3xl">
          <SplitText text={title} italicWords={["vibe?"]} className="display text-[clamp(2.2rem,5.4vw,4.6rem)] [&_.display-i]:!text-champagne-soft" />
          <Reveal delay={0.3}><p className="mt-6 max-w-xl text-lg text-ivory/85">{body}</p></Reveal>
          <Reveal delay={0.45} className="mt-10 flex flex-wrap gap-4">
            <Magnetic><Link href="/booking" className="btn btn-light">Book Your Vibe</Link></Magnetic>
            <Link href="/contact" className="btn btn-outline-light">Ask a question</Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function FaqList({ items }: { items: { id: string; question: string; answer: string }[] }) {
  if (!items.length) return null;
  return (
    <div className="divide-y divide-plum/15 border-y border-plum/15">
      {items.map((f) => (
        <details key={f.id} className="group">
          <summary className="flex min-h-16 items-center justify-between gap-6 py-5 text-left">
            <span className="display text-2xl sm:text-3xl">{f.question}</span>
            <span aria-hidden className="plus grid h-11 w-11 shrink-0 place-items-center rounded-full border border-plum/40 text-2xl text-plum transition-transform duration-300 group-hover:bg-plum group-hover:text-ivory">+</span>
          </summary>
          <p className="max-w-3xl pb-8 text-ink/80">{f.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function Quotes({ items, large }: { items: { id: string; author_name: string; author_role: string; quote: string }[]; large?: boolean }) {
  return (
    <ul className={cn("grid gap-8", large ? "md:grid-cols-2" : "md:grid-cols-3")}>
      {items.map((t, i) => (
        <Reveal as="li" key={t.id} delay={(i % 3) * 0.1} className={cn("relative rounded-[2rem] p-8 sm:p-10", i % 3 === 1 ? "bg-plum text-ivory md:translate-y-10" : i % 3 === 2 ? "bg-lilac" : "bg-sand")}>
          <span aria-hidden className="display absolute right-8 top-2 text-8xl opacity-20">&ldquo;</span>
          <blockquote>
            <p className="display text-2xl leading-snug sm:text-3xl">{t.quote}</p>
            <footer className="mt-6 text-sm">
              <span className="font-semibold">{t.author_name}</span>
              {t.author_role ? <span className="opacity-70">, {t.author_role}</span> : null}
            </footer>
          </blockquote>
        </Reveal>
      ))}
    </ul>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-3xl border border-dashed border-plum/30 bg-sand/60 px-8 py-12 text-center text-ink/70">{children}</p>;
}

export function Steps({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <ol className="grid gap-10 md:grid-cols-3">
      {steps.map((s, i) => (
        <Reveal as="li" key={s.title} delay={i * 0.12}>
          <span className="display text-7xl text-lavender">{String(i + 1).padStart(2, "0")}</span>
          <h3 className="display mt-2 text-3xl">{s.title}</h3>
          <p className="mt-3 text-ink/75">{s.body}</p>
        </Reveal>
      ))}
    </ol>
  );
}

export { ArtPlate };
