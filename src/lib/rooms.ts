import "server-only";
import { cached } from "./cache";
import { col } from "./db";
import { mediaSrc } from "./media";

export type Room = {
  id: string; slug: string; name: string; description: string; sizeSqFt: number | null;
  priceCents: number; afterPriceCents: number | null; priceUntil: string | null; priceNote: string;
  capacity: number; minHours: number; uses: string[]; image: string | null; imageAlt: string; active: boolean;
};

export const mapRoom = (r: any): Room => ({
  id: r.id, slug: r.slug, name: r.name, description: r.description ?? "", sizeSqFt: r.size_sqft ?? null,
  priceCents: r.price_cents, afterPriceCents: r.after_price_cents ?? null, priceUntil: r.price_until ?? null, priceNote: r.price_note ?? "",
  capacity: r.capacity, minHours: r.min_hours ?? 1, uses: r.uses ?? [], image: r.image_url || mediaSrc(r.image_id), imageAlt: r.image_alt ?? "", active: r.active !== false,
});

async function loadRooms(): Promise<Room[]> {
  const rows = await (await col("rooms")).find({ active: { $ne: false } }).sort({ sort_order: 1, created_at: 1 }).toArray();
  return rows.map(mapRoom);
}
export const getRooms = cached("rooms", ["content"], loadRooms);

/** Hourly price today: the introductory price until its end date (if one is set), then the "after" price. */
export function roomRate(room: Pick<Room, "priceCents" | "afterPriceCents" | "priceUntil">, todayStr: string) {
  if (room.priceUntil && todayStr > room.priceUntil && room.afterPriceCents != null) return room.afterPriceCents;
  return room.priceCents;
}

/** The first room is the main studio. Classes and legacy bookings without a room belong to it. */
export async function mainRoomId() {
  const r = await (await col("rooms")).find({}).sort({ sort_order: 1, created_at: 1 }).limit(1).toArray();
  return (r[0]?.id as string | undefined) ?? null;
}
