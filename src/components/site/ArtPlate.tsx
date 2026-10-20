import { useId } from "react";
import { cn } from "@/lib/cn";

export type Tone = "move" | "create" | "learn" | "connect" | "rental" | "hero" | "about";

const PALETTE: Record<Tone, [string, string, string]> = {
  move: ["#4c294f", "#a77b9e", "#e7d6b8"],
  create: ["#c4aed0", "#faf7f2", "#c9ae82"],
  learn: ["#e9dfd2", "#a77b9e", "#4c294f"],
  connect: ["#a77b9e", "#4c294f", "#e7d6b8"],
  rental: ["#2f1a32", "#7a4f73", "#e7d6b8"],
  hero: ["#c4aed0", "#a77b9e", "#faf7f2"],
  about: ["#e6dbec", "#c4aed0", "#4c294f"],
};

/** Illustrated stand-in used wherever no photograph has been uploaded. Never presented as studio photography. */
export function ArtPlate({ tone = "hero", className, seed = 0 }: { tone?: Tone; className?: string; seed?: number }) {
  const id = useId().replace(/:/g, "");
  const [a, b, c] = PALETTE[tone];
  return (
    <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" className={cn("h-full w-full", className)} style={{ filter: `hue-rotate(${((seed * 37) % 50) - 25}deg) saturate(${1 + ((seed % 3) - 1) * 0.12})`, transform: seed % 2 ? "scaleX(-1)" : undefined }} aria-hidden focusable="false">
      <defs>
        <linearGradient id={`bg${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
        <radialGradient id={`glow${id}`} cx=".3" cy=".25" r=".7">
          <stop offset="0" stopColor={c} stopOpacity=".85" />
          <stop offset="1" stopColor={c} stopOpacity="0" />
        </radialGradient>
        <filter id={`soft${id}`}><feGaussianBlur stdDeviation="14" /></filter>
      </defs>
      <rect width="400" height="500" fill={`url(#bg${id})`} />
      <rect width="400" height="500" fill={`url(#glow${id})`} />
      {tone === "move" || tone === "hero" ? (
        <g fill="none" strokeLinecap="round">
          <circle cx="290" cy="130" r="64" fill={c} opacity=".55" filter={`url(#soft${id})`} />
          <path d="M-20 420 C 90 300 140 380 200 250 S 300 120 430 60" stroke={c} strokeWidth="3" opacity=".9" />
          <path d="M-20 450 C 100 330 150 410 215 280 S 320 150 430 100" stroke="#faf7f2" strokeWidth="1.5" opacity=".7" />
          <path d="M-20 480 C 110 360 170 440 230 310 S 340 190 430 140" stroke={c} strokeWidth="9" opacity=".35" />
          <path d="M120 500 C 150 380 190 330 250 300 C 210 360 220 420 190 500" fill="#faf7f2" opacity=".14" />
          <circle cx="250" cy="228" r="16" fill="#faf7f2" opacity=".85" />
        </g>
      ) : null}
      {tone === "create" ? (
        <g>
          <ellipse cx="130" cy="170" rx="110" ry="92" fill="#a77b9e" opacity=".55" className="blob" />
          <ellipse cx="270" cy="300" rx="120" ry="100" fill={c} opacity=".5" className="blob" />
          <path d="M40 420 C 120 360 180 440 260 380 S 360 330 380 360" fill="none" stroke="#4c294f" strokeWidth="14" strokeLinecap="round" opacity=".75" />
          {[[80, 80, 8], [330, 90, 12], [310, 440, 7], [60, 330, 10], [200, 60, 5]].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="#4c294f" opacity=".6" />
          ))}
        </g>
      ) : null}
      {tone === "learn" ? (
        <g>
          {Array.from({ length: 6 }).map((_, r) =>
            Array.from({ length: 5 }).map((_, k) =>
              (r + k) % 2 ? <rect key={`${r}-${k}`} x={k * 80} y={r * 84 + 10} width="80" height="84" fill={c} opacity=".18" /> : null,
            ),
          )}
          <circle cx="200" cy="260" r="86" fill={b} opacity=".85" />
          <path d="M165 330 h70 l-10 -40 c 20 -12 28 -30 20 -52 c -8 -20 -50 -20 -60 0 c -8 22 0 40 20 52 z" fill="#faf7f2" />
        </g>
      ) : null}
      {tone === "connect" ? (
        <g fill="none" stroke={c} strokeWidth="2.5">
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} cx={130 + i * 46} cy={250 + (i % 2 ? 36 : -36)} r="96" opacity={0.85 - i * 0.12} />
          ))}
          <circle cx="200" cy="250" r="12" fill={c} stroke="none" />
        </g>
      ) : null}
      {tone === "rental" ? (
        <g>
          <path d="M90 470 V 190 a 110 110 0 0 1 220 0 V 470 z" fill="#faf7f2" opacity=".12" />
          <path d="M120 470 V 200 a 80 80 0 0 1 160 0 V 470 z" fill={c} opacity=".3" />
          <path d="M200 120 L 80 500 M200 120 L 200 500 M200 120 L 320 500" stroke={c} strokeWidth="1.5" opacity=".5" />
          <rect x="0" y="440" width="400" height="60" fill="#faf7f2" opacity=".1" />
        </g>
      ) : null}
      {tone === "about" ? (
        <g fill="none" stroke={c} strokeLinecap="round">
          <circle cx="200" cy="230" r="120" strokeWidth="26" opacity=".7" />
          <circle cx="200" cy="230" r="70" stroke={b} strokeWidth="4" opacity=".8" />
          <path d="M60 420 C 160 360 250 470 350 400" strokeWidth="3" />
        </g>
      ) : null}
    </svg>
  );
}
