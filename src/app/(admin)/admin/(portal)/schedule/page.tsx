import { ActionButton, AdminForm, Field } from "@/components/admin/ui";
import { Badge, Card, Empty, Title } from "@/components/admin/server-ui";
import { MonthCalendar, loadMonthEvents } from "@/components/admin/MonthCalendar";
import { DayBookings } from "@/components/admin/DayBookings";
import { col } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { dateStrIn, fmtDateTime, timeStrIn } from "@/lib/time";
import { addBlockedDate, cancelSession, deleteRow, saveAvailability, saveSession } from "../actions";

export const metadata = { title: "Schedule & availability" };
const yesterday = () => new Date(Date.now() - 86400000);
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function Schedule({ searchParams }: { searchParams: Promise<{ month?: string; edit?: string; day?: string }> }) {
  const sp = await searchParams;
  const s = await getSettings();
  const b = s.booking;
  const tz = b.timezone;
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : dateStrIn(new Date(), tz).slice(0, 7);
  const [events, svcRows, sessRows, blockedRows, booked] = await Promise.all([
    loadMonthEvents(month, tz),
    (await col("services")).find({ booking_type: "class", status: { $ne: "archived" } }).sort({ title: 1 }).toArray(),
    (await col("sessions")).find({ starts_at: { $gt: yesterday() } }).sort({ starts_at: 1 }).limit(100).toArray(),
    (await col("blocked_dates")).find({}).sort({ date_start: 1 }).toArray(),
    (await col("bookings")).aggregate([{ $match: { session_id: { $ne: null }, status: { $in: ["pending", "confirmed", "completed"] } } }, { $group: { _id: "$session_id", n: { $sum: "$attendees" } } }]).toArray(),
  ]);
  const titles = new Map(svcRows.map((v) => [v.id as string, v.title as string]));
  const bookedMap = new Map(booked.map((x) => [x._id as string, x.n as number]));
  const services = { rows: svcRows };
  const sessions = { rows: sessRows.map((x) => ({ ...x, title: titles.get(x.service_id) ?? "Class", booked: bookedMap.get(x.id) ?? 0 })) };
  const blocked = { rows: blockedRows.map((x) => ({ id: x.id, a: x.date_start, b: x.date_end, reason: x.reason })) };
  const editing = sp.edit ? sessions.rows.find((x: any) => x.id === sp.edit) : null;

  const renderSessionForm = (x?: any) => (
    <AdminForm action={saveSession} submitLabel={x ? "Save session" : "Add session"} resetOnSuccess={!x}>
      {x ? <input type="hidden" name="id" value={x.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Class" wide><select name="serviceId" required defaultValue={x?.service_id} className="admin-input">{services.rows.map((v: any) => <option key={v.id} value={v.id}>{v.title}</option>)}</select></Field>
        <Field label="Date"><input type="date" name="date" required defaultValue={x ? dateStrIn(x.starts_at, tz) : ""} className="admin-input" /></Field>
        <Field label="Start time"><input type="time" name="start" required defaultValue={x ? timeStrIn(x.starts_at, tz) : ""} className="admin-input" /></Field>
        <Field label="Length (minutes)"><input type="number" name="minutes" required min={15} step={5} defaultValue={x ? Math.round((new Date(x.ends_at).getTime() - new Date(x.starts_at).getTime()) / 60000) : 60} className="admin-input" /></Field>
        <Field label="Capacity (seats)"><input type="number" name="capacity" required min={1} defaultValue={x?.capacity ?? ""} className="admin-input" /></Field>
        <Field label="Price per person (CAD)" hint="Leave empty to use the service price. A session with no price at all cannot be booked online."><input name="price" inputMode="decimal" defaultValue={x?.price_cents != null ? x.price_cents / 100 : ""} className="admin-input" /></Field>
        <Field label="Instructor"><input name="instructor" defaultValue={x?.instructor} className="admin-input" /></Field>
        <Field label="Status"><select name="status" defaultValue={x?.status ?? "draft"} className="admin-input"><option value="draft">Draft (hidden)</option><option value="published">Published</option></select></Field>
        <Field label="Internal notes" wide><input name="notes" defaultValue={x?.notes} className="admin-input" /></Field>
      </div>
    </AdminForm>
  );

  return (
    <>
      <Title title="Schedule & availability" sub={`The studio is one shared room. Classes and rentals are checked against each other, including setup and cleanup buffers. Times are in ${tz}.`} />

      <Card title="Studio calendar"><MonthCalendar month={month} events={events} tz={tz} basePath="/admin/schedule" day={/^\d{4}-\d{2}-\d{2}$/.test(sp.day ?? "") ? sp.day : undefined} /></Card>
      {/^\d{4}-\d{2}-\d{2}$/.test(sp.day ?? "") ? <DayBookings day={sp.day!} tz={tz} /> : <p className="mt-3 text-sm text-ink/60">Click a date to see all bookings on that day.</p>}

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Card title={editing ? "Edit class session" : "Add class session"}>
          {services.rows.length === 0 ? <Empty>Create a service with booking type &quot;class&quot; first.</Empty> : renderSessionForm(editing)}
          {editing ? <a href="/admin/schedule" className="mt-3 inline-block text-sm underline">Cancel editing</a> : null}
        </Card>
        <Card title="Upcoming sessions">
          {sessions.rows.length === 0 ? <Empty>No sessions yet.</Empty> : (
            <ul className="divide-y divide-plum/10">
              {sessions.rows.map((x: any) => (
                <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div><p className="font-semibold">{x.title} <Badge v={x.status} /></p><p className="text-sm text-ink/65">{fmtDateTime(x.starts_at, tz)} · {x.booked}/{x.capacity} seats</p></div>
                  {x.status !== "cancelled" ? (
                    <div className="flex gap-2"><a href={`/admin/schedule?edit=${x.id}`} className="inline-flex min-h-10 items-center rounded-full border border-plum/30 px-4 text-sm font-semibold text-plum">Edit</a>
                      <ActionButton action={cancelSession.bind(null, x.id)} confirm={`Cancel this session? ${x.booked ? "Its bookings will be cancelled too." : ""}`}>Cancel</ActionButton></div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Card title="Rental hours, lead time and buffers">
          <AdminForm action={saveAvailability}>
            <div className="space-y-2">
              {b.rentalHours.map((d, i) => (
                <div key={i} className="grid grid-cols-[7rem_1fr_1fr] items-center gap-3">
                  <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" name={`en${i}`} defaultChecked={d.enabled} className="h-5 w-5 accent-[#15120e]" />{DAYS[i].slice(0, 3)}</label>
                  <input type="time" name={`open${i}`} defaultValue={d.open} aria-label={`${DAYS[i]} opens`} className="admin-input" />
                  <input type="time" name={`close${i}`} defaultValue={d.close} aria-label={`${DAYS[i]} closes`} className="admin-input" />
                </div>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Timezone" hint="IANA name, e.g. America/Toronto"><input name="timezone" defaultValue={tz} className="admin-input" /></Field>
              <Field label="Minimum notice (hours)"><input name="lead" type="number" min={0} defaultValue={b.leadTimeHours} className="admin-input" /></Field>
              <Field label="Setup buffer before (minutes)"><input name="before" type="number" min={0} defaultValue={b.bufferBeforeMin} className="admin-input" /></Field>
              <Field label="Cleanup buffer after (minutes)"><input name="after" type="number" min={0} defaultValue={b.bufferAfterMin} className="admin-input" /></Field>
              <Field label="Shortest rental (hours)"><input name="minHours" type="number" step="0.5" min={0.5} defaultValue={b.minHours} className="admin-input" /></Field>
              <Field label="Longest rental (hours)"><input name="maxHours" type="number" step="0.5" defaultValue={b.maxHours} className="admin-input" /></Field>
              <Field label="Start-time step (minutes)"><select name="step" defaultValue={b.slotStepMin} className="admin-input"><option>15</option><option>30</option><option>60</option></select></Field>
              <Field label="Max sessions per request"><input name="slots" type="number" min={1} max={24} defaultValue={b.maxSlotsPerBooking} className="admin-input" /></Field>
              <Field label="Max people per rental" hint="Set to what the room safely holds."><input name="att" type="number" min={1} defaultValue={b.rentalMaxAttendees} className="admin-input" /></Field>
            </div>
          </AdminForm>
        </Card>
        <Card title="Blocked dates">
          <AdminForm action={addBlockedDate} submitLabel="Block dates" resetOnSuccess>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="From"><input type="date" name="from" required className="admin-input" /></Field>
              <Field label="To (optional)"><input type="date" name="to" className="admin-input" /></Field>
              <Field label="Reason"><input name="reason" className="admin-input" /></Field>
            </div>
          </AdminForm>
          <ul className="mt-6 divide-y divide-plum/10">
            {blocked.rows.length === 0 ? <li><Empty>No blocked dates.</Empty></li> : blocked.rows.map((x: any) => (
              <li key={x.id} className="flex items-center justify-between gap-3 py-2"><span>{x.a === x.b ? x.a : `${x.a} to ${x.b}`} <span className="text-sm text-ink/60">{x.reason}</span></span>
                <ActionButton action={deleteRow.bind(null, "blocked_dates", x.id)}>Remove</ActionButton></li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
