import { daySlots } from "@/lib/booking";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const r = await daySlots(u.searchParams.get("room") ?? "", u.searchParams.get("date") ?? "");
  return Response.json(r, { headers: { "Cache-Control": "no-store" } });
}
