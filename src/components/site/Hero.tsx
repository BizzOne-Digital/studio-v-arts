"use client";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

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
      <div className="flex flex-col lg:relative lg:block lg:aspect-[2170/725]">
        {/* text */}
        <div className="relative z-10 order-1 px-6 pb-8 pt-6 sm:px-12 lg:absolute lg:inset-y-0 lg:left-0 lg:w-[40%] lg:px-0 lg:pb-0 lg:pl-[8%] lg:pt-[1.2%]">
          <motion.div {...fade(0.2)}>
            <Image src="/logo.webp" alt="Studio VM. Vibe. Move. Repeat." width={1000} height={438} priority className="h-auto w-[11rem] lg:w-[min(17vw,22rem)]" />
          </motion.div>

          <h1 className="f-head mt-5 text-[clamp(2.6rem,11vw,4.4rem)] leading-[0.95] text-[#15120e] lg:mt-[3%] lg:text-[min(4.55vw,6rem)] lg:leading-[0.98]" aria-label="Your space. Your passion. Your vibe.">
            <Line ready={ready} delay={0.3}>Your space.</Line>
            <Line ready={ready} delay={0.45}>Your passion.</Line>
            <Line ready={ready} delay={0.6} className="gold-text pr-4 italic">Your vibe.</Line>
          </h1>

          <motion.p {...fade(1.0)} className="mt-5 font-sans text-[0.75rem] font-medium uppercase tracking-[0.24em] text-[#15120e] lg:mt-[3%] lg:text-[min(0.95vw,1.25rem)]">
            Arts &nbsp;·&nbsp; Wellness &nbsp;·&nbsp; Learning &nbsp;·&nbsp; Dance
          </motion.p>

          <motion.div {...fade(1.2)} className="mt-6 lg:mt-[3.5%]">
            <Link href="/booking" className="f-serif group inline-flex min-h-[3.2rem] items-center gap-3 rounded-full bg-[linear-gradient(95deg,#7a4a22_0%,#c4955a_52%,#8a5a2b_100%)] px-8 text-[1.15rem] text-[#fff7e6] shadow-[0_14px_30px_-14px_rgba(122,74,34,.8)] transition-all duration-300 hover:brightness-110 hover:shadow-[0_18px_36px_-14px_rgba(122,74,34,.9)] lg:min-h-0 lg:px-[2vw] lg:py-[0.8vw] lg:text-[min(1.25vw,1.5rem)]">
              Book Your Vibe
              <svg aria-hidden width="22" height="14" viewBox="0 0 22 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="transition-transform duration-300 group-hover:translate-x-1"><path d="M0 7h20M14 1l6 6-6 6" /></svg>
            </Link>
          </motion.div>
        </div>

        {/* photograph */}
        <div className="relative order-2 h-[19rem] w-full sm:h-[24rem] lg:absolute lg:inset-0 lg:h-auto">
          <Image
            src="/hero-banner.webp" alt="Dance, yoga, children's art and chess classes in a bright studio" fill priority sizes="100vw" quality={80}
            className="object-cover object-[66%_center] lg:object-center"
          />
          <div aria-hidden className="absolute inset-x-0 top-0 h-[22%] bg-gradient-to-b from-[#fbf6ea] to-transparent" />
        </div>
      </div>
    </section>
  );
}
