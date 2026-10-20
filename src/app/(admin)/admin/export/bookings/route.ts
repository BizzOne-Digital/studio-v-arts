import { getAdmin } from "@/lib/auth";
import { bookingsWithWhen } from "@/lib/admin-data";
import { getSettings } from "@/lib/settings";
import { fmtDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

// Spreadsheet apps execute cells starting with = + - @ as formulas. Neutralise them.
const cell = (v: unknown) => {
  let t = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
  return `"${t.replace(/"/g, '""')}"`;
};

export async function GET(req: Request) {
  if (!(await getAdmin())) return new Response("Unauthorized", { status: 401 });
  const u = new URL(req.url);
  const s = await getSettings();
  const f: Record<string, any> = {};
  const st = u.searchParams.get("status"), kind = u.searchParams.get("kind"), q = u.searchParams.get("q");
  if (st) f.status = st;
  if (kind === "class" || kind === "rental") f.kind = kind;
  if (q?.trim()) {
    const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    f.$or = [{ customer_name: rx }, { customer_email: rx }, { reference: rx }];
  }
  const rows = await bookingsWithWhen(f);
  const head = ["Reference", "Type", "Status", "Payment", "Customer", "Email", "Phone", "People", "What", `When (${s.booking.timezone})`, "Subtotal CAD", "Tax CAD", "Total CAD", "Customer notes", "Internal notes", "Created (UTC)"];
  const lines = [head.map(cell).join(",")];
  for (const b of rows)
    lines.push([b.reference, b.kind, b.status, b.payment_status, b.customer_name, b.customer_email, b.customer_phone, b.attendees,
      b.kind === "class" ? b.title : `Rental: ${b.activity}`, b.at ? fmtDateTime(b.at, s.booking.timezone, false) : "",
      (b.subtotal_cents / 100).toFixed(2), (b.tax_cents / 100).toFixed(2), (b.total_cents / 100).toFixed(2), b.customer_notes, b.internal_notes, new Date(b.created_at).toISOString()].map(cell).join(","));
  return new Response("﻿" + lines.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="studio-v-bookings.csv"`, "Cache-Control": "no-store" },
  });
}
