"use client";
import { MotionConfig } from "motion/react";

/** Honours the visitor's reduced-motion setting for every animation below it. */
export function ClientMotion({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
