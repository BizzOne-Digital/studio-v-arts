import Link from "next/link";
import { col } from "@/lib/db";
import { money } from "@/lib/format";
import { addDays, fmtDay, fmtTime, zonedToUtc } from "@/lib/time";
import { Badge, Card, Empty } from "./server-ui";

/** Everything on one calendar day: studio bookings (by room) and classes, in time order. */
export async function DayBookings({ day, tz }: { day: string; tz: string }) {
  const from = zonedToUtc(day, "00:00", tz);
  const to = zonedToUtc(addDays(day, 1), "00:00", tz);
  const [slots, sessions] = await Promise.all([
    (await col("booking_slots")).find({ starts_at: { $gte: from, $lt: to } }).toArray(),
    (await col("sessions")).find({ status: { $ne: "cancelled" }, starts_at: { $gte: from, $lt: to } }).toArray(),
  ]);
  const bookings = slots.length ? await (await col("bookings")).find({ _id: { $in: [...new Set(slots.map((x) => x.booking_id))] } } as any).toArray() : [];
  const bMap = new Map(bookings.map((b) => [b.id as string, b]));
  const svc = sessions.length ? await (await col("services")).find({ _id: { $in: [...new Set(sessions.map((x) => x.service_id))] } } as any).toArray() : [];
  const titles = new Map(svc.map((x) => [x.id as string, x.title as string]));

  type Row = { at: Date; end: Date; key: string; title: string; sub: string; status: string; pay?: string; total?: number; href: string };
  const rows: Row[] = [
    ...slots.filter((x) => bMap.has(x.booking_id) && x.active !== false).map((x) => {
      const b = bMap.get(x.booking_id)!;
      return { at: x.starts_at as Date, end: x.ends_at as Date, key: "s" + x.id, title: `${b.room_name || "Studio"}: ${b.customer_name}`, sub: [b.reference, b.category, b.activity, b.customer_phone].filter(Boolean).join(" · "), status: b.status as string, pay: b.payment_status as string, total: b.total_cents as number, href: `/admin/bookings/${b.id}` };
    }),
    ...sessions.map((x) => ({ at: x.starts_at as Date, end: x.ends_at as Date, key: "c" + x.id, title: `Class: ${titles.get(x.service_id) ?? "Class"}`, sub: `${x.capacity} seats`, status: x.status as string, href: "/admin/schedule" })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  return (
    <Card title={fmtDay(day)} className="mt-6">
      {rows.length === 0 ? <Empty>No bookings or classes on this date.</Empty> : (
        <ul className="divide-y divide-plum/10">
          {rows.map((r) => (
            <li key={r.key} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
              <div className="min-w-0">
                <p className="font-semibold">{fmtTime(r.at, tz)} - {fmtTime(r.end, tz, true)}</p>
                <p><Link className="font-semibold text-plum underline" href={r.href}>{r.title}</Link></p>
                <p className="text-sm text-ink/65">{r.sub}</p>
              </div>
              <div className="flex items-center gap-2">
                {r.total != null ? <span className="text-sm">{money(r.total)}</span> : null}
                {r.pay ? <Badge v={r.pay} /> : null}
                <Badge v={r.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
