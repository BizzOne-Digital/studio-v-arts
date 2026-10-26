"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { quoteAction, submitClassBooking, submitRentalBooking, type BookingResult, type FieldErrors } from "@/app/(site)/actions";
import { cn } from "@/lib/cn";
import { money } from "@/lib/format";
import { fmtDate, fmtRange, fmtTime, zonedToUtc } from "@/lib/time";

export type SessionView = {
  id: string; title: string; startsAt: string; endsAt: string; instructor: string; priceCents: number | null;
  seatsLeft: number; audience: string; serviceSlug: string;
};
export type RentalRules = { minHours: number; maxHours: number; stepMin: number; maxSlots: number; maxAttendees: number; leadHours: number };
type Slot = { date: string; start: string; minutes: number };
type Quote = { ok: true; subtotalCents: number; taxCents: number; totalCents: number; taxLabel: string; label: string; hours: number; offerTitle: string | null } | { ok: false; error: string };

const input = (bad?: boolean) => cn("w-full min-h-12 rounded-2xl border bg-white px-4 py-3 text-base outline-none focus:shadow-[0_0_0_3px_rgba(167,123,158,.45)]", bad ? "border-[#9b1c3a]" : "border-plum/25");

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-plum">{label}</label>
      {children}
      {hint && !error ? <p className="mt-1 text-xs text-ink/60">{hint}</p> : null}
      {error ? <p id={`${id}-err`} role="alert" className="mt-1.5 text-sm font-medium text-[#9b1c3a]">{error}</p> : null}
    </div>
  );
}

