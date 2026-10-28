"use client";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { quoteAction, submitClassBooking, submitRentalBooking, type BookingResult, type FieldErrors } from "@/app/(site)/actions";
import { cn } from "@/lib/cn";
import { money } from "@/lib/format";
import { addDays, fmtDay, fmtRange, pad, weekdayOf } from "@/lib/time";

export type SessionView = {
  id: string; title: string; startsAt: string; endsAt: string; instructor: string; priceCents: number | null;
  seatsLeft: number; audience: string; serviceSlug: string;
};
export type RoomView = {
  id: string; slug: string; name: string; sizeSqFt: number | null; priceCents: number; priceNote: string; capacity: number;
  uses: string[]; image: string | null; imageAlt: string; description: string;
};
export type RentalRules = { minHours: number; maxHours: number; stepMin: number };
type DaySlot = { start: string; end: string; state: "free" | "booked" | "past" };
type Quote = { ok: true; subtotalCents: number; taxCents: number; totalCents: number; taxLabel: string; label: string; hours: number } | { ok: false; error: string };
type Pay = { interacEmail: string; instructions: string };

const input = (bad?: boolean) => cn("w-full min-h-12 rounded-2xl border bg-white px-4 py-3 text-base outline-none focus:shadow-[0_0_0_3px_rgba(201,169,97,.5)]", bad ? "border-[#9b1c3a]" : "border-plum/25");
const t12 = (hhmm: string) => { const h = +hhmm.slice(0, 2); return `${h % 12 || 12}:${hhmm.slice(3)} ${h < 12 ? "am" : "pm"}`; };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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

function PayBox({ pay, reference }: { pay: Pay; reference?: string }) {
  return (
    <div className="rounded-2xl border border-champagne bg-champagne-soft/60 p-5 text-sm">
      <p className="font-semibold text-plum">Pay by Interac e-transfer</p>
      <p className="mt-2">Send the transfer to: <a className="font-semibold underline" href={`mailto:${pay.interacEmail}`}>{pay.interacEmail}</a></p>
      {reference ? <p className="mt-1">Include this reference in the message: <strong className="tracking-wide">{reference}</strong></p> : null}
      <p className="mt-2 text-ink/75">{pay.instructions}</p>
    </div>
  );
}

