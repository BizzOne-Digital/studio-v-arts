"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { ArtPlate, type Tone } from "./ArtPlate";
import { Photo } from "./Photo";
import { Reveal } from "./motion";

export type GalleryItem = { id: string; src: string | null; alt: string; caption: string; tone?: Tone };

const SPANS = ["sm:col-span-2 sm:row-span-2", "", "", "sm:row-span-2", "", "sm:col-span-2", "", ""];

/** Editorial mosaic with a keyboard-accessible lightbox. Placeholder tiles are illustrations, not photographs. */
export function GalleryGrid({ items, limit }: { items: GalleryItem[]; limit?: number }) {
  const list = limit ? items.slice(0, limit) : items;
  const [idx, setIdx] = useState<number | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const real = list.filter((i) => i.src);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (idx !== null && !d.open) d.showModal();
    if (idx === null && d.open) d.close();
  }, [idx]);

  useEffect(() => {
    if (idx === null) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIdx((i) => (i === null ? i : (i + 1) % real.length));
      if (e.key === "ArrowLeft") setIdx((i) => (i === null ? i : (i - 1 + real.length) % real.length));
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [idx, real.length]);

  const cur = idx !== null ? real[idx] : null;
  return (
    <>
      <ul className="grid auto-rows-[11rem] grid-cols-2 gap-3 sm:auto-rows-[13rem] sm:grid-cols-4 sm:gap-4">
        {list.map((it, i) => (
          <Reveal as="li" key={it.id} delay={(i % 4) * 0.07} y={24} className={cn("relative overflow-hidden rounded-[1.5rem]", SPANS[i % SPANS.length])}>
            {it.src ? (
              <button
                type="button"
                className="group block h-full w-full"
                aria-label={`Enlarge photo: ${it.alt || it.caption || "studio photo"}`}
                onClick={(e) => { opener.current = e.currentTarget; setIdx(real.findIndex((r) => r.id === it.id)); }}
              >
                <div className="h-full w-full transition-transform duration-[900ms] group-hover:scale-110"><Photo src={it.src} alt={it.alt} sizes="(min-width:640px) 25vw, 50vw" /></div>
                {it.caption ? <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-plum-deep/80 to-transparent p-4 text-left text-sm text-ivory opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">{it.caption}</span> : null}
              </button>
            ) : (
              <div className="h-full w-full" aria-hidden><ArtPlate tone={it.tone ?? "hero"} /></div>
            )}
          </Reveal>
        ))}
      </ul>

      <dialog
        ref={dlg}
        aria-label="Photo viewer"
        onClose={() => { setIdx(null); opener.current?.focus(); }}
        onClick={(e) => { if (e.target === dlg.current) setIdx(null); }}
        className="m-auto max-h-[94svh] w-[min(70rem,96vw)] overflow-hidden rounded-[1.5rem] bg-plum-deep p-0 text-ivory backdrop:bg-black/70"
      >
        {cur ? (
          <div className="on-dark relative">
            <div className="relative h-[70svh] w-full"><Photo src={cur.src} alt={cur.alt} sizes="96vw" className="[&_img]:!object-contain" /></div>
            <div className="flex items-center justify-between gap-4 p-4">
              <p className="text-sm">{cur.caption || cur.alt}</p>
              <div className="flex gap-2">
                <button type="button" className="btn btn-outline-light !min-h-11 !px-4" onClick={() => setIdx((i) => ((i ?? 0) - 1 + real.length) % real.length)} aria-label="Previous photo">&larr;</button>
                <button type="button" className="btn btn-outline-light !min-h-11 !px-4" onClick={() => setIdx((i) => ((i ?? 0) + 1) % real.length)} aria-label="Next photo">&rarr;</button>
                <button type="button" className="btn btn-light !min-h-11 !px-5" onClick={() => setIdx(null)}>Close</button>
              </div>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}

export const PLACEHOLDER_TILES: GalleryItem[] = (["move", "create", "connect", "learn", "rental", "about", "hero", "move"] as Tone[]).map((t, i) => ({
  id: `ph-${i}`, src: null, alt: "", caption: "", tone: t,
}));
