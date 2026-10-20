"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { Tone } from "./ArtPlate";
import { Photo } from "./Photo";

export type Panel = { key: string; label: string; blurb: string; tone: Tone; image: string | null; imageAlt: string; items: string[] };

/** Signature section: five panels that open like a fan. Hover, focus or tap to open. Works without hover. */
export function ExperiencePanels({ panels }: { panels: Panel[] }) {
  const [active, setActive] = useState(0);
  return (
    <div className="on-dark flex h-[52rem] flex-col gap-3 sm:h-[48rem] lg:h-[40rem] lg:flex-row" role="list">
      {panels.map((p, i) => {
        const open = i === active;
        return (
          <motion.div
            key={p.key}
            role="listitem"
            layout
            animate={{ flexGrow: open ? 5 : 1 }}
            transition={{ type: "spring", stiffness: 140, damping: 22 }}
            onPointerEnter={(e) => { if (e.pointerType === "mouse") setActive(i); }}
            className="group relative min-h-[4.75rem] min-w-0 basis-0 overflow-hidden rounded-[1.75rem] bg-plum text-ivory lg:min-h-0 lg:min-w-[5.5rem]"
          >
            <div className={cn("absolute inset-0 transition-transform duration-[1200ms] ease-out", open ? "scale-100" : "scale-125")}>
              <Photo src={p.image} alt={p.imageAlt} tone={p.tone} sizes="(min-width:1024px) 50vw, 100vw" seed={i} />
            </div>
            <div aria-hidden className={cn("absolute inset-0 transition-opacity duration-500", open ? "bg-gradient-to-t from-plum-deep/90 via-plum-deep/35 to-transparent opacity-100" : "bg-plum-deep/55 opacity-100")} />

            <button
              type="button"
              aria-expanded={open}
              aria-controls={`panel-${p.key}`}
              onClick={() => setActive(i)}
              onFocus={() => setActive(i)}
              className="absolute inset-0 z-10 flex items-start justify-between p-5 text-left lg:p-6"
            >
              <span className="display text-5xl opacity-80 lg:text-6xl" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
              <span className={cn("display text-2xl transition-opacity duration-300 lg:[writing-mode:vertical-rl] lg:rotate-180 lg:text-3xl", open ? "opacity-0" : "opacity-100")}>{p.label}</span>
              <span className="sr-only">{open ? "Collapse" : "Open"} {p.label}</span>
            </button>

            <div
              id={`panel-${p.key}`}
              inert={!open}
              className={cn("absolute inset-x-0 bottom-0 z-20 p-6 transition-all duration-700 lg:p-9", open ? "translate-y-0 opacity-100 delay-150" : "pointer-events-none translate-y-6 opacity-0")}
            >
              <h3 className="display text-4xl lg:text-6xl">{p.label}</h3>
              <p className="mt-2 max-w-md text-ivory/90">{p.blurb}</p>
              {p.items.length ? (
                <ul className="mt-4 flex flex-wrap gap-2 text-sm">
                  {p.items.slice(0, 5).map((t) => <li key={t} className="rounded-full border border-ivory/40 px-3 py-1">{t}</li>)}
                </ul>
              ) : null}
              <Link href={`/experiences?cat=${p.key}`} className="btn btn-light mt-5 !min-h-11 !py-2.5">Explore {p.label}</Link>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
