import Link from "next/link";
import { Badge, Empty, Title } from "@/components/admin/server-ui";
import { MonthCalendar, loadMonthEvents } from "@/components/admin/MonthCalendar";
import { bookingsWithWhen } from "@/lib/admin-data";
import { money } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { dateStrIn, fmtDateTime } from "@/lib/time";
import { cn } from "@/lib/cn";

export const metadata = { title: "Bookings" };
const STATUSES = ["pending", "confirmed", "completed", "declined", "cancelled"];

export default async function Bookings({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; kind?: string; view?: string; month?: string }> }) {
  const sp = await searchParams;
  const s = await getSettings();
  const tz = s.booking.timezone;
  const view = sp.view === "calendar" ? "calendar" : "list";
  const qs = new URLSearchParams(Object.entries({ q: sp.q, status: sp.status, kind: sp.kind }).filter(([, v]) => v) as [string, string][]).toString();

  let body: React.ReactNode;
  if (view === "calendar") {
    const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : dateStrIn(new Date(), tz).slice(0, 7);
    body = <MonthCalendar month={month} tz={tz} events={await loadMonthEvents(month, tz)} basePath="/admin/bookings" extra="&view=calendar" />;
  } else {
    const f: Record<string, any> = {};
    if (sp.status && STATUSES.includes(sp.status)) f.status = sp.status;
    if (sp.kind === "class" || sp.kind === "rental") f.kind = sp.kind;
    if (sp.q?.trim()) {
      const rx = new RegExp(sp.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      f.$or = [{ customer_name: rx }, { customer_email: rx }, { reference: rx }, { customer_phone: rx }];
    }
    const rows = await bookingsWithWhen(f, { limit: 200 });
    body = rows.length === 0 ? <Empty>No bookings match. Bookings appear here as soon as someone submits a request.</Empty> : (
      <div className="overflow-x-auto rounded-3xl border border-plum/10 bg-white">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="bg-sand text-xs uppercase tracking-wide text-ink/70"><tr>{["Reference", "Customer", "What", "When", "People", "Total", "Status", "Payment"].map((h) => <th key={h} scope="col" className="p-3">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-plum/10">
            {rows.map((b: any) => (
              <tr key={b.id} className="hover:bg-lilac/30">
                <td className="p-3"><Link className="font-semibold text-plum underline" href={`/admin/bookings/${b.id}`}>{b.reference}</Link></td>
                <td className="p-3">{b.customer_name}<br /><span className="text-xs text-ink/60">{b.customer_email}</span></td>
                <td className="p-3">{b.kind === "class" ? b.title : "Studio rental"}</td>
                <td className="p-3">{b.at ? fmtDateTime(b.at, tz) : "-"}</td>
                <td className="p-3">{b.attendees}</td>
                <td className="p-3">{money(b.total_cents)}</td>
                <td className="p-3"><Badge v={b.status} /></td>
                <td className="p-3"><Badge v={b.payment_status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <Title title="Bookings" sub="Review requests, confirm or decline, and keep private notes." action={<a className="rounded-full border border-plum/30 px-5 py-2.5 text-sm font-semibold text-plum hover:bg-lilac" href={`/admin/export/bookings?${qs}`}>Export CSV</a>} />
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div role="group" aria-label="View" className="flex rounded-full border border-plum/30 p-1">
          {(["list", "calendar"] as const).map((v) => <Link key={v} href={`/admin/bookings?${qs}${qs ? "&" : ""}view=${v}`} aria-current={view === v ? "true" : undefined} className={cn("min-h-10 rounded-full px-5 py-2 text-sm font-semibold capitalize", view === v ? "bg-plum text-white" : "text-plum")}>{v}</Link>)}
        </div>
        {view === "list" ? (
          <form className="flex flex-wrap items-end gap-3" role="search">
            <label className="text-sm font-semibold text-plum">Search<input name="q" defaultValue={sp.q} placeholder="Name, email, phone, reference" className="admin-input mt-1 w-64" /></label>
            <label className="text-sm font-semibold text-plum">Status<select name="status" defaultValue={sp.status ?? ""} className="admin-input mt-1"><option value="">All</option>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="text-sm font-semibold text-plum">Type<select name="kind" defaultValue={sp.kind ?? ""} className="admin-input mt-1"><option value="">All</option><option>class</option><option>rental</option></select></label>
            <button className="min-h-11 rounded-full bg-plum px-6 text-sm font-semibold text-white">Filter</button>
          </form>
        ) : null}
      </div>
      {body}
    </>
  );
}
