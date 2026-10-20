"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES, CATEGORY_KEYS, money, type Category } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Photo } from "./Photo";
import { Tilt } from "./motion";

export type ServiceView = {
  id: string; slug: string; title: string; summary: string; description: string; category: Category;
  image: string | null; imageAlt: string; audience: string; ageInfo: string; durationMinutes: number | null;
  priceCents: number | null; priceNote: string; instructor: string; capacity: number | null;
  bookingType: "class" | "rental" | "enquiry"; upcoming: number;
};

const ctaFor = (s: ServiceView) =>
  s.bookingType === "rental" ? { label: "Book the studio", href: "/booking?type=rental" }
  : s.bookingType === "class" && s.upcoming > 0 ? { label: "See times and book", href: `/booking?service=${s.slug}` }
  : { label: "Ask about this", href: `/contact?topic=${encodeURIComponent(s.title)}` };

function Facts({ s }: { s: ServiceView }) {
  const rows: [string, string][] = [];
  if (s.audience) rows.push(["Who it's for", s.audience]);
  if (s.ageInfo) rows.push(["Ages", s.ageInfo]);
  if (s.durationMinutes) rows.push(["Duration", `${s.durationMinutes} min`]);
  if (s.instructor) rows.push(["Instructor", s.instructor]);
  if (s.capacity) rows.push(["Group size", `Up to ${s.capacity}`]);
  if (s.priceCents != null) rows.push(["Price", `${money(s.priceCents)}${s.bookingType === "class" ? " per person" : ""}`]);
  else if (s.priceNote) rows.push(["Price", s.priceNote]);
  if (!rows.length) return null;
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
      {rows.map(([k, v]) => (
        <div key={k}><dt className="eyebrow !tracking-[0.14em]">{k}</dt><dd className="mt-1 text-base">{v}</dd></div>
      ))}
    </dl>
  );
}

export function ServiceBrowser({ services, initial }: { services: ServiceView[]; initial: Category | "all" }) {
  const [cat, setCat] = useState<Category | "all">(initial);
  const [open, setOpen] = useState<ServiceView | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const shown = cat === "all" ? services : services.filter((s) => s.category === cat);
  const counts = (k: Category | "all") => (k === "all" ? services.length : services.filter((s) => s.category === k).length);
  const tabs: { k: Category | "all"; label: string }[] = [{ k: "all", label: "All" }, ...CATEGORY_KEYS.map((k) => ({ k, label: CATEGORIES[k].label }))];

  return (
    <div>
      <div role="group" aria-label="Filter experiences by category" className="sticky top-16 z-30 -mx-5 flex gap-2 overflow-x-auto bg-ivory/90 px-5 py-3 backdrop-blur sm:mx-0 sm:flex-wrap sm:rounded-full sm:px-3">
        {tabs.filter((t) => counts(t.k) > 0 || t.k === "all").map((t) => (
          <button
            key={t.k}
            type="button"
            aria-pressed={cat === t.k}
            onClick={() => setCat(t.k)}
            className={cn("relative min-h-11 shrink-0 rounded-full px-5 text-[0.95rem] font-semibold transition-colors", cat === t.k ? "text-ivory" : "text-plum hover:bg-lilac")}
          >
            {cat === t.k && <motion.span layoutId="cat-pill" className="absolute inset-0 -z-0 rounded-full bg-plum" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
            <span className="relative z-10">{t.label}<span className="ml-1.5 text-xs opacity-70">{counts(t.k)}</span></span>
          </button>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">{shown.length} experiences shown</p>

      {shown.length === 0 ? (
        <p className="mt-12 rounded-3xl border border-dashed border-plum/30 bg-sand/60 p-12 text-center text-ink/70">No experiences are published in this category yet.</p>
      ) : (
        <motion.ul layout className="mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {shown.map((s, i) => {
              const cta = ctaFor(s);
              const tall = i % 3 === 1;
              return (
                <motion.li key={s.id} layout initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className={cn(tall && "lg:mt-14")}>
                  <Tilt>
                    <button
                      type="button"
                      onClick={(e) => { trigger.current = e.currentTarget; setOpen(s); }}
                      className="group block w-full text-left"
                      aria-haspopup="dialog"
                    >
                      <div className={cn("relative overflow-hidden rounded-t-[999px] rounded-b-[1.5rem]", tall ? "aspect-[3/4.2]" : "aspect-[3/3.8]")}>
                        <div className="h-full w-full transition-transform duration-[900ms] ease-out group-hover:scale-110"><Photo src={s.image} alt={s.imageAlt || s.title} tone={s.category === "connect" ? "connect" : s.category === "learn" ? "learn" : s.category === "create" ? "create" : s.category === "rental" ? "rental" : "move"} sizes="(min-width:1024px) 30vw, 90vw" seed={i} /></div>
                        <span className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center bg-plum/90 py-3 text-sm font-semibold text-ivory transition-transform duration-500 group-hover:translate-y-0 group-focus-visible:translate-y-0">Details</span>
                      </div>
                      <p className="eyebrow mt-5">{CATEGORIES[s.category].label}</p>
                      <h3 className="display mt-1 text-3xl group-hover:text-mauve-deep">{s.title}</h3>
                      <p className="mt-2 text-ink/75">{s.summary}</p>
                      <p className="mt-3 text-sm font-semibold text-plum">
                        {s.priceCents != null ? `From ${money(s.priceCents)}` : s.priceNote || (s.bookingType === "enquiry" ? "Enquire for details" : "")}
                        {s.bookingType === "class" && s.upcoming > 0 ? <span className="ml-3 rounded-full bg-lilac px-2.5 py-1 text-xs">{s.upcoming} upcoming</span> : null}
                      </p>
                    </button>
                  </Tilt>
                  <Link href={cta.href} className="ulink mt-2 inline-block text-sm font-semibold text-plum">{cta.label} &rarr;</Link>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      )}

      <dialog
        ref={dlg}
        aria-labelledby="svc-title"
        onClose={() => { setOpen(null); trigger.current?.focus(); }}
        onClick={(e) => { if (e.target === dlg.current) setOpen(null); }}
        className="m-auto max-h-[92svh] w-[min(56rem,94vw)] overflow-y-auto rounded-[2rem] bg-ivory p-0 text-ink backdrop:bg-plum-deep/60 backdrop:backdrop-blur-sm"
      >
        {open ? (
          <div className="grid md:grid-cols-2">
            <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[28rem]">
              <Photo src={open.image} alt={open.imageAlt || open.title} tone="move" sizes="(min-width:768px) 28rem, 94vw" />
            </div>
            <div className="p-7 sm:p-10">
              <p className="eyebrow">{CATEGORIES[open.category].label}</p>
              <h2 id="svc-title" className="display mt-2 text-4xl sm:text-5xl">{open.title}</h2>
              <p className="mt-4 text-ink/80">{open.description || open.summary}</p>
              <div className="mt-6"><Facts s={open} /></div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={ctaFor(open).href} className="btn btn-primary">{ctaFor(open).label}</Link>
                <button type="button" onClick={() => setOpen(null)} className="btn btn-ghost">Close</button>
              </div>
            </div>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
