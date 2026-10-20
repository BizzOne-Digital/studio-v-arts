import "server-only";
import { col } from "./db";

export type BookingRow = Record<string, any> & { id: string; title: string | null; at: Date | null };

/** Bookings joined with their class title and first start time (class session or first rental slot). */
export async function bookingsWithWhen(filter: Record<string, unknown> = {}, opts: { limit?: number; sort?: Record<string, 1 | -1> } = {}): Promise<BookingRow[]> {
  let cur = (await col("bookings")).find(filter).sort(opts.sort ?? { created_at: -1 });
  if (opts.limit) cur = cur.limit(opts.limit);
  const rows = await cur.toArray();
  if (!rows.length) return [];
  const sessionIds = [...new Set(rows.map((r) => r.session_id).filter(Boolean))];
  const serviceIds = [...new Set(rows.map((r) => r.service_id).filter(Boolean))];
  const rentalIds = rows.filter((r) => r.kind === "rental").map((r) => r.id);
  const [sessions, services, slots] = await Promise.all([
    sessionIds.length ? (await col("sessions")).find({ _id: { $in: sessionIds } } as any).toArray() : [],
    serviceIds.length ? (await col("services")).find({ _id: { $in: serviceIds } } as any).toArray() : [],
    rentalIds.length ? (await col("booking_slots")).find({ booking_id: { $in: rentalIds } }).sort({ starts_at: 1 }).toArray() : [],
  ]);
  const sMap = new Map(sessions.map((x) => [x.id, x]));
  const vMap = new Map(services.map((x) => [x.id, x]));
  const first = new Map<string, Date>();
  for (const sl of slots) if (!first.has(sl.booking_id)) first.set(sl.booking_id, sl.starts_at);
  return rows.map((r) => ({
    ...r,
    id: r.id,
    title: r.service_id ? vMap.get(r.service_id)?.title ?? null : null,
    at: r.kind === "class" ? sMap.get(r.session_id)?.starts_at ?? null : first.get(r.id) ?? null,
  }));
}
