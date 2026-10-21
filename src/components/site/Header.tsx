"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { PAGES, PRIMARY } from "@/lib/nav";
import { cn } from "@/lib/cn";
import { Magnetic } from "./motion";

export function Wordmark({ logoSrc, name, light, id }: { logoSrc?: string | null; name: string; light?: boolean; id?: string }) {
  if (logoSrc) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img id={id} src={logoSrc} alt={name} className="h-12 w-auto" />;
  }
  // Full-name lockup: script "Studio V" with the legal name beneath it.
  return (
    <span id={id} role="img" aria-label="Studio V Arts Wellness & Learning Inc" className={cn("inline-flex flex-col items-start whitespace-nowrap leading-none", light ? "text-white" : "text-[#3a0f35]")}>
      <span aria-hidden className="f-script block pr-3 pt-1 text-[2.9rem] leading-[1.1]">Studio V</span>
      <span aria-hidden className="f-serif -mt-1.5 block text-[0.56rem] font-semibold uppercase tracking-[0.24em] opacity-90">Arts Wellness &amp; Learning Inc</span>
    </span>
  );
}

export function Header({ logoSrc, name }: { logoSrc: string | null; name: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduce = useReducedMotion();
  const btn = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    firstLink.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    window.addEventListener("keydown", esc);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", esc); };
  }, [open]);

  const primary = PAGES.filter((p) => PRIMARY.includes(p.href));
  return (
    <>
      <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-500", open ? "border-b border-transparent py-3" : scrolled ? "bg-white/90 backdrop-blur-md border-b border-[#3a0f35]/15 py-2.5" : "border-b border-[#3a0f35]/25 py-3")}>
        <div className="flex w-full items-center justify-between px-5 sm:px-12 lg:px-[5.2rem]">
          <Link href="/" aria-label={`${name} home`} className="rounded-full">
            <Wordmark id="site-logo" logoSrc={logoSrc} name={name} light={open} />
          </Link>
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-14">
              {primary.map((p) => (
                <li key={p.href}>
                  <Link href={p.href} aria-current={path === p.href ? "page" : undefined} className={cn("ulink f-serif text-[1.15rem] text-[#3a0f35]", path === p.href && "[background-size:100%_1.5px]")}>
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block"><Magnetic>
              <Link href="/booking" className="btn f-serif group !gap-3 !bg-[#3a0f35] !px-7 !text-[1.1rem] !text-white">Book Your Vibe<svg aria-hidden width="20" height="12" viewBox="0 0 22 14" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M0 7h20M14 1l6 6-6 6" /></svg></Link>
            </Magnetic></span>
            <span className={cn("sm:hidden", open && "invisible")}><Link href="/booking" className="btn btn-primary !min-h-11 !px-4 !py-2 text-sm whitespace-nowrap">Book Your Vibe</Link></span>
            <button
              ref={btn}
              type="button"
              className={cn("grid h-12 w-12 place-items-center rounded-full border lg:hidden", open ? "border-ivory/50 text-ivory" : "border-plum/30 text-plum")}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((o) => !o)}
            >
              <span aria-hidden className="relative block h-3.5 w-6">
                <span className={cn("absolute left-0 top-0 h-0.5 w-6 bg-current transition-transform duration-300", open && "translate-y-[6px] rotate-45")} />
                <span className={cn("absolute left-0 bottom-0 h-0.5 w-6 bg-current transition-transform duration-300", open && "-translate-y-[6px] -rotate-45")} />
              </span>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="on-dark fixed inset-0 z-40 overflow-y-auto bg-plum-deep text-ivory lg:hidden"
            initial={reduce ? { opacity: 0 } : { clipPath: "circle(0% at calc(100% - 2.5rem) 2.5rem)" }}
            animate={reduce ? { opacity: 1 } : { clipPath: "circle(150% at calc(100% - 2.5rem) 2.5rem)" }}
            exit={reduce ? { opacity: 0 } : { clipPath: "circle(0% at calc(100% - 2.5rem) 2.5rem)" }}
            transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
          >
            <nav aria-label="Mobile" className="mx-auto flex min-h-full max-w-xl flex-col justify-center px-8 pb-10 pt-28">
              <ul className="space-y-1">
                {PAGES.map((p, i) => (
                  <motion.li key={p.href} initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.045, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
                    <Link ref={i === 0 ? firstLink : undefined} href={p.href} aria-current={path === p.href ? "page" : undefined} className="display flex items-baseline gap-4 py-1.5 text-[2.1rem] hover:text-lavender aria-[current=page]:text-champagne-soft">
                      <span className="text-sm font-sans tracking-widest text-lavender/70" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
                      {p.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>
              <Link href="/booking" className="btn btn-light mt-8 self-start">Book Your Vibe</Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
