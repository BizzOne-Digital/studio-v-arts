"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { MOBILE_MENU, PAGES, PRIMARY } from "@/lib/nav";
import { InstagramCta } from "./Instagram";
import { cn } from "@/lib/cn";
import { Magnetic } from "./motion";

/** The STUDIO VM logo. Dark artwork by default, ivory artwork (`light`) for dark backgrounds; an admin-uploaded logo overrides both. */
export function Wordmark({ logoSrc, name, light, id, className }: { logoSrc?: string | null; name: string; light?: boolean; id?: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img id={id} src={logoSrc || (light ? "/logo-light.webp" : "/logo.webp")} alt={name} width={1000} height={459} className={cn("h-[4.2rem] w-auto", className)} />;
}

export function Header({ logoSrc, name, instagram }: { logoSrc: string | null; name: string; instagram?: string | null }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduce = useReducedMotion();
  const btn = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  const [seenPath, setSeenPath] = useState(path);
  if (seenPath !== path) { setSeenPath(path); setOpen(false); }
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
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
        <div className={cn("mx-auto flex max-w-[92rem] items-center justify-between rounded-[1.4rem] border px-4 py-1.5 transition-all duration-500 sm:px-7", open ? "border-transparent bg-transparent" : scrolled ? "border-black/5 bg-white/85 shadow-[0_14px_44px_-22px_rgba(21,18,14,.45)] backdrop-blur-xl" : "border-white/60 bg-white/55 shadow-[0_10px_40px_-24px_rgba(21,18,14,.4)] backdrop-blur-md")}>
          <Link href="/" aria-label={`${name} home`} className="rounded-full">
            <Wordmark id="site-logo" logoSrc={logoSrc} name={name} light={open} />
          </Link>
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-14">
              {primary.map((p) => (
                <li key={p.href}>
                  <Link href={p.href} aria-current={path === p.href ? "page" : undefined} className={cn("ulink f-serif text-[1.15rem] text-[#15120e]", path === p.href && "[background-size:100%_1.5px]")}>
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block"><Magnetic>
              <Link href="/booking" className="btn btn-primary f-serif group !gap-3 !px-7 !text-[1.1rem]">Book Your Vibe<svg aria-hidden width="20" height="12" viewBox="0 0 22 14" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M0 7h20M14 1l6 6-6 6" /></svg></Link>
            </Magnetic></span>
            <span className={cn("hidden min-[480px]:inline sm:hidden", open && "invisible")}><Link href="/booking" className="btn btn-primary !min-h-11 !px-4 !py-2 text-sm whitespace-nowrap">Book Your Vibe</Link></span>
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
            <nav aria-label="Mobile" className="mx-auto flex min-h-full max-w-xl flex-col justify-center px-7 pb-10 pt-28">
              <ul className="space-y-1.5">
                {MOBILE_MENU.map((m, i) => {
                  const active = (m.match as readonly string[]).includes(path);
                  return (
                    <motion.li key={m.href} initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.07, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
                      <Link ref={i === 0 ? firstLink : undefined} href={m.href} aria-current={active ? "page" : undefined} className="group flex items-start gap-4 border-b border-white/10 py-3.5 aria-[current=page]:text-champagne-soft">
                        <span className="pt-2 font-sans text-sm tracking-widest text-lavender/80" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
                        <span>
                          <span className="display block text-[1.9rem] leading-tight transition-colors group-hover:text-lavender">{m.label}</span>
                          <span className="f-serif mt-0.5 block text-[1rem] text-ivory/65">{m.note}</span>
                        </span>
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>
              {instagram ? (
                <motion.div className="mt-7" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 0.6 }}>
                  <InstagramCta url={instagram} />
                </motion.div>
              ) : null}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
