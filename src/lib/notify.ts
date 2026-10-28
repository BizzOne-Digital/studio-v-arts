import "server-only";
import { col } from "./db";
import { BRAND_FULL } from "./brand";
import { money } from "./format";
import { sendMail, studioInbox } from "./mail";
import { emailConfigured, getSettings } from "./settings";
import { fmtRange } from "./time";

async function describe(id: string) {
  const s = await getSettings();
  const tz = s.booking.timezone;
  const b = await (await col("bookings")).findOne({ _id: id } as any);
  if (!b) return null;
  let when = "";
  let what = "";
  if (b.kind === "class") {
    const [ses, svc] = await Promise.all([
      (await col("sessions")).findOne({ _id: b.session_id } as any),
      (await col("services")).findOne({ _id: b.service_id } as any),
    ]);
    what = svc?.title ?? "Class";
    when = ses ? fmtRange(ses.starts_at, ses.ends_at, tz) : "";
  } else {
    what = `${b.room_name || "Studio"}${b.category ? `, ${b.category}` : ""}`;
    const slots = await (await col("booking_slots")).find({ booking_id: id }).sort({ starts_at: 1 }).toArray();
    when = slots.map((x) => fmtRange(x.starts_at, x.ends_at, tz)).join("\n");
  }
  return { s, b, what, when };
}

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const paras = (t: string) => t.split(/\n+/).filter(Boolean).map((l) => `<p style="margin:0 0 10px">${esc(l)}</p>`).join("");

function layout(title: string, rows: [string, string][], blocks: string[]) {
  return `<!doctype html><html><body style="margin:0;background:#f6f4ef;font-family:Arial,Helvetica,sans-serif;color:#1c1a17">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="background:#111;color:#e6cf8b;padding:22px 26px;border-radius:14px 14px 0 0"><div style="font-size:22px;letter-spacing:.04em">${esc(BRAND_FULL)}</div></div>
<div style="background:#fff;padding:26px;border-radius:0 0 14px 14px">
<h2 style="margin:0 0 16px;font-size:20px">${esc(title)}</h2>
<table style="width:100%;border-collapse:collapse;font-size:14px">${rows.map(([k, v]) => `<tr><td style="padding:7px 0;color:#6b665c;width:34%;vertical-align:top">${esc(k)}</td><td style="padding:7px 0;white-space:pre-line">${esc(v)}</td></tr>`).join("")}</table>
${blocks.join("")}
</div></div></body></html>`;
}

const summaryRows = (d: NonNullable<Awaited<ReturnType<typeof describe>>>): [string, string][] => [
  ["Reference", d.b.reference], ["Booking", d.what], ["When", d.when], ["People", String(d.b.attendees)], ["Total", `${money(d.b.total_cents)} CAD`],
];

/** Request received: acknowledgement + payment details to the customer, and a notification to the studio. */
export async function notifyNewBooking(id: string): Promise<{ customerEmailed: boolean }> {
  if (!emailConfigured()) return { customerEmailed: false };
  const d = await describe(id);
  if (!d) return { customerEmailed: false };
  const { s, b } = d;
  const pay = `Pay by Interac e-transfer to ${s.payment.interacEmail} and include the reference ${b.reference} in the message.\n${s.payment.instructions}`;
  const customerEmailed = await sendMail(
    b.customer_email,
    `We received your booking request (${b.reference})`,
    `Hello ${b.customer_name},\n\nThank you for your booking request. It is Pending until we confirm your payment, and we will email you again once it is confirmed.\n\nReference: ${b.reference}\nBooking: ${d.what}\nWhen:\n${d.when}\nPeople: ${b.attendees}\nTotal: ${money(b.total_cents)} CAD\n\n${pay}\n\n${BRAND_FULL}`,
    layout("We received your booking request", summaryRows(d), [
      `<div style="margin-top:18px;padding:14px 16px;background:#faf3df;border-radius:10px;font-size:14px"><strong>Pay by Interac e-transfer</strong><br>Send to <strong>${esc(s.payment.interacEmail)}</strong> and include <strong>${esc(b.reference)}</strong> in the message.${paras(s.payment.instructions)}</div>`,
      `<p style="font-size:13px;color:#6b665c;margin-top:16px">Your booking is Pending until the studio confirms your payment. You will receive another email when it is confirmed.</p>`,
    ]),
  );
  await sendMail(
    await studioInbox(),
    `New booking request ${b.reference}: ${d.what}`,
    `${b.customer_name} <${b.customer_email}>, ${b.customer_phone}\n${d.what}\n${d.when}\nPeople: ${b.attendees}\nReason: ${b.activity || "-"}\nTotal: ${money(b.total_cents)} CAD\nNotes: ${b.customer_notes || "-"}\n\nOpen the admin panel to confirm once the Interac e-transfer arrives.`,
    layout("New booking request", [...summaryRows(d), ["Customer", `${b.customer_name}\n${b.customer_email}\n${b.customer_phone}`], ["Reason", b.activity || "-"], ["Notes", b.customer_notes || "-"]], [
      `<p style="font-size:13px;color:#6b665c;margin-top:16px">Confirm it in the admin panel once the Interac e-transfer arrives.</p>`,
    ]),
  );
  return { customerEmailed };
}

/** Status change emails. "confirmed" includes the studio's instructions text from the admin settings. */
export async function notifyStatus(id: string, status: string): Promise<boolean> {
  if (!emailConfigured() || !["confirmed", "cancelled", "declined"].includes(status)) return false;
  const d = await describe(id);
  if (!d) return false;
  const { s, b } = d;
  const line = {
    confirmed: "Your booking is confirmed. We have received your payment.",
    cancelled: "Your booking has been cancelled.",
    declined: "Unfortunately we are unable to accommodate this booking request.",
  }[status]!;
  const extra = status === "confirmed" ? s.payment.confirmInstructions.trim() : "";
  return sendMail(
    b.customer_email,
    `Booking ${status}: ${b.reference}`,
    `Hello ${b.customer_name},\n\n${line}\n\nReference: ${b.reference}\nBooking: ${d.what}\nWhen:\n${d.when}${extra ? `\n\n${extra}` : ""}\n\n${BRAND_FULL}`,
    layout(status === "confirmed" ? "Your booking is confirmed" : `Booking ${status}`, summaryRows(d), [
      `<p style="margin-top:16px;font-size:14px">${esc(line)}</p>`,
      extra ? `<div style="margin-top:14px;padding:14px 16px;background:#faf3df;border-radius:10px;font-size:14px"><strong>Please note</strong>${paras(extra)}</div>` : "",
    ]),
  );
}

export async function notifyContact(m: { name: string; email: string; phone: string; subject: string; message: string }) {
  if (!emailConfigured()) return false;
  const s = await getSettings();
  const ok = await sendMail(
    await studioInbox(),
    `Website message: ${m.subject || "General enquiry"}`,
    `From: ${m.name} <${m.email}> ${m.phone}\n\n${m.message}`,
  );
  await sendMail(m.email, "We received your message", `Hello ${m.name},\n\nThank you for contacting ${s.business.shortName}. We have your message and will reply as soon as we can.\n\n${BRAND_FULL}`);
  return ok;
}
