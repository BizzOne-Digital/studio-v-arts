import Link from "next/link";
import { Badge, Card, Empty, Stat, Title, Warn } from "@/components/admin/server-ui";
import { loadOffers, loadUsage } from "@/lib/booking";
import { col } from "@/lib/db";
import { bookingsWithWhen } from "@/lib/admin-data";
import { money } from "@/lib/format";
import { emailConfigured, getSettings, hasAddress, launchChecklist } from "@/lib/settings";
import { fmtDateTime } from "@/lib/time";
import { setLive } from "./actions";
import { ActionButton } from "@/components/admin/ui";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const s = await getSettings();
  const tz = s.booking.timezone;
  const bk = await col("bookings");
  const [counts, upcomingAll, pending, offers, usage] = await Promise.all([
    Promise.all([
      bk.countDocuments({ status: "pending" }), bk.countDocuments({ status: "confirmed" }), bk.countDocuments({ status: "completed" }),
      col("services").then((c) => c.countDocuments({ status: "published" })),
      col("sessions").then((c) => c.countDocuments({ status: "published", starts_at: { $gt: new Date() } })),
      col("contact_messages").then((c) => c.countDocuments({ status: "new" })),
      bk.aggregate([{ $match: { status: { $in: ["confirmed", "completed"] } } }, { $group: { _id: null, v: { $sum: "$total_cents" } } }]).toArray(),
      col("testimonials").then((c) => c.countDocuments({ status: "published" })),
    ]),
    bookingsWithWhen({ status: { $in: ["pending", "confirmed"] } }),
    bookingsWithWhen({ status: "pending" }, { limit: 6 }),
    loadOffers(), loadUsage(),
  ]);
  const n = { pending: counts[0], confirmed: counts[1], completed: counts[2], services: counts[3], sessions: counts[4], messages: counts[5], value: counts[6][0]?.v ?? 0, quotes: counts[7] };
  const upcoming = { rows: upcomingAll.filter((x) => x.at && x.at >= new Date()).sort((x, y) => x.at!.getTime() - y.at!.getTime()).slice(0, 8) };
  const hasPrice = s.booking.regularRateCents != null || offers.some((o) => o.active && (o.kind === "flat_rate" || o.kind === "package"));
  const list = launchChecklist(s, hasPrice);
  const missing = list.filter((x) => !x.ok);
  const limited = offers.filter((o) => o.limit_count);

  return (
    <>
      <Title title="Dashboard" sub="Everything here is calculated from your live records." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Pending requests" value={n.pending} href="/admin/bookings?status=pending" tone={n.pending ? "warn" : undefined} />
        <Stat label="Confirmed bookings" value={n.confirmed} href="/admin/bookings?status=confirmed" />
        <Stat label="Published services" value={n.services} href="/admin/services" />
        <Stat label="Upcoming sessions" value={n.sessions} href="/admin/schedule" />
        <Stat label="Completed bookings" value={n.completed} />
        <Stat label="Value, confirmed + completed" value={money(n.value)} />
        <Stat label="New messages" value={n.messages} href="/admin/messages" tone={n.messages ? "warn" : undefined} />
        <Stat label="Published testimonials" value={n.quotes} href="/admin/testimonials" />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Card title="Upcoming bookings">
          {upcoming.rows.length === 0 ? <Empty>No upcoming pending or confirmed bookings.</Empty> : (
            <ul className="divide-y divide-plum/10">
              {upcoming.rows.map((b: any) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div><Link href={`/admin/bookings/${b.id}`} className="font-semibold text-plum underline">{b.reference}</Link> <span className="text-sm text-ink/70">{b.kind === "class" ? b.title : "Studio rental"} · {b.customer_name}</span>
                    <p className="text-sm text-ink/60">{fmtDateTime(b.at, tz)}</p></div>
                  <Badge v={b.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Latest pending requests">
          {pending.length === 0 ? <Empty>Nothing waiting for review.</Empty> : (
            <ul className="divide-y divide-plum/10">
              {pending.map((b: any) => (
                <li key={b.id} className="flex items-center justify-between gap-2 py-3">
                  <span><Link href={`/admin/bookings/${b.id}`} className="font-semibold text-plum underline">{b.reference}</Link> <span className="text-sm text-ink/70">{b.customer_name} · {b.kind}</span></span>
                  <span className="text-sm">{money(b.total_cents)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {limited.length ? (
        <Card title="Promotion usage" className="mt-6">
          <ul className="space-y-2">
            {limited.map((o) => (
              <li key={o.id} className="flex flex-wrap justify-between gap-2">
                <span>{o.title} <Badge v={o.active ? "active" : "inactive"} /></span>
                <span className="font-semibold">{usage[o.id] ?? 0} of {o.limit_count} used</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink/60">One rental booking counts once, however many hours it contains. Pending requests hold a place; declined and cancelled bookings release it.</p>
        </Card>
      ) : null}
    </>
  );
}
