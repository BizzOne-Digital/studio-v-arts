"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { NavLinks } from "./NavLinks";

type Item = { href: string; label: string };

/** Desktop: fixed sidebar. Phone: top bar with a slide-in drawer that closes on link tap, backdrop tap, Escape or the close button. */
export function AdminNav({ items, badges, email, logout }: { items: Item[]; badges: Record<string, number>; email: string; logout: () => Promise<void> }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    first.current?.querySelector<HTMLElement>("a,button")?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); toggle.current?.focus(); } };
    window.addEventListener("keydown", esc);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", esc); };
  }, [open]);

  const panel = (
    <div ref={first} className="flex h-full flex-col overflow-y-auto">
      <div className="hidden p-5 lg:block">
        <Link href="/admin" className="display text-2xl">Studio VM <span className="font-sans text-sm text-lavender">admin</span></Link>
        <Link href="/" target="_blank" className="mt-2 block text-sm text-lavender underline">View website</Link>
      </div>
      <div className="flex items-center justify-between p-5 lg:hidden">
        <span className="display text-2xl">Menu</span>
        <button type="button" onClick={() => { setOpen(false); toggle.current?.focus(); }} aria-label="Close menu" className="grid h-11 w-11 place-items-center rounded-full border border-lavender/40 text-2xl">&times;</button>
      </div>
      <NavLinks items={items} badges={badges} />
      <div className="mt-auto p-5 text-sm text-lavender">
        <Link href="/" target="_blank" className="mb-3 block underline lg:hidden">View website</Link>
        <p className="break-all">{email}</p>
        <form action={logout}><button className="mt-3 min-h-11 rounded-full border border-lavender/50 px-5 font-semibold hover:bg-white/10">Sign out</button></form>
      </div>
    </div>
  );

  return (
    <>
      {/* phone top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-plum-deep px-4 py-2.5 text-ivory lg:hidden">
        <Link href="/admin" className="display text-xl">Studio VM <span className="font-sans text-xs text-lavender">admin</span></Link>
        <button ref={toggle} type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="admin-drawer" aria-label="Open menu" className="grid h-11 w-11 place-items-center rounded-full border border-lavender/40">
          <span aria-hidden className="block h-3.5 w-5 border-y-2 border-current" />
        </button>
      </div>

      {/* phone drawer */}
      <div className={cn("fixed inset-0 z-40 lg:hidden", open ? "visible" : "invisible delay-300")} aria-hidden={!open}>
        <div onClick={() => setOpen(false)} className={cn("absolute inset-0 bg-black/50 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")} />
        <aside id="admin-drawer" role="dialog" aria-modal="true" aria-label="Admin menu" className={cn("on-dark absolute inset-y-0 left-0 w-[min(20rem,86vw)] bg-plum-deep text-ivory shadow-2xl transition-transform duration-300", open ? "translate-x-0" : "-translate-x-full")}>
          {open ? panel : null}
        </aside>
      </div>

      {/* desktop sidebar */}
      <aside className="on-dark sticky top-0 hidden h-svh bg-plum-deep text-ivory lg:block">{panel}</aside>
    </>
  );
}
