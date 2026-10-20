import Link from "next/link";
import { cn } from "@/lib/cn";
import { addDays, dateStrIn, pad, timeStrIn } from "@/lib/time";
import { col } from "@/lib/db";

export type CalEvent = { at: Date; label: string; kind: "class" | "rental"; status: string; href: string };

/** Loads classes and rentals for one month so the calendar shows the single shared studio schedule. */
export async function loadMonthEvents(month: string, tz: string): Promise<CalEvent[]> {
  const [y, m] = month.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1) - 36 * 3600_000);
  const to = new Date(Date.UTC(y, m, 1) + 36 * 3600_000);
  const sessions = await (await col("sessions")).find({ status: { $ne: "cancelled" }, starts_at: { $gte: from, $lt: to } }).toArray();
  const svc = await (await col("services")).find({ _id: { $in: [...new Set(sessions.map((x) => x.service_id))] } } as any).toArray();
  const titles = new Map(svc.map((x) => [x.id as string, x.title as string]));
  const slotRows = await (await col("booking_slots")).find({ starts_at: { $gte: from, $lt: to } }).toArray();
  const bks = await (await col("bookings")).find({ _id: { $in: [...new Set(slotRows.map((x) => x.booking_id))] }, status: { $in: ["pending", "confirmed", "completed"] } } as any).toArray();
  const bMap = new Map(bks.map((x) => [x.id as string, x]));
  return [
    ...sessions.map((r) => ({ at: r.starts_at as Date, label: titles.get(r.service_id) ?? "Class", kind: "class" as const, status: r.status as string, href: "/admin/schedule" })),
    ...slotRows.filter((r) => bMap.has(r.booking_id)).map((r) => ({ at: r.starts_at as Date, label: "Rental: " + bMap.get(r.booking_id).customer_name, kind: "rental" as const, status: bMap.get(r.booking_id).status as string, href: "/admin/bookings/" + r.booking_id })),
  ].filter((e) => dateStrIn(e.at, tz).startsWith(month));
}

export function MonthCalendar({ month, events, tz, basePath, extra = "" }: { month: string; events: CalEvent[]; tz: string; basePath: string; extra?: string }) {
  const [y, m] = month.split("-").map(Number);
  const first = `${y}-${pad(m)}-01`;
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`)];
  while (cells.length % 7) cells.push(null);
  const by = new Map<string, CalEvent[]>();
  for (const e of events) by.set(dateStrIn(e.at, tz), [...(by.get(dateStrIn(e.at, tz)) ?? []), e]);
  const shift = (n: number) => { const d = new Date(Date.UTC(y, m - 1 + n, 1)); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`; };
  const today = dateStrIn(new Date(), tz);
  void addDays; void first;
  const title = new Intl.DateTimeFormat("en-CA", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Link className="rounded-full border border-plum/30 px-4 py-2 text-sm font-semibold" href={`${basePath}?month=${shift(-1)}${extra}`}>&larr; Prev</Link>
        <h3 className="display text-2xl text-plum">{title}</h3>
        <Link className="rounded-full border border-plum/30 px-4 py-2 text-sm font-semibold" href={`${basePath}?month=${shift(1)}${extra}`}>Next &rarr;</Link>
      </div>
      <p className="mb-2 flex gap-4 text-xs"><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-plum" />Class</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-champagne" />Rental</span><span>Times in {tz}</span></p>
      <div className="overflow-x-auto">
        <div className="grid min-w-[44rem] grid-cols-7 gap-px rounded-2xl bg-plum/15 text-sm" role="grid" aria-label={`Studio calendar for ${title}`}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} role="columnheader" className="bg-sand p-2 text-center font-semibold">{d}</div>)}
          {cells.map((d, i) => (
            <div key={i} role="gridcell" className={cn("min-h-28 bg-white p-1.5", !d && "bg-ivory", d === today && "ring-2 ring-inset ring-plum")}>
              {d ? <p className="mb-1 text-xs font-semibold text-ink/60">{+d.slice(8)}</p> : null}
              <ul className="space-y-1">
                {(d ? by.get(d) ?? [] : []).sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, 4).map((e, k) => (
                  <li key={k}><Link href={e.href} className={cn("block truncate rounded-md px-1.5 py-0.5 text-xs", e.kind === "class" ? "bg-plum text-white" : "bg-champagne-soft text-plum-deep", e.status === "pending" && "opacity-70 outline-dashed outline-1")}>
                    {timeStrIn(e.at, tz)} {e.label}</Link></li>
                ))}
                {d && (by.get(d)?.length ?? 0) > 4 ? <li className="text-xs text-ink/60">+{by.get(d)!.length - 4} more</li> : null}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-ink/60">Dashed outline = pending or draft.</p>
    </div>
  );
}
