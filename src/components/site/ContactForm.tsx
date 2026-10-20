"use client";
import { startTransition, useActionState } from "react";
import { submitContact, type ContactState } from "@/app/(site)/actions";
import { cn } from "@/lib/cn";

function Field({ id, label, error, children, hint }: { id: string; label: string; error?: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-plum">{label}</label>
      {children}
      {hint && !error ? <p id={`${id}-hint`} className="mt-1 text-xs text-ink/60">{hint}</p> : null}
      {error ? <p id={`${id}-err`} role="alert" className="mt-1.5 text-sm font-medium text-[#9b1c3a]">{error}</p> : null}
    </div>
  );
}

const input = (bad?: boolean) => cn("w-full min-h-12 rounded-2xl border bg-white px-4 py-3 text-base outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(167,123,158,.45)]", bad ? "border-[#9b1c3a]" : "border-plum/25");

export function ContactForm({ topic }: { topic?: string }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContact, null);
  const f = state?.fields ?? {};
  if (state?.ok) {
    return (
      <div role="status" className="rounded-[2rem] bg-lilac p-10">
        <h3 className="display text-4xl">Message received.</h3>
        <p className="mt-3 text-ink/80">{state.message}</p>
        {state.emailed === false ? <p className="mt-3 text-sm text-ink/60">Your message is saved with our team. A confirmation email was not sent.</p> : null}
      </div>
    );
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => action(fd)); }} noValidate className="space-y-5" aria-describedby={state && !state.ok ? "form-error" : undefined}>
      {state && !state.ok ? <p id="form-error" role="alert" className="rounded-2xl bg-[#f8e4e9] p-4 text-sm font-medium text-[#7a1530]">{state.message}</p> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="c-name" label="Your name" error={f.name}><input id="c-name" name="name" autoComplete="name" required aria-invalid={!!f.name} aria-describedby={f.name ? "c-name-err" : undefined} className={input(!!f.name)} /></Field>
        <Field id="c-email" label="Email" error={f.email}><input id="c-email" name="email" type="email" autoComplete="email" required aria-invalid={!!f.email} aria-describedby={f.email ? "c-email-err" : undefined} className={input(!!f.email)} /></Field>
        <Field id="c-phone" label="Phone (optional)" error={f.phone}><input id="c-phone" name="phone" type="tel" autoComplete="tel" aria-invalid={!!f.phone} className={input(!!f.phone)} /></Field>
        <Field id="c-subject" label="Topic" error={f.subject}><input id="c-subject" name="subject" defaultValue={topic ?? ""} className={input(!!f.subject)} /></Field>
      </div>
      <Field id="c-message" label="How can we help?" error={f.message}>
        <textarea id="c-message" name="message" rows={6} required aria-invalid={!!f.message} aria-describedby={f.message ? "c-message-err" : undefined} className={input(!!f.message)} />
      </Field>
      {/* Honeypot: hidden from people, tempting to bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Leave this empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <button type="submit" disabled={pending} className="btn btn-primary" aria-busy={pending}>{pending ? "Sending..." : "Send message"}</button>
    </form>
  );
}
