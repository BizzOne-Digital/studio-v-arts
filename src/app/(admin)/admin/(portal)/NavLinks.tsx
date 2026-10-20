"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function NavLinks({ items, badges }: { items: { href: string; label: string }[]; badges: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="px-3 pb-3">
      <ul className="space-y-0.5">
        {items.map((i) => {
          const on = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
          const n = badges[i.href];
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={on ? "page" : undefined} className={cn("flex min-h-11 items-center justify-between rounded-xl px-3 text-[0.95rem]", on ? "bg-white/15 font-semibold" : "hover:bg-white/10")}>
                {i.label}
                {n ? <span className="rounded-full bg-champagne px-2 py-0.5 text-xs font-bold text-plum-deep">{n}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
