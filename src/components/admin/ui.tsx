"use client";
import Image from "next/image";
import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type FormState = { ok: boolean; message: string } | null;
type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

/** Form wrapper that shows a visible, announced save confirmation or error. */
export function AdminForm({ action, children, submitLabel = "Save", className, resetOnSuccess, danger }: {
  action: Action; children: ReactNode; submitLabel?: string; className?: string; resetOnSuccess?: boolean; danger?: boolean;
}) {
  const [state, act, pending] = useActionState<FormState, FormData>(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok && resetOnSuccess) ref.current?.reset(); }, [state, resetOnSuccess]);
  return (
    <form ref={ref} onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => act(fd)); }} className={cn("space-y-4", className)}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} aria-busy={pending} className={cn("min-h-11 rounded-full px-6 text-sm font-semibold text-white disabled:opacity-60", danger ? "bg-[#9b1c3a]" : "bg-plum hover:bg-mauve-deep")}>
          {pending ? "Saving..." : submitLabel}
        </button>
        <p role="status" aria-live="polite" className={cn("text-sm font-medium", state?.ok ? "text-[#1d6b3a]" : "text-[#9b1c3a]")}>{state?.message}</p>
      </div>
    </form>
  );
}

/** One-click action button (status changes, reorder, delete) with optional confirm. */
export function ActionButton({ action, children, confirm, className, title }: {
  action: Action; children: ReactNode; confirm?: string; className?: string; title?: string;
}) {
  const [state, act, pending] = useActionState<FormState, FormData>(action, null);
  return (
    <form action={act} onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }} className="inline-flex flex-col">
      <button type="submit" disabled={pending} title={title} className={cn("min-h-10 rounded-full border border-plum/30 px-4 text-sm font-semibold text-plum hover:bg-lilac disabled:opacity-50", className)}>{pending ? "..." : children}</button>
      {state ? <span role={state.ok ? "status" : "alert"} className={cn("mt-1 max-w-56 text-xs", state.ok ? "text-[#1d6b3a]" : "text-[#9b1c3a]")}>{state.message}</span> : null}
    </form>
  );
}

export function Field({ label, children, hint, wide }: { label: string; children: ReactNode; hint?: string; wide?: boolean }) {
  return (
    <label className={cn("block", wide && "sm:col-span-2")}>
      <span className="mb-1 block text-sm font-semibold text-plum">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-ink/60">{hint}</span> : null}
    </label>
  );
}

export function Check({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex min-h-11 items-start gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 h-5 w-5 accent-[#15120e]" />
      <span><span className="font-medium">{label}</span>{hint ? <span className="block text-xs text-ink/60">{hint}</span> : null}</span>
    </label>
  );
}

/**
 * Image picker. Uploads straight to /api/upload (stored in MongoDB, so it survives serverless deploys) and keeps
 * the returned URL in a hidden input named `name`. An empty value means "no image".
 */
export function ImageField({ name, current, folder, label = "Image" }: { name: string; current?: string | null; folder: "services" | "team" | "gallery" | "pages" | "misc"; label?: string }) {
  const [url, setUrl] = useState<string>(current ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function onFile(f: File | undefined) {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) return setMsg({ ok: false, text: "Image is larger than 8 MB." });
    setBusy(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.set("file", f); fd.set("folder", folder);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.success) { setUrl(j.url); setMsg({ ok: true, text: "Image uploaded. Save the form to keep it." }); }
      else setMsg({ ok: false, text: j.error ?? "Upload failed. Please try again." });
    } catch {
      setMsg({ ok: false, text: "Upload failed. Check your connection and try again." });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="sm:col-span-2">
      <span className="mb-1 block text-sm font-semibold text-plum">{label}</span>
      <input type="hidden" name={name} value={url} />
      <div className="flex flex-wrap items-center gap-4">
        {url ? <Image src={url} alt="" width={96} height={96} sizes="96px" className="h-24 w-24 rounded-xl object-cover" /> : <span className="grid h-24 w-24 place-items-center rounded-xl bg-sand text-xs text-ink/50">No image</span>}
        <div className="flex flex-wrap items-center gap-2">
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" id={`${name}-file`} onChange={(e) => onFile(e.target.files?.[0])} />
          <label htmlFor={`${name}-file`} className={cn("inline-flex min-h-10 cursor-pointer items-center rounded-full border border-plum/30 px-4 text-sm font-semibold text-plum hover:bg-lilac focus-within:outline", busy && "pointer-events-none opacity-60")}>
            {busy ? "Uploading..." : url ? "Replace" : "Upload image"}
          </label>
          {url ? <button type="button" onClick={() => { setUrl(""); setMsg(null); }} className="min-h-10 rounded-full px-4 text-sm font-semibold text-[#9b1c3a] hover:bg-[#f8e4e9]">Remove</button> : null}
        </div>
      </div>
      <p role="status" aria-live="polite" className={cn("mt-1 text-xs", msg ? (msg.ok ? "text-[#1d6b3a]" : "font-medium text-[#9b1c3a]") : "text-ink/60")}>{msg?.text ?? "JPG, PNG, WebP or GIF, up to 8 MB."}</p>
    </div>
  );
}
