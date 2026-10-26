import { cn } from "@/lib/cn";

export const igHandle = (url: string) => "@" + (url.replace(/\/+$/, "").split("/").pop() ?? "").split("?")[0];

export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="3" width="18" height="18" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Prominent follow button. Opens Instagram in a new tab. */
export function InstagramCta({ url, className, compact }: { url: string; className?: string; compact?: boolean }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex items-center gap-4 rounded-2xl bg-gradient-to-br from-[#7a4f9e] via-[#b5518f] to-[#e08a6b] text-white shadow-[0_18px_40px_-18px_rgba(150,60,140,.8)] transition-transform duration-300 hover:-translate-y-0.5",
        compact ? "px-4 py-3" : "px-5 py-4",
        className,
      )}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/20"><InstagramIcon className="h-6 w-6" /></span>
      <span className="min-w-0 leading-tight">
        <span className="block text-sm opacity-90">Follow us on Instagram</span>
        <span className="block truncate text-lg font-semibold">{igHandle(url)}</span>
      </span>
      <span aria-hidden className="ml-auto text-xl transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