export function BookingFlow(p: {
  live: boolean; tz: string; terms: string; cancellation: string; taxNote: string; today: string;
  sessions: SessionView[]; initialMode: "class" | "rental"; initialSession?: string; serviceSlug?: string; rules: RentalRules; emailOn: boolean;
}) {
  const [mode, setMode] = useState<"class" | "rental">(p.initialMode);
  const [step, setStep] = useState(0);
  const [sessionId, setSessionId] = useState(p.initialSession ?? "");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [d, setD] = useState({ name: "", email: "", phone: "", notes: "", attendees: 1, activity: "" });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Extract<BookingResult, { ok: true }> | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  const list = useMemo(() => (p.serviceSlug ? p.sessions.filter((s) => s.serviceSlug === p.serviceSlug) : p.sessions), [p.sessions, p.serviceSlug]);
  const chosen = p.sessions.find((s) => s.id === sessionId);

  useEffect(() => { if (step > 0 || done) heading.current?.focus(); }, [step, done]);

  const steps = mode === "class" ? ["Choose class", "Your details", "Review"] : ["Pick times", "Your details", "Review"];
  const set = (k: keyof typeof d, v: string | number) => setD((o) => ({ ...o, [k]: v }));

  const validateDetails = () => {
    const e: FieldErrors = {};
    if (d.name.trim().length < 2) e.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(d.email)) e.email = "Enter a valid email address.";
    if (d.phone.trim().length < 7) e.phone = "Enter a phone number we can reach you on.";
    if (mode === "rental" && d.activity.trim().length < 3) e.activity = "Tell us what you are planning.";
    const max = mode === "class" ? (chosen?.seatsLeft ?? 1) : p.rules.maxAttendees;
    if (!Number.isInteger(d.attendees) || d.attendees < 1 || d.attendees > max) e.attendees = `Enter between 1 and ${max}.`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Server-calculated price for rentals, refreshed when entering the review step.
  const loadQuote = useCallback(async () => {
    setQuoting(true);
    setQuote(null);
    try { setQuote((await quoteAction(slots)) as Quote); } catch { setQuote({ ok: false, error: "We could not calculate the price. Please try again." }); }
    setQuoting(false);
  }, [slots]);

  const next = async () => {
    setFormError("");
    if (step === 0) {
      if (mode === "class" && !chosen) return setFormError("Choose a class to continue.");
      if (mode === "rental" && !slots.length) return setFormError("Add at least one session to continue.");
    }
    if (step === 1 && !validateDetails()) return;
    if (step === 1 && mode === "rental") loadQuote();
    setStep((s) => s + 1);
  };

  const submit = async () => {
    setBusy(true); setFormError(""); setErrors({});
    try {
      const base = { name: d.name, email: d.email, phone: d.phone, notes: d.notes, attendees: Number(d.attendees) };
      const r = mode === "class"
        ? await submitClassBooking({ ...base, sessionId })
        : await submitRentalBooking({ ...base, slots, activity: d.activity });
      if (r.ok) { setDone(r); return; }
      setFormError(r.error);
      if (r.fields) {
        setErrors(r.fields);
        setStep(r.fields.slot || r.fields.session ? 0 : 1);
      }
    } catch {
      setFormError("Something went wrong sending your request. Please try again.");
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-[2.5rem] bg-lilac p-8 sm:p-14" role="status">
        <p className="eyebrow">Request received</p>
        <h2 ref={heading} tabIndex={-1} className="display mt-3 text-5xl outline-none sm:text-6xl">Thank you, {d.name.split(" ")[0]}.</h2>
        <dl className="mt-8 grid gap-6 sm:grid-cols-3">
          <div><dt className="eyebrow">Reference</dt><dd className="display mt-1 text-4xl">{done.reference}</dd></div>
          <div><dt className="eyebrow">Status</dt><dd className="mt-2 inline-block rounded-full bg-champagne-soft px-4 py-1.5 font-semibold">Pending approval</dd></div>
          <div><dt className="eyebrow">Estimated total</dt><dd className="display mt-1 text-4xl">{money(done.totalCents)}</dd></div>
        </dl>
        <p className="mt-8 max-w-2xl text-ink/85">
          This is a booking request, not a confirmed booking. Our team will review it and confirm. Please keep your reference number.
          {done.emailed ? " We have emailed you an acknowledgement." : done.emailConfigured ? " We could not send an email acknowledgement, so please save your reference." : " Email notifications are not set up yet, so no email was sent. Please save your reference."}
        </p>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/" className="btn btn-primary">Back to home</Link><Link href="/experiences" className="btn btn-ghost">Explore experiences</Link></div>
      </motion.div>
    );
  }

  return (
    <div>
      {!p.live ? (
        <div role="status" className="mb-8 rounded-3xl border border-plum/25 bg-champagne-soft p-6">
          <p className="font-semibold text-plum">Online booking opens soon.</p>
          <p className="mt-1 text-ink/80">You can look around, but requests cannot be submitted yet. <Link href="/contact" className="ulink font-semibold">Contact us</Link> to arrange a booking in the meantime.</p>
        </div>
      ) : null}

      <div role="group" aria-label="Booking type" className="grid gap-4 sm:grid-cols-2">
        {([["class", "Join a class or workshop", "Pick a scheduled session and reserve your seats."], ["rental", "Rent the studio", "Choose a date and time and hire the space privately."]] as const).map(([k, t, b]) => (
          <button key={k} type="button" aria-pressed={mode === k} onClick={() => { setMode(k); setStep(0); setFormError(""); setErrors({}); }}
            className={cn("relative overflow-hidden rounded-[2rem] border p-7 text-left transition-colors", mode === k ? "border-plum bg-plum text-ivory" : "border-plum/25 hover:bg-lilac")}>
            <span className="display text-3xl">{t}</span>
            <span className={cn("mt-2 block text-sm", mode === k ? "text-ivory/80" : "text-ink/70")}>{b}</span>
          </button>
        ))}
      </div>

      <ol className="mt-10 flex items-center gap-3 text-sm font-semibold" aria-label="Progress">
        {steps.map((t, i) => (
          <li key={t} aria-current={i === step ? "step" : undefined} className="flex flex-1 items-center gap-3">
            <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full border", i <= step ? "border-plum bg-plum text-ivory" : "border-plum/30 text-plum")}>{i + 1}</span>
            <span className={cn("hidden sm:inline", i === step ? "text-plum" : "text-ink/50")}>{t}</span>
            {i < steps.length - 1 ? <span aria-hidden className="h-px flex-1 bg-plum/20"><motion.span className="block h-px bg-plum" initial={false} animate={{ width: i < step ? "100%" : "0%" }} /></span> : null}
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={`${mode}-${step}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="mt-10">
          <h2 ref={heading} tabIndex={-1} className="display text-4xl outline-none sm:text-5xl">{steps[step]}</h2>

          {step === 0 && mode === "class" ? (
            list.length === 0 ? (
              <p className="mt-6 rounded-3xl border border-dashed border-plum/30 bg-sand/60 p-8 text-ink/75">No classes are open for booking right now. <Link href="/contact" className="ulink font-semibold text-plum">Ask us what is coming up</Link>.</p>
            ) : (
              <fieldset className="mt-6 space-y-3">
                <legend className="sr-only">Available sessions</legend>
                {list.map((s) => {
                  const full = s.seatsLeft <= 0 || s.priceCents == null;
                  const on = s.id === sessionId;
                  return (
                    <label key={s.id} className={cn("flex cursor-pointer flex-wrap items-center justify-between gap-4 rounded-3xl border p-5 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-plum", on ? "border-plum bg-lilac" : "border-plum/20 hover:bg-sand", full && "cursor-not-allowed opacity-55")}>
                      <input type="radio" name="session" className="sr-only" disabled={full} checked={on} onChange={() => setSessionId(s.id)} />
                      <span>
                        <span className="display block text-2xl">{s.title}</span>
                        <span className="block text-sm text-ink/75">{fmtRange(new Date(s.startsAt), new Date(s.endsAt), p.tz)}</span>
                        <span className="block text-sm text-ink/60">{[s.instructor && `with ${s.instructor}`, s.audience].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span className="text-right text-sm">
                        <span className="block font-semibold text-plum">{s.priceCents != null ? `${money(s.priceCents)} per person` : "Enquire for price"}</span>
                        <span className="block">{s.seatsLeft <= 0 ? "Full" : `${s.seatsLeft} seat${s.seatsLeft === 1 ? "" : "s"} left`}</span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            )
          ) : null}

          {step === 0 && mode === "rental" ? <RentalPicker p={p} slots={slots} setSlots={setSlots} err={errors.slot} /> : null}

          {step === 1 ? (
            <div className="mt-6 space-y-5">
              {mode === "class" ? <p className="rounded-2xl bg-sand p-4 text-sm text-ink/80">For children&apos;s classes, enter the parent or guardian&apos;s name and contact details. Bookings are made by an adult.</p> : null}
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="b-name" label="Booking adult's full name" error={errors.name}><input id="b-name" autoComplete="name" value={d.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? "b-name-err" : undefined} className={input(!!errors.name)} /></Field>
                <Field id="b-email" label="Email" error={errors.email}><input id="b-email" type="email" autoComplete="email" value={d.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? "b-email-err" : undefined} className={input(!!errors.email)} /></Field>
                <Field id="b-phone" label="Phone" error={errors.phone}><input id="b-phone" type="tel" autoComplete="tel" value={d.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "b-phone-err" : undefined} className={input(!!errors.phone)} /></Field>
                <Field id="b-att" label={mode === "class" ? "Number of attendees" : "Number of people"} error={errors.attendees} hint={mode === "class" && chosen ? `${chosen.seatsLeft} seats left` : `Up to ${p.rules.maxAttendees}`}>
                  <input id="b-att" type="number" min={1} inputMode="numeric" value={d.attendees} onChange={(e) => set("attendees", Number(e.target.value))} aria-invalid={!!errors.attendees} aria-describedby={errors.attendees ? "b-att-err" : undefined} className={input(!!errors.attendees)} />
                </Field>
              </div>
              {mode === "rental" ? (
                <Field id="b-act" label="What will you use the studio for?" error={errors.activity}><input id="b-act" value={d.activity} onChange={(e) => set("activity", e.target.value)} placeholder="For example: dance rehearsal, small workshop, birthday" aria-invalid={!!errors.activity} aria-describedby={errors.activity ? "b-act-err" : undefined} className={input(!!errors.activity)} /></Field>
              ) : null}
              <Field id="b-notes" label="Anything we should know? (optional)" error={errors.notes}><textarea id="b-notes" rows={3} maxLength={500} value={d.notes} onChange={(e) => set("notes", e.target.value)} className={input()} /></Field>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="mt-6 space-y-6">
              <div className="rounded-[2rem] border border-plum/20 bg-white/70 p-6 sm:p-8">
                <h3 className="eyebrow">Summary</h3>
                {mode === "class" && chosen ? (
                  <>
                    <p className="display mt-2 text-3xl">{chosen.title}</p>
                    <p className="text-ink/75">{fmtRange(new Date(chosen.startsAt), new Date(chosen.endsAt), p.tz)}</p>
                    <p className="mt-3">{d.attendees} attendee{d.attendees === 1 ? "" : "s"} &times; {money(chosen.priceCents)}</p>
                    <p className="display mt-3 text-4xl">{money((chosen.priceCents ?? 0) * d.attendees)}<span className="ml-2 text-base text-ink/60">estimated before any tax</span></p>
                  </>
                ) : null}
                {mode === "rental" ? (
                  <>
                    <ul className="mt-3 space-y-1">{slots.map((s, i) => <li key={i}>{fmtSlot(s, p.tz)}</li>)}</ul>
                    <p className="mt-4 text-ink/75">For: {d.activity} &middot; {d.attendees} {d.attendees === 1 ? "person" : "people"}</p>
                    <div className="mt-4" aria-live="polite">
                      {quoting ? <p>Calculating your price...</p> : quote?.ok ? (
                        <div>
                          <p className="text-ink/75">{quote.label} &middot; {quote.hours} hour{quote.hours === 1 ? "" : "s"}</p>
                          <p className="mt-1">Subtotal {money(quote.subtotalCents)}{quote.taxCents ? ` · ${quote.taxLabel} ${money(quote.taxCents)}` : ""}</p>
                          <p className="display mt-1 text-4xl">{money(quote.totalCents)}<span className="ml-2 text-base text-ink/60">CAD</span></p>
                        </div>
                      ) : quote ? <p role="alert" className="font-medium text-[#9b1c3a]">{quote.error}</p> : null}
                    </div>
                  </>
                ) : null}
                <p className="mt-5 border-t border-plum/10 pt-4 text-sm text-ink/70">{d.name} &middot; {d.email} &middot; {d.phone}</p>
              </div>

              <div className="rounded-2xl bg-champagne-soft p-5 text-sm">
                <p className="font-semibold text-plum">This is a booking request.</p>
                <p className="mt-1">It is pending until our team confirms it. No payment is taken on this website. The final price is calculated by our server when you submit. Rental covers the space only.</p>
              </div>
              {p.terms || p.cancellation || p.taxNote ? (
                <details className="rounded-2xl border border-plum/20 p-5">
                  <summary className="cursor-pointer font-semibold text-plum">Booking terms and cancellation</summary>
                  <div className="mt-3 space-y-3 text-sm text-ink/80">
                    {p.terms ? <p className="whitespace-pre-line">{p.terms}</p> : null}
                    {p.cancellation ? <p className="whitespace-pre-line">{p.cancellation}</p> : null}
                    {p.taxNote ? <p>{p.taxNote}</p> : null}
                  </div>
                </details>
              ) : null}
              <label className="flex min-h-11 items-start gap-3"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-5 w-5 accent-[#4c294f]" /><span>I have read the terms and understand this is a request until confirmed.</span></label>
              {!p.emailOn ? <p className="text-sm text-ink/60">Email notifications are not set up yet, so you will not receive an email. Your reference will be shown on screen.</p> : null}
            </div>
          ) : null}

          <div aria-live="assertive">{formError ? <p role="alert" className="mt-6 rounded-2xl bg-[#f8e4e9] p-4 text-sm font-medium text-[#7a1530]">{formError}</p> : null}</div>

          <div className="mt-10 flex flex-wrap gap-3">
            {step > 0 ? <button type="button" className="btn btn-ghost" onClick={() => { setFormError(""); setStep((s) => s - 1); }}>Back</button> : null}
            {step < 2 ? (
              <button type="button" className="btn btn-primary" onClick={next}>Continue</button>
            ) : (
              <button type="button" className="btn btn-primary" disabled={busy || !agree || !p.live || (mode === "rental" && !quote?.ok)} aria-busy={busy} onClick={submit}>
                {busy ? "Sending your request..." : "Send booking request"}
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const fmtSlot = (s: Slot, tz: string) => {
  const a = zonedToUtc(s.date, s.start, tz);
  const b = new Date(a.getTime() + s.minutes * 60000);
  return `${fmtDate(a, tz, true)} · ${fmtTime(a, tz)} – ${fmtTime(b, tz, true)}`;
};

function RentalPicker({ p, slots, setSlots, err }: {
  p: { today: string; tz: string; rules: RentalRules }; slots: Slot[]; setSlots: (f: (s: Slot[]) => Slot[]) => void; err?: string;
}) {
  const [date, setDate] = useState("");
  const [minutes, setMinutes] = useState(p.rules.minHours * 60);
  const [starts, setStarts] = useState<string[] | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [pick, setPick] = useState("");
  const durations: number[] = [];
  for (let m = p.rules.minHours * 60; m <= p.rules.maxHours * 60; m += Math.max(30, p.rules.stepMin)) durations.push(m);

  useEffect(() => {
    const ctl = new AbortController();
    const reset = requestAnimationFrame(() => { setPick(""); if (!date) setStarts(null); });
    if (!date) return () => cancelAnimationFrame(reset);
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect -- shows the spinner while the request runs
    fetch(`/api/availability?date=${date}&minutes=${minutes}`, { signal: ctl.signal })
      .then((r) => r.json())
      .then((j) => { setStarts(j.starts); setReason(j.reason || ""); })
      .catch(() => { if (!ctl.signal.aborted) { setStarts([]); setReason("Could not load availability. Please try again."); } })
      .finally(() => { if (!ctl.signal.aborted) setLoading(false); });
    return () => { cancelAnimationFrame(reset); ctl.abort(); };
  }, [date, minutes]);

  const add = () => {
    if (!date || !pick) return;
    setSlots((s) => [...s, { date, start: pick, minutes }].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)));
    setPick(""); setStarts(null); setDate("");
  };
  return (
    <div className="mt-6 space-y-6">
      <p className="text-sm text-ink/75">Times are in {p.tz.replace("_", " ")} time. Please book at least {p.rules.leadHours} hours ahead. You can add up to {p.rules.maxSlots} sessions to one request.</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="r-date" label="Date"><input id="r-date" type="date" min={p.today} value={date} onChange={(e) => setDate(e.target.value)} className={input()} /></Field>
        <Field id="r-dur" label="Length">
          <select id="r-dur" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className={input()}>
            {durations.map((m) => <option key={m} value={m}>{m / 60} hour{m === 60 ? "" : "s"}</option>)}
          </select>
        </Field>
      </div>
      <div aria-live="polite">
        {loading ? <p>Checking availability...</p> : null}
        {!loading && starts && starts.length > 0 ? (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-plum">Available start times</legend>
            <div className="flex flex-wrap gap-2">
              {starts.map((t) => (
                <label key={t} className={cn("cursor-pointer rounded-full border px-4 py-2.5 text-sm font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-plum", pick === t ? "border-plum bg-plum text-ivory" : "border-plum/30 hover:bg-lilac")}>
                  <input type="radio" name="start" value={t} checked={pick === t} onChange={() => setPick(t)} className="sr-only" />
                  {fmtTime(zonedToUtc(date, t, p.tz), p.tz)}
                </label>
              ))}
            </div>
            <button type="button" className="btn btn-primary mt-5" disabled={!pick || slots.length >= p.rules.maxSlots} onClick={add}>Add this session</button>
          </fieldset>
        ) : null}
        {!loading && starts && starts.length === 0 ? <p className="rounded-2xl bg-sand p-4 text-ink/80">{reason}</p> : null}
      </div>
      {err ? <p role="alert" className="font-medium text-[#9b1c3a]">{err}</p> : null}
      <div>
        <h3 className="eyebrow">Your sessions</h3>
        {slots.length === 0 ? <p className="mt-2 text-ink/60">None added yet.</p> : (
          <ul className="mt-3 space-y-2">
            {slots.map((s, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-2xl bg-lilac px-5 py-3">
                <span>{fmtSlot(s, p.tz)}</span>
                <button type="button" className="min-h-11 px-3 text-sm font-semibold text-plum underline" onClick={() => setSlots((a) => a.filter((_, j) => j !== i))}>Remove<span className="sr-only"> session {i + 1}</span></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