/** Month calendar for picking a date. Closed, blocked and past days are disabled. */
function Calendar({ month, setMonth, value, onPick, disabled, today }: {
  month: string; setMonth: (m: string) => void; value: string; onPick: (d: string) => void; disabled: (d: string) => boolean; today: string;
}) {
  const [y, m] = month.split("-").map(Number);
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`)];
  const shift = (n: number) => { const d = new Date(Date.UTC(y, m - 1 + n, 1)); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`; };
  const atStart = month <= today.slice(0, 7);
  return (
    <div className="rounded-[1.75rem] border border-plum/20 bg-white p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => setMonth(shift(-1))} disabled={atStart} aria-label="Previous month" className="grid h-11 w-11 place-items-center rounded-full border border-plum/25 text-lg disabled:opacity-30">&larr;</button>
        <h3 className="display text-2xl" aria-live="polite">{MONTHS[m - 1]} {y}</h3>
        <button type="button" onClick={() => setMonth(shift(1))} aria-label="Next month" className="grid h-11 w-11 place-items-center rounded-full border border-plum/25 text-lg">&rarr;</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wider text-ink/50" aria-hidden>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className="py-1">{d}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const off = disabled(d);
          const on = d === value;
          return (
            <button
              key={d} type="button" disabled={off} onClick={() => onPick(d)} aria-pressed={on}
              aria-label={fmtDay(d)}
              className={cn("aspect-square min-h-11 rounded-xl text-[0.95rem] font-semibold transition-colors", on ? "bg-plum text-white" : off ? "text-ink/25" : "hover:bg-lilac", d === today && !on && "ring-1 ring-plum/50")}
            >
              {+d.slice(8)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BookingFlow(p: {
  live: boolean; tz: string; terms: string; cancellation: string; taxNote: string; today: string;
  sessions: SessionView[]; initialMode: "class" | "rental"; initialSession?: string; serviceSlug?: string;
  rooms: RoomView[]; initialRoom?: string; rules: RentalRules; openDays: boolean[]; blocked: { s: string; e: string }[];
  categories: string[]; pay: Pay; emailOn: boolean;
}) {
  const [mode, setMode] = useState<"class" | "rental">(p.initialMode);
  const [step, setStep] = useState(0);
  const [sessionId, setSessionId] = useState(p.initialSession ?? "");
  const [roomId, setRoomId] = useState(p.rooms.find((r) => r.slug === p.initialRoom)?.id ?? p.rooms[0]?.id ?? "");
  const [month, setMonth] = useState(p.today.slice(0, 7));
  const [date, setDate] = useState("");
  const [day, setDay] = useState<{ slots: DaySlot[]; reason: string } | null>(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [d, setD] = useState({ name: "", email: "", phone: "", notes: "", attendees: 1, activity: "", category: "" });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Extract<BookingResult, { ok: true }> | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const room = p.rooms.find((r) => r.id === roomId);

  const list = useMemo(() => (p.serviceSlug ? p.sessions.filter((s) => s.serviceSlug === p.serviceSlug) : p.sessions), [p.sessions, p.serviceSlug]);
  const chosen = p.sessions.find((s) => s.id === sessionId);
  const steps = mode === "class" ? ["Choose class", "Your details", "Review"] : ["Room & time", "Your details", "Review & pay"];
  const set = (k: keyof typeof d, v: string | number) => setD((o) => ({ ...o, [k]: v }));
  const goStep = (n: number) => { setStep(n); requestAnimationFrame(() => heading.current?.focus()); };

  const maxSlots = Math.floor((p.rules.maxHours * 60) / p.rules.stepMin);
  const minSlots = Math.ceil((p.rules.minHours * 60) / p.rules.stepMin);
  const horizon = addDays(p.today, 365);
  const dateOff = (x: string) => x < p.today || x > horizon || !p.openDays[weekdayOf(x)] || p.blocked.some((b) => x >= b.s && x <= b.e);

  async function loadDay(rid: string, dt: string) {
    setSel(null); setQuote(null);
    if (!rid || !dt) return setDay(null);
    setDayLoading(true);
    try {
      const r = await fetch(`/api/availability?room=${encodeURIComponent(rid)}&date=${dt}`, { cache: "no-store" });
      setDay(await r.json());
    } catch { setDay({ slots: [], reason: "Could not load availability. Please try again." }); }
    setDayLoading(false);
  }
  const pickDate = (dt: string) => { setDate(dt); loadDay(roomId, dt); };
  const pickRoom = (id: string) => { setRoomId(id); if (date) loadDay(id, date); };

  /** Tap a first hour, then a last hour: everything between must be free so the booking stays continuous. */
  const tapSlot = (i: number) => {
    if (!day) return;
    const s = day.slots;
    if (!sel || sel[0] !== sel[1]) return setSel([i, i]);
    const [a, b] = [Math.min(sel[0], i), Math.max(sel[0], i)];
    const ok = s.slice(a, b + 1).every((x) => x.state === "free") && b - a + 1 <= maxSlots;
    if (!ok) return setSel([i, i]);
    setSel([a, b]);
  };
  const slotInput = sel && day ? { date, start: day.slots[sel[0]].start, minutes: (sel[1] - sel[0] + 1) * p.rules.stepMin } : null;
  const selLabel = sel && day ? `${fmtDay(date)}, ${t12(day.slots[sel[0]].start)} to ${t12(day.slots[sel[1]].end)} (${((sel[1] - sel[0] + 1) * p.rules.stepMin) / 60} h)` : "";

  const validateDetails = () => {
    const e: FieldErrors = {};
    if (d.name.trim().length < 2) e.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(d.email)) e.email = "Enter a valid email address.";
    if (d.phone.trim().length < 7) e.phone = "Enter a phone number we can reach you on.";
    if (mode === "rental") {
      if (!d.category) e.category = "Choose what the booking is for.";
      if (d.activity.trim().length < 3) e.activity = "Tell us the reason for your booking.";
    }
    const max = mode === "class" ? (chosen?.seatsLeft ?? 1) : (room?.capacity ?? 1);
    if (!Number.isInteger(d.attendees) || d.attendees < 1 || d.attendees > max) e.attendees = `Enter between 1 and ${max}.`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const loadQuote = async () => {
    if (!slotInput) return;
    setQuoting(true); setQuote(null);
    try { setQuote((await quoteAction([slotInput], roomId)) as Quote); } catch { setQuote({ ok: false, error: "We could not calculate the price. Please try again." }); }
    setQuoting(false);
  };

  const next = async () => {
    setFormError("");
    if (step === 0) {
      if (mode === "class" && !chosen) return setFormError("Choose a class to continue.");
      if (mode === "rental") {
        if (!room) return setFormError("Choose a room.");
        if (!date) return setFormError("Choose a date.");
        if (!sel) return setFormError("Choose your time on the calendar.");
        if (sel[1] - sel[0] + 1 < minSlots) return setFormError(`Please book at least ${p.rules.minHours} hour${p.rules.minHours === 1 ? "" : "s"}.`);
      }
    }
    if (step === 1 && !validateDetails()) return;
    if (step === 1 && mode === "rental") loadQuote();
    goStep(step + 1);
  };

  const submit = async () => {
    setBusy(true); setFormError(""); setErrors({});
    try {
      const base = { name: d.name, email: d.email, phone: d.phone, notes: d.notes, attendees: Number(d.attendees) };
      const r = mode === "class"
        ? await submitClassBooking({ ...base, sessionId })
        : await submitRentalBooking({ ...base, slots: slotInput ? [slotInput] : [], activity: d.activity, roomId, category: d.category });
      if (r.ok) { setDone(r); requestAnimationFrame(() => heading.current?.focus()); return; }
      setFormError(r.error);
      if (r.fields) { setErrors(r.fields); goStep(r.fields.slot || r.fields.session || r.fields.room ? 0 : 1); }
      if (r.fields?.slot && date) loadDay(roomId, date); // the slot was taken: refresh the grid so it shows as booked
    } catch {
      setFormError("Something went wrong sending your request. Please try again.");
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-[2.5rem] bg-lilac p-8 sm:p-14" role="status">
        <p className="eyebrow">Request received</p>
        <h2 ref={heading} tabIndex={-1} className="display mt-3 text-4xl outline-none sm:text-5xl">Thank you, {d.name.split(" ")[0]}.</h2>
        <dl className="mt-8 grid gap-6 sm:grid-cols-3">
          <div><dt className="eyebrow">Reference</dt><dd className="display mt-1 text-3xl">{done.reference}</dd></div>
          <div><dt className="eyebrow">Status</dt><dd className="mt-2 inline-block rounded-full bg-champagne-soft px-4 py-1.5 font-semibold">Pending payment</dd></div>
          <div><dt className="eyebrow">Total</dt><dd className="display mt-1 text-3xl">{money(done.totalCents)}</dd></div>
        </dl>
        <div className="mt-8 max-w-2xl"><PayBox pay={p.pay} reference={done.reference} /></div>
        <p className="mt-6 max-w-2xl text-ink/85">
          Your slot is held while the studio checks your payment. This is a booking request until the studio confirms it. Please keep your reference number.
          {done.emailed ? " We have emailed you the details." : done.emailConfigured ? " We could not send the confirmation email, so please save your reference." : " Email is not set up yet, so no email was sent. Please save your reference."}
        </p>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/" className="btn btn-primary">Back to home</Link><Link href="/team" className="btn btn-ghost">Instructors &amp; classes</Link></div>
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

      <div role="group" aria-label="Booking type" className="grid gap-3 sm:grid-cols-2">
        {([["rental", "Book a studio", "Choose a room, a date and your hours."], ["class", "Join a class", "Pick a scheduled class and reserve your seats."]] as const).map(([k, t, b]) => (
          <button key={k} type="button" aria-pressed={mode === k} onClick={() => { setMode(k); setStep(0); setFormError(""); setErrors({}); }}
            className={cn("rounded-[1.5rem] border p-5 text-left transition-colors", mode === k ? "border-plum bg-plum text-white" : "border-plum/25 hover:bg-lilac")}>
            <span className="display block text-2xl">{t}</span>
            <span className={cn("mt-1 block text-sm", mode === k ? "text-white/80" : "text-ink/70")}>{b}</span>
          </button>
        ))}
      </div>

      <ol className="mt-10 flex items-center gap-3 text-sm font-semibold" aria-label="Progress">
        {steps.map((t, i) => (
          <li key={t} aria-current={i === step ? "step" : undefined} className="flex flex-1 items-center gap-3">
            <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full border", i <= step ? "border-plum bg-plum text-white" : "border-plum/30 text-plum")}>{i + 1}</span>
            <span className={cn("hidden sm:inline", i === step ? "text-plum" : "text-ink/50")}>{t}</span>
            {i < steps.length - 1 ? <span aria-hidden className="h-px flex-1 bg-plum/20"><motion.span className="block h-px bg-plum" initial={false} animate={{ width: i < step ? "100%" : "0%" }} /></span> : null}
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={`${mode}-${step}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="mt-10">
          <h2 ref={heading} tabIndex={-1} className="display text-3xl outline-none sm:text-4xl">{steps[step]}</h2>

          {/* ---------- class: choose ---------- */}
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

          {/* ---------- studio: room, date, hours ---------- */}
          {step === 0 && mode === "rental" ? (
            <div className="mt-6 space-y-10">
              <fieldset>
                <legend className="mb-3 text-sm font-semibold text-plum">1. Choose a room</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  {p.rooms.map((r) => (
                    <label key={r.id} className={cn("relative cursor-pointer overflow-hidden rounded-[1.5rem] border transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-plum", r.id === roomId ? "border-plum bg-lilac/60" : "border-plum/20 hover:bg-sand")}>
                      <input type="radio" name="room" className="sr-only" checked={r.id === roomId} onChange={() => pickRoom(r.id)} />
                      {r.image ? <div className="relative aspect-[16/9]"><Image src={r.image} alt={r.imageAlt || r.name} fill sizes="(min-width:640px) 40vw, 90vw" className="object-cover" /></div> : null}
                      <span className="block p-5">
                        <span className="display block text-2xl">{r.name}</span>
                        <span className="mt-1 block text-sm text-ink/70">{[r.sizeSqFt ? `${r.sizeSqFt} sq ft` : null, `up to ${r.capacity} people`].filter(Boolean).join(" · ")}</span>
                        <span className="mt-2 block font-semibold text-plum">{money(r.priceCents)} / hour{r.priceNote ? <span className="ml-2 text-xs font-normal text-ink/60">{r.priceNote}</span> : null}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <p className="mb-3 text-sm font-semibold text-plum">2. Pick a date</p>
                <Calendar month={month} setMonth={setMonth} value={date} onPick={pickDate} disabled={dateOff} today={p.today} />
              </div>

              <div aria-live="polite">
                <p className="mb-1 text-sm font-semibold text-plum">3. Pick your hours</p>
                {!date ? <p className="text-ink/60">Choose a date to see the available times.</p> : dayLoading ? <p>Loading times...</p> : day && day.slots.length === 0 ? (
                  <p className="rounded-2xl bg-sand p-4 text-ink/80">{day.reason}</p>
                ) : day ? (
                  <>
                    <p className="mb-3 text-sm text-ink/65">{fmtDay(date)} &middot; times in {p.tz.replace("_", " ")} time. Tap your first hour, then your last hour. Booked hours are taken.</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {day.slots.map((s, i) => {
                        const inSel = sel && i >= sel[0] && i <= sel[1];
                        const off = s.state !== "free";
                        return (
                          <button
                            key={s.start} type="button" disabled={off} onClick={() => tapSlot(i)} aria-pressed={!!inSel}
                            className={cn("min-h-14 rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition-colors",
                              inSel ? "border-plum bg-plum text-white" : off ? "cursor-not-allowed border-plum/10 bg-sand/70 text-ink/35" : "border-plum/25 hover:bg-lilac")}
                          >
                            <span className={cn("block", s.state === "booked" && "line-through")}>{t12(s.start)}</span>
                            <span className={cn("block text-xs font-normal", inSel ? "text-white/80" : "text-ink/50")}>{s.state === "booked" ? "Booked" : s.state === "past" ? "Unavailable" : `to ${t12(s.end)}`}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : null}
                {sel && day ? (
                  <p className="mt-4 rounded-2xl bg-lilac p-4 font-semibold text-plum">
                    {selLabel}
                    <button type="button" onClick={() => setSel(null)} className="ml-3 text-sm font-normal underline">Clear</button>
                  </p>
                ) : null}
                {errors.slot ? <p role="alert" className="mt-2 font-medium text-[#9b1c3a]">{errors.slot}</p> : null}
              </div>
            </div>
          ) : null}

          {/* ---------- details ---------- */}
          {step === 1 ? (
            <div className="mt-6 space-y-5">
              {mode === "class" ? <p className="rounded-2xl bg-sand p-4 text-sm text-ink/80">For children&apos;s classes, enter the parent or guardian&apos;s name and contact details. Bookings are made by an adult.</p> : null}
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="b-name" label="Full name" error={errors.name}><input id="b-name" autoComplete="name" value={d.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? "b-name-err" : undefined} className={input(!!errors.name)} /></Field>
                <Field id="b-email" label="Email" error={errors.email}><input id="b-email" type="email" autoComplete="email" value={d.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? "b-email-err" : undefined} className={input(!!errors.email)} /></Field>
                <Field id="b-phone" label="Phone number" error={errors.phone}><input id="b-phone" type="tel" autoComplete="tel" value={d.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "b-phone-err" : undefined} className={input(!!errors.phone)} /></Field>
                <Field id="b-att" label={mode === "class" ? "Number of attendees" : "Number of people"} error={errors.attendees} hint={mode === "class" && chosen ? `${chosen.seatsLeft} seats left` : mode === "rental" && room ? `Up to ${room.capacity}` : undefined}>
                  <input id="b-att" type="number" min={1} inputMode="numeric" value={d.attendees} onChange={(e) => set("attendees", Number(e.target.value))} aria-invalid={!!errors.attendees} aria-describedby={errors.attendees ? "b-att-err" : undefined} className={input(!!errors.attendees)} />
                </Field>
              </div>
              {mode === "rental" ? (
                <>
                  <Field id="b-cat" label="What is the booking for?" error={errors.category}>
                    <select id="b-cat" value={d.category} onChange={(e) => set("category", e.target.value)} aria-invalid={!!errors.category} className={input(!!errors.category)}>
                      <option value="">Choose one</option>
                      {p.categories.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field id="b-act" label="Reason for booking" error={errors.activity} hint="A sentence is enough, for example: dance rehearsal for 8 people.">
                    <textarea id="b-act" rows={3} maxLength={300} value={d.activity} onChange={(e) => set("activity", e.target.value)} aria-invalid={!!errors.activity} aria-describedby={errors.activity ? "b-act-err" : undefined} className={input(!!errors.activity)} />
                  </Field>
                </>
              ) : null}
              <Field id="b-notes" label="Anything else we should know? (optional)" error={errors.notes}><textarea id="b-notes" rows={2} maxLength={500} value={d.notes} onChange={(e) => set("notes", e.target.value)} className={input()} /></Field>
            </div>
          ) : null}

          {/* ---------- review ---------- */}
          {step === 2 ? (
            <div className="mt-6 space-y-6">
              <div className="rounded-[2rem] border border-plum/20 bg-white/70 p-6 sm:p-8">
                <h3 className="eyebrow">Summary</h3>
                {mode === "class" && chosen ? (
                  <>
                    <p className="display mt-2 text-3xl">{chosen.title}</p>
                    <p className="text-ink/75">{fmtRange(new Date(chosen.startsAt), new Date(chosen.endsAt), p.tz)}</p>
                    <p className="mt-3">{d.attendees} attendee{d.attendees === 1 ? "" : "s"} &times; {money(chosen.priceCents)}</p>
                    <p className="display mt-3 text-4xl">{money((chosen.priceCents ?? 0) * d.attendees)}<span className="ml-2 text-base text-ink/60">before any tax</span></p>
                  </>
                ) : null}
                {mode === "rental" ? (
                  <>
                    <p className="display mt-2 text-3xl">{room?.name}</p>
                    <p className="text-ink/75">{selLabel}</p>
                    <p className="mt-3 text-ink/75">{d.category}: {d.activity} &middot; {d.attendees} {d.attendees === 1 ? "person" : "people"}</p>
                    <div className="mt-4" aria-live="polite">
                      {quoting ? <p>Calculating your price...</p> : quote?.ok ? (
                        <div>
                          <p className="text-ink/75">{quote.hours} hour{quote.hours === 1 ? "" : "s"} at {money(Math.round(quote.subtotalCents / quote.hours))} / hour</p>
                          {quote.taxCents ? <p className="mt-1">Subtotal {money(quote.subtotalCents)} &middot; {quote.taxLabel} {money(quote.taxCents)}</p> : null}
                          <p className="display mt-1 text-4xl">{money(quote.totalCents)}<span className="ml-2 text-base text-ink/60">CAD</span></p>
                        </div>
                      ) : quote ? <p role="alert" className="font-medium text-[#9b1c3a]">{quote.error}</p> : null}
                    </div>
                  </>
                ) : null}
                <p className="mt-5 border-t border-plum/10 pt-4 text-sm text-ink/70">{d.name} &middot; {d.email} &middot; {d.phone}</p>
              </div>

              <PayBox pay={p.pay} />
              <div className="rounded-2xl bg-champagne-soft/50 p-5 text-sm">
                <p className="font-semibold text-plum">This is a booking request.</p>
                <p className="mt-1">Your slot is held and shown as Pending until the studio confirms your Interac e-transfer. You will get a confirmation email. The final price is calculated by our server when you submit.</p>
              </div>
              {p.terms || p.cancellation || p.taxNote ? (
                <details className="rounded-2xl border border-plum/20 p-5">
                  <summary className="cursor-pointer font-semibold text-plum">Booking terms</summary>
                  <div className="mt-3 space-y-3 text-sm text-ink/80">
                    {p.terms ? <p className="whitespace-pre-line">{p.terms}</p> : null}
                    {p.cancellation ? <p className="whitespace-pre-line">{p.cancellation}</p> : null}
                    {p.taxNote ? <p>{p.taxNote}</p> : null}
                  </div>
                </details>
              ) : null}
              <label className="flex min-h-11 items-start gap-3"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-5 w-5 accent-[#c9a961]" /><span>I have read the terms and understand this is a request until the studio confirms my payment.</span></label>
              {!p.emailOn ? <p className="text-sm text-ink/60">Email is not set up on this site yet, so no confirmation email will be sent. Your reference will be shown on screen.</p> : null}
            </div>
          ) : null}

          <div aria-live="assertive">{formError ? <p role="alert" className="mt-6 rounded-2xl bg-[#f8e4e9] p-4 text-sm font-medium text-[#7a1530]">{formError}</p> : null}</div>

          <div className="mt-10 flex flex-wrap gap-3">
            {step > 0 ? <button type="button" className="btn btn-ghost" onClick={() => { setFormError(""); goStep(step - 1); }}>Back</button> : null}
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
