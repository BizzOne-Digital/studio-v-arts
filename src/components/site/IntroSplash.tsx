"use client";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Wordmark } from "./Header";
import { Sparkles } from "./Sparkles";

type Move = { x: number; y: number };

/**
 * First-visit intro (home page, once per session): a dark screen with gold sparkles rising from the bottom, the logo
 * and the tagline. Then the logo glides up into the header and the screen lifts away. The markup is server-rendered and
 * hidden by CSS unless <html data-splash="on">, which an inline script sets before first paint. A CSS fail-safe removes
 * it after a few seconds even if scripts fail.
 */
export function IntroSplash({ name, logoSrc }: { name: string; logoSrc: string | null }) {
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
        // the splash logo is drawn larger and centred, so compare centres
        setMove({ x: target.left + target.width / 2 - (mine.left + mine.width / 2), y: target.top + target.height / 2 - (mine.top + mine.height / 2) });
      }
      setPhase("move");
    };
    t1 = setTimeout(go, 3200);
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
      className="splash-cover fixed inset-0 z-[100] flex cursor-pointer items-center justify-center overflow-hidden"
      role="presentation"
      onClick={() => !moving && setPhase("move")}
      initial={false}
      animate={{ backgroundColor: moving ? "rgba(13,11,9,0)" : "rgba(13,11,9,1)" }}
      transition={{ duration: 0.9, delay: moving ? 0.2 : 0 }}
    >
      {/* soft gold glows */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(40% 35% at 78% 14%, rgba(201,169,97,.22), transparent 70%), radial-gradient(45% 40% at 12% 88%, rgba(201,169,97,.2), transparent 70%), radial-gradient(35% 30% at 50% 48%, rgba(232,201,106,.14), transparent 72%)" }}
        animate={{ opacity: moving ? 0 : 1 }}
        transition={{ duration: 0.8 }}
      />
      {/* sparkles rising from the bottom */}
      <motion.div aria-hidden className="pointer-events-none absolute inset-0" animate={{ opacity: moving ? 0 : 1 }} transition={{ duration: 0.8 }}>
        <Sparkles />
      </motion.div>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#c9a961]/25 to-transparent" style={{ opacity: moving ? 0 : 1, transition: "opacity .8s" }} />

      <div className="relative flex flex-col items-center">
        <motion.div
          id="splash-logo"
          style={{ scale: base }}
          animate={moving ? { x: move.x, y: move.y, scale: 1 } : { x: 0, y: 0, scale: base }}
          transition={{ duration: reduce ? 0.01 : 1.1, ease: [0.76, 0, 0.24, 1] }}
          onAnimationComplete={() => { if (moving) finish(); }}
        >
          <div className="splash-in relative" style={{ animationDelay: "0.2s" }}>
            {/* ivory artwork on the dark screen, crossfading to the dark artwork as it lands on the light header */}
            <Wordmark light={!logoSrc} logoSrc={logoSrc} name={name} />
            {!logoSrc && <motion.div aria-hidden className="absolute inset-0" initial={false} animate={{ opacity: moving ? 1 : 0 }} transition={{ duration: 0.9 }}><Wordmark name="" /></motion.div>}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
