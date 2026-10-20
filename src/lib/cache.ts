import "server-only";
import { unstable_cache } from "next/cache";

/**
 * Caches a data loader across requests and tags it so admin edits can expire it instantly (updateTag).
 * Outside the Next.js server (seed/test scripts) it just calls the loader.
 */
export function cached<A extends unknown[], R>(key: string, tags: string[], fn: (...a: A) => Promise<R>, revalidate = 300) {
  if (!process.env.NEXT_RUNTIME) return fn;
  return unstable_cache(fn, [key], { tags, revalidate });
}
