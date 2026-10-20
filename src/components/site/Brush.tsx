"use client";
import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";

/** Signature circular brushstroke. Layered strokes + displacement filter give a dry-brush edge. */
export function Brush({
  className, delay = 0.3, duration = 2.2, tone = "plum", loop = false,
}: { className?: string; delay?: number; duration?: number; tone?: "plum" | "lavender" | "champagne" | "ivory"; loop?: boolean }) {
  const id = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const c = { plum: ["#4c294f", "#a77b9e"], lavender: ["#c4aed0", "#e6dbec"], champagne: ["#c9ae82", "#e7d6b8"], ivory: ["#faf7f2", "#e6dbec"] }[tone];
  const d1 = "M 262 38 C 342 30 398 92 392 176 C 386 268 318 352 218 356 C 118 360 38 292 34 196 C 30 108 94 40 190 34 C 232 31 262 40 286 54";
  const d2 = "M 270 52 C 336 50 380 108 372 182 C 364 260 300 332 214 336 C 128 340 58 282 56 200 C 54 126 108 62 190 56";
  const d3 = "M 238 22 C 318 14 410 84 402 180 C 394 282 320 372 214 372";
  const common = { fill: "none", strokeLinecap: "round" as const, initial: { pathLength: reduce ? 1 : 0, opacity: reduce ? 1 : 0.2 } };
  const anim = (extra: number) => ({
    animate: { pathLength: 1, opacity: 1 },
    transition: { duration, delay: delay + extra, ease: [0.65, 0, 0.35, 1] as const },
  });
  return (
    <svg viewBox="0 0 420 400" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c[0]} />
          <stop offset="1" stopColor={c[1]} />
        </linearGradient>
        <filter id={`f${id}`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="9" />
        </filter>
      </defs>
      <g filter={`url(#f${id})`} className={loop && !reduce ? "spin-slow" : undefined} style={{ transformOrigin: "210px 200px" }}>
        <motion.path d={d1} stroke={`url(#g${id})`} strokeWidth="30" {...common} {...anim(0)} />
        <motion.path d={d2} stroke={c[0]} strokeWidth="9" opacity=".55" {...common} {...anim(0.25)} />
        <motion.path d={d3} stroke={c[1]} strokeWidth="5" {...common} {...anim(0.5)} />
      </g>
    </svg>
  );
}
