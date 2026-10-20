"use client";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { ArtPlate, type Tone } from "./ArtPlate";

/** Uploaded photograph with responsive sizing and a graceful illustrated fallback. */
export function Photo({
  src, alt, tone = "hero", sizes = "(min-width:1024px) 40vw, 90vw", className, priority = false, seed = 0,
}: { src?: string | null; alt: string; tone?: Tone; sizes?: string; className?: string; priority?: boolean; seed?: number }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) {
    return (
      <div className={cn("relative h-full w-full overflow-hidden", className)} aria-hidden>
        <ArtPlate tone={tone} seed={seed} />
      </div>
    );
  }
  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" onError={() => setBad(true)} />
    </div>
  );
}
