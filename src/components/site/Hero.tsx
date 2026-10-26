"use client";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

function Line({ children, delay, className, ready }: { children: React.ReactNode; delay: number; className?: string; ready: boolean }) {
  return (
    <span className="block overflow-hidden pb-[0.1em] -mb-[0.1em]">
      <motion.span className={`hero-line block ${className ?? ""}`} initial={{ y: "110%" }} animate={ready ? { y: "0%" } : undefined} transition={{ duration: 1.1, delay, ease: EASE }}>
        {children}
      </motion.span>
    </span>
  );
}

export function Hero({ heroSub }: { heroSub: string }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
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
    <section ref={ref} className="relative flex min-h-[100svh] flex-col overflow-hidden bg-[#efe8f7]">
      {/* Studio photograph with the brushstroke baked in */}
      <motion.div className="absolute inset-0" style={reduce ? undefined : { y }}>
        <Image src="/hero.webp" quality={75} alt="A dancer in a flowing mauve skirt mid-pose in a sunlit studio with arched windows" fill priority sizes="100vw" className="object-cover object-[78%_center] lg:object-center" />
      </motion.div>
      {/* keeps text readable on narrow screens where the copy overlaps the picture */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-transparent lg:from-transparent lg:via-transparent" />

      <div className="relative flex w-full flex-1 flex-col justify-center px-6 pb-28 pt-40 sm:px-12 lg:px-[5.2rem]">
        <motion.p {...fade(0.2)} className="f-serif text-[0.8rem] uppercase tracking-[0.34em] text-plum-deep/80">
          Arts &nbsp;·&nbsp; Wellness &nbsp;·&nbsp; Learning
        </motion.p>

        <h1 className="f-head mt-8 text-[clamp(2.6rem,5.7vw,6rem)] leading-[0.93] text-[#3a0f35]">
          <Line ready={ready} delay={0.3}>Your space.</Line>
          <Line ready={ready} delay={0.45}>Your passion.</Line>
          <Line ready={ready} delay={0.6} className="bg-gradient-to-r from-[#7d4a63] to-[#a86d82] bg-clip-text pr-4 italic text-transparent">Your vibe.</Line>
        </h1>

        <motion.p {...fade(1.0)} className="f-serif mt-9 max-w-[30rem] text-[1.2rem] leading-snug text-[#3a0f35] sm:text-[1.35rem]">
          {heroSub}
        </motion.p>

        <motion.div {...fade(1.2)} className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-5">
          <Link href="/experiences" className="f-serif group inline-flex min-h-[3.4rem] items-center gap-4 rounded-full bg-[#3a0f35] px-9 text-[1.2rem] text-white transition-all duration-300 hover:bg-[#5a2250] hover:shadow-[0_14px_34px_-12px_rgba(58,15,53,.6)]">
            Explore Experiences
            <svg aria-hidden width="22" height="14" viewBox="0 0 22 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="transition-transform duration-300 group-hover:translate-x-1"><path d="M0 7h20M14 1l6 6-6 6" /></svg>
          </Link>
          <Link href="/booking?type=rental" className="f-serif border-b border-[#3a0f35]/60 pb-0.5 text-[1.2rem] text-[#3a0f35] transition-colors hover:border-[#3a0f35]">Book the Studio</Link>
        </motion.div>
      </div>

      <motion.p {...fade(1.5)} className="f-serif absolute bottom-9 left-6 hidden sm:block text-[0.78rem] uppercase tracking-[0.3em] text-plum-deep/80 sm:left-12 lg:left-[5.2rem]">
        Dance &nbsp;·&nbsp; Yoga &nbsp;·&nbsp; Workshops &nbsp;·&nbsp; Studio Rentals
      </motion.p>
      <motion.a {...fade(1.6)} href="#intro" aria-label="Scroll to the next section" className="absolute bottom-7 right-6 grid h-14 w-14 place-items-center rounded-full border border-[#3a0f35]/55 text-[#3a0f35] transition-colors hover:bg-[#3a0f35] hover:text-white sm:right-12 lg:right-14">
        <motion.svg aria-hidden width="18" height="22" viewBox="0 0 18 22" fill="none" stroke="currentColor" strokeWidth="1.5" animate={reduce ? undefined : { y: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 2.2 }}><path d="M9 0v20M2 14l7 7 7-7" /></motion.svg>
      </motion.a>
    </section>
  );
}
