import "server-only";
import { col } from "./db";
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
    what = `Studio rental${b.activity ? `: ${b.activity}` : ""}`;
    const slots = await (await col("booking_slots")).find({ booking_id: id }).sort({ starts_at: 1 }).toArray();
    when = slots.map((x) => fmtRange(x.starts_at, x.ends_at, tz)).join("\n");
  }
  return { s, b, what, when };
}

const sign = (name: string) => `\n\nWarm regards,\n${name}`;

/** Sends request acknowledgement + studio notification. Returns whether the customer email was actually sent. */
export async function notifyNewBooking(id: string): Promise<{ customerEmailed: boolean }> {
  if (!emailConfigured()) return { customerEmailed: false };
  const d = await describe(id);
  if (!d) return { customerEmailed: false };
  const { s, b, what, when } = d;
  const customerEmailed = await sendMail(
    b.customer_email,
    `We received your booking request (${b.reference})`,
    `Hello ${b.customer_name},\n\nThank you for your booking request. This is a request only. It is not confirmed until our team approves it, and we will email you when its status changes.\n\nReference: ${b.reference}\nWhat: ${what}\nWhen:\n${when}\nPeople: ${b.attendees}\nEstimated total: ${money(b.total_cents)} CAD${sign(s.business.shortName)}`,
  );
  await sendMail(
    await studioInbox(),
    `New ${b.kind} booking request ${b.reference}`,
    `${b.customer_name} <${b.customer_email}>, ${b.customer_phone}\n${what}\n${when}\nPeople: ${b.attendees}\nTotal: ${money(b.total_cents)} CAD\nNotes: ${b.customer_notes || "-"}`,
  );
  return { customerEmailed };
}

export async function notifyStatus(id: string, status: string): Promise<boolean> {
  if (!emailConfigured() || !["confirmed", "cancelled", "declined"].includes(status)) return false;
  const d = await describe(id);
  if (!d) return false;
  const { s, b, what, when } = d;
  const line = {
    confirmed: "Good news: your booking is confirmed.",
    cancelled: "Your booking has been cancelled.",
    declined: "Unfortunately we are unable to accommodate this booking request.",
  }[status];
  return sendMail(
    b.customer_email,
    `Booking ${status}: ${b.reference}`,
    `Hello ${b.customer_name},\n\n${line}\n\nReference: ${b.reference}\nWhat: ${what}\nWhen:\n${when}${sign(s.business.shortName)}`,
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
  await sendMail(m.email, "We received your message", `Hello ${m.name},\n\nThank you for contacting ${s.business.shortName}. We have your message and will reply as soon as we can.${sign(s.business.shortName)}`);
  return ok;
}
