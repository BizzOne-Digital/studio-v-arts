import { availabilityFor } from "@/lib/booking";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const minutes = Number(u.searchParams.get("minutes"));
  if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 1440) return Response.json({ starts: [], reason: "Invalid duration." }, { status: 400 });
  const r = await availabilityFor(u.searchParams.get("date") ?? "", minutes);
  return Response.json(r, { headers: { "Cache-Control": "no-store" } });
}
