"use client";
import {
  motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform,
  type HTMLMotionProps,
} from "motion/react";
import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Fade + rise on scroll. Content stays visible without JS (see noscript rule in layout). */
export function Reveal({
  children, delay = 0, y = 32, className, as = "div", ...rest
}: { children: ReactNode; delay?: number; y?: number; className?: string; as?: "div" | "li" | "section" | "p" } & Omit<HTMLMotionProps<"div">, "children">) {
  const Tag = motion[as] as any;
  return (
    <Tag
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.9, delay, ease: EASE }}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Word-by-word masked headline reveal. Screen readers get the full text. */
export function SplitText({
  text, as: Tag = "h2", className, delay = 0, italicWords = [], stagger = 0.07, immediate = false,
}: {
  text: string; as?: ElementType; className?: string; delay?: number; italicWords?: string[]; stagger?: number; immediate?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const show = immediate || inView;
  const words = text.split(" ");
  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden align-bottom pb-[0.12em] -mb-[0.12em] pr-[0.06em]">
          <motion.span
            className={cn("inline-block", italicWords.includes(w.replace(/[.,]/g, "")) && "display-i text-mauve-deep")}
            initial={{ y: "115%", rotate: 4 }}
            animate={show ? { y: "0%", rotate: 0 } : undefined}
            transition={{ duration: 1, delay: delay + i * stagger, ease: EASE }}
            style={{ transformOrigin: "left bottom" }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/** Wipes an image/art block open with a clip-path. */
export function Mask({ children, className, delay = 0, from = "bottom" }: { children: ReactNode; className?: string; delay?: number; from?: "bottom" | "left" | "center" }) {
  const clip = {
    bottom: ["inset(100% 0% 0% 0%)", "inset(0% 0% 0% 0%)"],
    left: ["inset(0% 100% 0% 0%)", "inset(0% 0% 0% 0%)"],
    center: ["inset(50% 50% 50% 50%)", "inset(0% 0% 0% 0%)"],
  }[from];
  return (
    <motion.div
      className={className}
      initial={{ clipPath: clip[0] }}
      whileInView={{ clipPath: clip[1] }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 1.3, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Gentle scroll parallax. Disabled for reduced motion. */
export function Parallax({ children, speed = 40, className }: { children: ReactNode; speed?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed]);
  return (
    <div ref={ref} className={className}>
      <motion.div style={reduce ? undefined : { y }} className="h-full w-full">
        {children}
      </motion.div>
    </div>
  );
}

/** Button/anchor that leans toward the pointer. Fine pointers only. */
export function Magnetic({ children, strength = 0.35, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 16 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 16 });
  const fine = () => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
  return (
    <motion.div
      ref={ref}
      className={cn("inline-block", className)}
      style={{ x, y }}
      onPointerMove={(e) => {
        if (reduce || !fine() || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => { x.set(0); y.set(0); }}
    >
      {children}
    </motion.div>
  );
}

/** 3D tilt that follows the pointer. Desktop only; static otherwise. */
export function Tilt({ children, className, max = 7 }: { children: ReactNode; className?: string; max?: number }) {
  const reduce = useReducedMotion();
  const rx = useSpring(useMotionValue(0), { stiffness: 180, damping: 18 });
  const ry = useSpring(useMotionValue(0), { stiffness: 180, damping: 18 });
  return (
    <motion.div
      className={className}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        ry.set(((e.clientX - r.left) / r.width - 0.5) * max * 2);
        rx.set(-((e.clientY - r.top) / r.height - 0.5) * max * 2);
      }}
      onPointerLeave={() => { rx.set(0); ry.set(0); }}
    >
      {children}
    </motion.div>
  );
}

/** Slow typographic marquee with a visible pause control. */
export function Marquee({ items, className }: { items: string[]; className?: string }) {
  const [paused, setPaused] = useState(false);
  const row = [...items, ...items];
  return (
    <div className={cn("marquee relative flex items-center gap-4 overflow-hidden", className)} data-paused={paused}>
      <div className="min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]">
        <div className="marquee-track flex gap-10 whitespace-nowrap" aria-hidden>
          {[0, 1].map((k) => (
            <div key={k} className="flex gap-10">
              {items.map((t, i) => (
                <span key={`${k}-${i}`} className="display text-5xl sm:text-7xl flex items-center gap-10">
                  {t}
                  <span className="inline-block h-3 w-3 rounded-full bg-champagne" />
                </span>
              ))}
            </div>
          ))}
        </div>
        <p className="sr-only">{row.slice(0, items.length).join(", ")}</p>
      </div>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        className="shrink-0 mr-4 grid h-11 w-11 place-items-center rounded-full border border-current/30 text-sm hover:bg-white/10"
        aria-label={paused ? "Play scrolling text" : "Pause scrolling text"}
      >
        <span aria-hidden>{paused ? "▶" : "❚❚"}</span>
      </button>
    </div>
  );
}

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28 });
  return <motion.div aria-hidden className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-lavender via-mauve to-plum" style={{ scaleX }} />;
}

/** Soft light that trails the pointer. Desktop fine pointers only; hidden for reduced motion. */
export function CursorGlow() {
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(-200), { stiffness: 90, damping: 18 });
  const y = useSpring(useMotionValue(-200), { stiffness: 90, damping: 18 });
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (reduce || !window.matchMedia("(pointer: fine) and (min-width: 1024px)").matches) return;
    const show = requestAnimationFrame(() => setOn(true));
    const move = (e: PointerEvent) => { x.set(e.clientX - 160); y.set(e.clientY - 160); };
    window.addEventListener("pointermove", move, { passive: true });
    return () => { cancelAnimationFrame(show); window.removeEventListener("pointermove", move); };
  }, [reduce, x, y]);
  if (!on) return null;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[5] h-80 w-80 rounded-full opacity-60 mix-blend-multiply blur-3xl"
      style={{ x, y, background: "radial-gradient(circle, rgba(196,174,208,.75), rgba(196,174,208,0) 65%)" }}
    />
  );
}

/** Counts up once when scrolled into view. Only used for values that come from real data. */
export function CountUp({ to, className }: { to: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? to : 0);
  useEffect(() => {
    if (!inView || reduce) {
      const id = requestAnimationFrame(() => setN(to));
      return () => cancelAnimationFrame(id);
    }
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1400);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, reduce]);
  return <span ref={ref} className={className}>{n}</span>;
}
