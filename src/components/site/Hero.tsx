"use client";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

const ACTIVITIES = [
  { label: "Dance", bg: "#f8ded3", fg: "#8a5a2b", icon: <><circle cx="12" cy="4.5" r="2" /><path d="M12 7v6m0 0-3 8m3-8 3 8M6 10l6-2 6 2" /></> },
  { label: "Yoga", bg: "#dcebd0", fg: "#4d7a3a", icon: <><path d="M12 20c-3.5-2-5.5-4.8-5.5-8 2.2 0 4.2 1 5.5 3 1.3-2 3.3-3 5.5-3 0 3.2-2 6-5.5 8Z" /><path d="M12 15V5" /></> },
  { label: "Arts", bg: "#c3e4ee", fg: "#1f6f8b", icon: <><path d="M12 22a10 10 0 1 1 10-10c0 2.5-2 3-3.5 3H16a2 2 0 0 0-1.5 3.3c.6.7.5 1.7-.1 2.2A5 5 0 0 1 12 22Z" /><circle cx="7.5" cy="11" r=".6" /><circle cx="11" cy="7" r=".6" /><circle cx="16" cy="8" r=".6" /></> },
  { label: "Chess", bg: "#f4e4d1", fg: "#7a4a22", icon: <><path d="M8 21h9M9 21l1-6-3-2 4-8 3 1c3 0 5 2.5 5 6l-2 9" /><circle cx="12.5" cy="8.5" r=".6" /></> },
  { label: "& More", bg: "#ded4f3", fg: "#5a3fa0", icon: <><path d="m22 10-10-5L2 10l10 5 10-5Z" /><path d="M6 12v5c3 2 9 2 12 0v-5" /></> },
];

const EASE = [0.16, 1, 0.3, 1] as const;

function Line({ children, delay, className, ready }: { children: React.ReactNode; delay: number; className?: string; ready: boolean }) {
  return (
    <span className="block overflow-hidden pb-[0.12em] -mb-[0.12em]">
      <motion.span className={`hero-line block ${className ?? ""}`} initial={{ y: "110%" }} animate={ready ? { y: "0%" } : undefined} transition={{ duration: 1.1, delay, ease: EASE }}>
        {children}
      </motion.span>
    </span>
  );
}

/**
 * Hero banner: a wide collage photograph with the logo, headline, activity line and button laid over its cream left side.
 * On desktop the text scales with the banner (vw units) so it always sits exactly where it does in the design.
 * On phones the text sits above the photograph instead of on top of it.
 */
export function Hero() {
  // The intro splash covers the hero on a first visit, so the entrance animation waits for it.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const on = () => setReady(true);
    if (document.documentElement.dataset.splash !== "on") {
      const id = requestAnimationFrame(on);
      return () => cancelAnimationFrame(id);
    }
    window.addEventListener("splash-done", on, { once: true });
    return () => window.removeEventListener("splash-done", on);
  }, []);
  const fade = (d: number) => ({ initial: { opacity: 0, y: 16 }, animate: ready ? { opacity: 1, y: 0 } : undefined, transition: { delay: d, duration: 0.9, ease: EASE } });

  return (
    <section className="relative bg-[#fbf6ea] pt-[5.4rem] lg:pt-[5.2rem]">
      <div className="flex flex-col lg:relative lg:block lg:aspect-[1918/820]">
        {/* text sits inside the arch on the left of the photograph */}
        <div className="relative z-10 order-1 px-6 pb-8 pt-6 sm:px-12 lg:absolute lg:inset-y-0 lg:left-[4.8%] lg:flex lg:w-[25%] lg:flex-col lg:justify-center lg:px-0 lg:pb-0 lg:pt-[1%]">
          <motion.div {...fade(0.2)}>
            <Image src="/logo.webp" alt="Studio VM. Vibe. Move. Repeat." width={1000} height={438} priority className="h-auto w-[11rem] lg:w-[min(16vw,21rem)]" />
          </motion.div>

          <h1 className="f-head mt-5 text-[clamp(2.6rem,11vw,4.4rem)] leading-[0.98] text-[#15120e] lg:mt-[4%] lg:text-[min(3.95vw,5.4rem)] lg:leading-[0.98]" aria-label="Your space. Your passion. Your vibe.">
            <Line ready={ready} delay={0.3}>Your space.</Line>
            <Line ready={ready} delay={0.45}>Your passion.</Line>
            <Line ready={ready} delay={0.6} className="gold-text pr-4 italic">Your vibe.</Line>
          </h1>

          <motion.ul {...fade(1.0)} className="mt-6 flex flex-wrap gap-x-1 gap-y-3 lg:mt-[5%] lg:flex-nowrap lg:gap-[0.5vw]" aria-label="Dance, Yoga, Arts, Chess and more">
            {ACTIVITIES.map((x) => (
              <li key={x.label} className="flex w-[3.9rem] flex-col items-center gap-1.5 lg:w-[4.4vw]">
                <span className="grid h-12 w-12 place-items-center rounded-full lg:h-[3.7vw] lg:w-[3.7vw]" style={{ background: x.bg, color: x.fg }}>
                  <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 lg:h-[2.1vw] lg:w-[2.1vw]">{x.icon}</svg>
                </span>
                <span className="font-sans text-[0.58rem] font-medium uppercase tracking-[0.1em] text-[#15120e]/80 lg:text-[min(0.72vw,0.9rem)]">{x.label}</span>
              </li>
            ))}
          </motion.ul>

          <motion.div {...fade(1.2)} className="mt-6 lg:mt-[5%]">
            <Link href="/booking" className="f-serif group inline-flex min-h-[3.2rem] items-center gap-3 rounded-full bg-[linear-gradient(95deg,#7a4a22_0%,#c4955a_52%,#8a5a2b_100%)] px-8 text-[1.15rem] text-[#fff7e6] shadow-[0_14px_30px_-14px_rgba(122,74,34,.8)] transition-all duration-300 hover:brightness-110 hover:shadow-[0_18px_36px_-14px_rgba(122,74,34,.9)] lg:min-h-0 lg:px-[2vw] lg:py-[0.8vw] lg:text-[min(1.2vw,1.5rem)]">
              Book Your Vibe
              <svg aria-hidden width="22" height="14" viewBox="0 0 22 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="transition-transform duration-300 group-hover:translate-x-1"><path d="M0 7h20M14 1l6 6-6 6" /></svg>
            </Link>
          </motion.div>
        </div>

        {/* photograph */}
        <div className="relative order-2 h-[19rem] w-full sm:h-[24rem] lg:absolute lg:inset-0 lg:h-auto">
          <Image
            src="/hero-banner.webp" alt="Dance, yoga, children's art, chess and celebration classes in a bright studio" fill priority sizes="100vw" quality={80}
            className="object-cover object-[62%_center] lg:object-center"
          />
          <div aria-hidden className="absolute inset-x-0 top-0 h-[14%] bg-gradient-to-b from-[#fbf6ea] to-transparent" />
        </div>
      </div>
    </section>
  );
}
