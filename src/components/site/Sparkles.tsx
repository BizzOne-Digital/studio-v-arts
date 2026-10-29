"use client";
import { useEffect, useRef } from "react";

type P = { x: number; y: number; vy: number; sway: number; ph: number; tw: number; r: number; star: boolean };

/** Gold dust that rises from the bottom of its container and fades as it climbs. Canvas, no layout cost. */
export function Sparkles({ className, count }: { className?: string; count?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0, h = 0, raf = 0;
    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const n = count ?? (window.innerWidth < 640 ? 38 : 80);
    const make = (spread: boolean): P => ({
      x: Math.random() * w,
      y: spread ? h * (0.55 + Math.random() * 0.5) : h + 10 + Math.random() * 60,
      vy: 0.35 + Math.random() * 1.0,
      sway: 0.3 + Math.random() * 1.4,
      ph: Math.random() * Math.PI * 2,
      tw: 0.03 + Math.random() * 0.05,
      r: 0.8 + Math.random() * 2.2,
      star: Math.random() < 0.25,
    });
    const ps: P[] = Array.from({ length: n }, () => make(true));

    const star = (x: number, y: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x, y - r * 2.4); ctx.quadraticCurveTo(x, y, x + r * 2.4, y);
      ctx.quadraticCurveTo(x, y, x, y + r * 2.4); ctx.quadraticCurveTo(x, y, x - r * 2.4, y);
      ctx.quadraticCurveTo(x, y, x, y - r * 2.4); ctx.fill();
    };

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.y -= p.vy;
        p.ph += p.tw;
        const x = p.x + Math.sin(p.ph) * p.sway * 6;
        // brighter near the bottom, fading as it rises
        const alpha = Math.max(0, (0.25 + 0.75 * (p.y / h)) * (0.55 + 0.45 * Math.sin(p.ph * 2)));
        ctx.globalAlpha = alpha * 0.35; ctx.fillStyle = "#e8c96a";
        ctx.beginPath(); ctx.arc(x, p.y, p.r * 3.2, 0, 6.283); ctx.fill();
        ctx.globalAlpha = Math.min(1, alpha * 1.4); ctx.fillStyle = "#fff1c2";
        if (p.star) star(x, p.y, p.r); else { ctx.beginPath(); ctx.arc(x, p.y, p.r, 0, 6.283); ctx.fill(); }
        if (p.y < -20) Object.assign(p, make(false));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [count]);

  return <canvas ref={ref} aria-hidden className={className ?? "absolute inset-0 h-full w-full"} />;
}
