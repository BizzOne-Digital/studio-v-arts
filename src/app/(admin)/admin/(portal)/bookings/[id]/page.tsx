import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton, AdminForm, Field } from "@/components/admin/ui";
import { Badge, Card, Title } from "@/components/admin/server-ui";
import { col } from "@/lib/db";
import { bookingsWithWhen } from "@/lib/admin-data";
import { money } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { dateStrIn, fmtDateTime, fmtRange, timeStrIn } from "@/lib/time";
import { changeStatus, reschedule, saveBookingMeta } from "../../actions";

export const metadata = { title: "Booking" };
const NEXT: Record<string, { to: string; label: string; confirm?: string }[]> = {
  pending: [{ to: "confirmed", label: "Confirm" }, { to: "declined", label: "Decline", confirm: "Decline this request? The slot is released." }, { to: "cancelled", label: "Cancel", confirm: "Cancel this booking?" }],
  confirmed: [{ to: "completed", label: "Mark completed" }, { to: "cancelled", label: "Cancel", confirm: "Cancel this confirmed booking? The slot is released." }],
};

export default async function BookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const b = (await bookingsWithWhen({ _id: id }))[0] as any;
  if (!b) notFound();
  const s = await getSettings();
  const tz = s.booking.timezone;
  const ses = b.session_id ? await (await col("sessions")).findOne({ _id: b.session_id } as any) : null;
  b.ss_start = ses?.starts_at; b.ss_end = ses?.ends_at;
  b.offer_title = b.offer_id ? (await (await col("offers")).findOne({ _id: b.offer_id } as any))?.title ?? null : null;
  const slots = await (await col("booking_slots")).find({ booking_id: id }).sort({ starts_at: 1 }).toArray();
  const history = await (await col("bookings")).find({ customer_email: b.customer_email, _id: { $ne: id } } as any).sort({ created_at: -1 }).limit(10).toArray();
  const actions = NEXT[b.status] ?? [];
  const mins = (x: any) => Math.round((new Date(x.ends_at).getTime() - new Date(x.starts_at).getTime()) / 60000);

  return (
    <>
      <Title title={b.reference} sub={`${b.kind === "class" ? "Class booking" : "Studio rental"} · requested ${fmtDateTime(b.created_at, tz)}`} action={<Link href="/admin/bookings" className="underline">&larr; All bookings</Link>} />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Booking">
            <div className="flex flex-wrap items-center gap-3"><Badge v={b.status} /><span className="text-sm text-ink/60">Payment:</span><Badge v={b.payment_status} /></div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2 text-sm">
              <div><dt className="eyebrow">What</dt><dd className="mt-1">{b.kind === "class" ? b.title : `Studio rental: ${b.activity}`}</dd></div>
              <div><dt className="eyebrow">People</dt><dd className="mt-1">{b.attendees}</dd></div>
              <div className="sm:col-span-2"><dt className="eyebrow">When ({tz})</dt><dd className="mt-1 space-y-0.5">{b.kind === "class" ? <p>{fmtRange(b.ss_start, b.ss_end, tz)}</p> : slots.map((x, i) => <p key={i}>{fmtRange(x.starts_at, x.ends_at, tz)}</p>)}</dd></div>
              <div><dt className="eyebrow">Price</dt><dd className="mt-1">Subtotal {money(b.subtotal_cents)} · Tax {money(b.tax_cents)} · <strong>Total {money(b.total_cents)} CAD</strong></dd></div>
              <div><dt className="eyebrow">Pricing applied</dt><dd className="mt-1">{b.offer_title ?? b.price_breakdown?.label ?? "-"}{b.price_breakdown?.hours ? ` · ${b.price_breakdown.hours} h` : ""}</dd></div>
              <div className="sm:col-span-2"><dt className="eyebrow">Customer notes</dt><dd className="mt-1 whitespace-pre-line">{b.customer_notes || "-"}</dd></div>
            </dl>
            {actions.length ? (
              <div className="mt-6 flex flex-wrap gap-2 border-t border-plum/10 pt-5">
                {actions.map((a) => <ActionButton key={a.to} action={changeStatus.bind(null, b.id, a.to)} confirm={a.confirm} className={a.to === "confirmed" ? "!bg-plum !text-white" : ""}>{a.label}</ActionButton>)}
              </div>
            ) : <p className="mt-5 text-sm text-ink/60">This booking is {b.status}; no further status changes are available.</p>}
            <p className="mt-3 text-xs text-ink/60">Changing status emails the customer only if email is configured. Status and payment are tracked separately.</p>
          </Card>

          {b.kind === "rental" && ["pending", "confirmed"].includes(b.status) ? (
            <Card title="Reschedule">
              <p className="mb-4 text-sm text-ink/70">Availability, buffers and pricing are re-validated on save. Lead time is waived for admins; conflicts are not.</p>
              <AdminForm action={reschedule} submitLabel="Reschedule">
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="count" value={slots.length} />
                {slots.map((x, i) => (
                  <div key={i} className="grid gap-3 sm:grid-cols-3">
                    <Field label={`Session ${i + 1} date`}><input type="date" name={`date${i}`} defaultValue={dateStrIn(x.starts_at, tz)} className="admin-input" required /></Field>
                    <Field label="Start"><input type="time" name={`start${i}`} defaultValue={timeStrIn(x.starts_at, tz)} className="admin-input" required /></Field>
                    <Field label="Length (minutes)"><input type="number" name={`minutes${i}`} defaultValue={mins(x)} step={s.booking.slotStepMin} className="admin-input" required /></Field>
                  </div>
                ))}
              </AdminForm>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card title="Customer">
            <p className="font-semibold">{b.customer_name}</p>
            <p><a className="underline" href={`mailto:${b.customer_email}`}>{b.customer_email}</a></p>
            <p><a className="underline" href={`tel:${b.customer_phone}`}>{b.customer_phone}</a></p>
            <h3 className="eyebrow mt-5">Booking history</h3>
            {history.length ? <ul className="mt-2 space-y-1 text-sm">{history.map((h) => <li key={h.id}><Link className="underline" href={`/admin/bookings/${h.id}`}>{h.reference}</Link> · {h.kind} · <Badge v={h.status} /></li>)}</ul> : <p className="mt-2 text-sm text-ink/60">No other bookings from this email.</p>}
          </Card>
          <Card title="Internal notes and payment">
            <AdminForm action={saveBookingMeta}>
              <input type="hidden" name="id" value={b.id} />
              <Field label="Private notes (never shown to the customer)"><textarea name="notes" rows={5} defaultValue={b.internal_notes} className="admin-input" /></Field>
              <Field label="Payment status"><select name="payment" defaultValue={b.payment_status} className="admin-input">{["unpaid", "paid", "refunded", "waived"].map((x) => <option key={x}>{x}</option>)}</select></Field>
            </AdminForm>
          </Card>
        </div>
      </div>
    </>
  );
}
