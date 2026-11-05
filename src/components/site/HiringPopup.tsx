"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const STYLES = ["Bollywood", "Kollywood", "Western", "Hip-Hop", "Salsa", "Zumba", "Kathak", "Folk", "Contemporary", "Bharatanatyam (Classical)"];
const PERKS = ["Flexible teaching hours", "Professional studio space", "Marketing and promotional support", "Exciting growth opportunities"];
const KEY = "sv-hiring";

/**
 * "Instructors wanted" announcement. Opens once per visit: after the intro splash on a first visit, or shortly after load
 * otherwise. Closes with the button, the Escape key or a click outside, and does not come back until the next visit.
 */
export function HiringPopup({ phone, email }: { phone: string; email: string }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const tel = phone.replace(/[^\d+]/g, "");

  useEffect(() => {
    try { if (sessionStorage.getItem(KEY)) return; } catch {}
    let t: ReturnType<typeof setTimeout> | undefined;
    const show = () => { t = setTimeout(() => setOpen(true), 700); };
    if (document.documentElement.dataset.splash === "on") window.addEventListener("splash-done", show, { once: true });
    else show();
    return () => { clearTimeout(t); window.removeEventListener("splash-done", show); };
  }, []);

  const close = () => { setOpen(false); try { sessionStorage.setItem(KEY, "1"); } catch {} };

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); try { sessionStorage.setItem(KEY, "1"); } catch {} } };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-[#0d0b09]/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
          onClick={close}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-labelledby="hiring-title"
            className="relative my-auto w-full max-w-[34rem] overflow-hidden rounded-[1.6rem] bg-[#15120e] text-[#f6efe0] shadow-[0_40px_90px_-30px_rgba(0,0,0,.8)]"
            initial={{ opacity: 0, y: 28, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_85%_0%,rgba(212,182,106,.22),transparent_70%),radial-gradient(50%_40%_at_0%_100%,rgba(212,182,106,.14),transparent_70%)]" />
            <button ref={closeRef} type="button" onClick={close} aria-label="Close" className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full border border-[#e6cf8b]/40 text-[#e6cf8b] transition hover:bg-white/10">
              <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13" /></svg>
            </button>

            <div className="relative px-6 pb-7 pt-9 sm:px-9">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[#d4b66a]">Now hiring</p>
              <h2 id="hiring-title" className="f-head mt-2 text-[2rem] leading-[1.05] sm:text-[2.5rem]">Dance instructors <span className="gold-text italic">wanted</span></h2>
              <p className="mt-2 text-[1.02rem] text-[#f6efe0]/85">Your passion. Your talent. Our studio.</p>
              <p className="mt-4 text-[0.95rem] leading-relaxed text-[#f6efe0]/75">Studio VM is inviting passionate and talented dance instructors to join our growing creative community in Mississauga. We are looking for instructors specializing in:</p>

              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Styles we are looking for">
                {STYLES.map((s) => <li key={s} className="rounded-full border border-[#d4b66a]/40 px-3 py-1 text-[0.78rem] text-[#e6cf8b]">{s}</li>)}
              </ul>

              <ul className="mt-5 grid gap-x-4 gap-y-1.5 text-[0.9rem] text-[#f6efe0]/85 sm:grid-cols-2">
                {PERKS.map((p) => <li key={p} className="flex gap-2"><span aria-hidden className="text-[#d4b66a]">&#10022;</span>{p}</li>)}
              </ul>

              <p className="f-head mt-6 text-[1.25rem] italic text-[#e6cf8b]">Teach. Inspire. Grow with Studio VM.</p>

              <div className="mt-5 flex flex-wrap gap-3">
                <a href={`mailto:${email}?subject=${encodeURIComponent("Dance instructor application")}`} className="btn btn-primary !min-h-[3rem] !px-6">Apply now</a>
                <a href={`tel:${tel}`} className="inline-flex min-h-[3rem] items-center rounded-full border border-[#e6cf8b]/50 px-6 text-[0.95rem] text-[#e6cf8b] transition hover:bg-white/10">Call {phone}</a>
              </div>
              <p className="mt-4 text-[0.82rem] text-[#f6efe0]/60">{email} &middot; Studio VM, Mississauga, Ontario</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
