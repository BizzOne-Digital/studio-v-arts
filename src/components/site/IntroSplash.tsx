"use client";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Wordmark } from "./Header";
import { Brush } from "./Brush";

type Move = { x: number; y: number };

/**
 * First-visit intro (home page, once per session): the full logo and "Own Your Vibe" appear, then the logo glides up
 * into the header position. The markup is server-rendered and hidden by CSS unless <html data-splash="on">, which an
 * inline script sets before first paint. A CSS fail-safe removes it after a few seconds even if scripts fail.
 */
export function IntroSplash({ name, logoSrc, tagline }: { name: string; logoSrc: string | null; tagline: string }) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"show" | "move" | "done">("show");
  const [move, setMove] = useState<Move>({ x: 0, y: 0 });
  const [base, setBase] = useState(1.2); // scale of the big logo; fitted to the screen width on mount

  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.splash !== "on") {
      const id = requestAnimationFrame(() => setPhase("done"));
      return () => cancelAnimationFrame(id);
    }
    const fit = requestAnimationFrame(() => {
      const natural = document.getElementById("splash-logo")?.offsetWidth || 280;
      setBase(Math.min(2.4, (window.innerWidth - 48) / natural));
    });
    let t1: ReturnType<typeof setTimeout>;
    const go = () => {
      const target = document.getElementById("site-logo")?.getBoundingClientRect();
      const mine = document.getElementById("splash-logo")?.getBoundingClientRect();
      if (target && mine) {
        // the splash logo is drawn 2.4x larger and centred, so compare centres
        setMove({ x: target.left + target.width / 2 - (mine.left + mine.width / 2), y: target.top + target.height / 2 - (mine.top + mine.height / 2) });
      }
      setPhase("move");
    };
    t1 = setTimeout(go, 2300);
    const skip = () => { clearTimeout(t1); go(); };
    window.addEventListener("keydown", skip, { once: true });
    return () => { cancelAnimationFrame(fit); clearTimeout(t1); window.removeEventListener("keydown", skip); };
  }, []);

  const finish = () => {
    try { sessionStorage.setItem("sv-splash", "1"); } catch {}
    document.documentElement.dataset.splash = "off";
    window.dispatchEvent(new Event("splash-done"));
    setPhase("done");
  };

  if (phase === "done") return null;
  const moving = phase === "move";

  return (
    <motion.div
      className="splash-cover fixed inset-0 z-[100] flex cursor-pointer items-center justify-center overflow-hidden bg-white"
      role="presentation"
      onClick={() => !moving && setPhase("move")}
      animate={{ backgroundColor: moving ? "rgba(255,255,255,0)" : "rgba(255,255,255,1)" }}
      transition={{ duration: 0.8, delay: moving ? 0.15 : 0 }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_45%,#f6efdc,#fff_70%)]" style={{ opacity: moving ? 0 : 1, transition: "opacity .8s" }} />
      <motion.div aria-hidden className="pointer-events-none absolute w-[min(34rem,90vw)]" animate={{ opacity: moving ? 0 : 0.55, scale: moving ? 1.08 : 1 }} transition={{ duration: 0.8 }}>
        <Brush tone="lavender" delay={0.2} duration={2.2} />
      </motion.div>

      <div className="relative flex flex-col items-center">
        <motion.div
          id="splash-logo"
          style={{ scale: base }}
          animate={moving ? { x: move.x, y: move.y, scale: 1 } : { x: 0, y: 0, scale: base }}
          transition={{ duration: reduce ? 0.01 : 1.05, ease: [0.76, 0, 0.24, 1] }}
          onAnimationComplete={() => { if (moving) finish(); }}
        >
          <div className="splash-in" style={{ animationDelay: "0.1s" }}><Wordmark logoSrc={logoSrc} name={name} /></div>
        </motion.div>

        <motion.p
          className="splash-in f-head mt-24 text-[clamp(1.6rem,4.5vw,2.6rem)] italic text-[#15120e] sm:mt-28"
          style={{ animationDelay: "0.9s" }}
          animate={{ opacity: moving ? 0 : 1, y: moving ? -10 : 0 }}
          transition={{ duration: 0.5 }}
        >
          {tagline}.
        </motion.p>
      </div>
    </motion.div>
  );
}
