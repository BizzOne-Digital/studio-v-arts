import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { BRAND_NAME } from "./brand";
import { emailConfigured, getSettings } from "./settings";

/** Test hook: with EMAIL_TEST_JSON set, messages are captured here instead of being sent. */
export const testOutbox: { to: string; subject: string; text: string; html?: string }[] = [];

let smtp: Transporter | null = null;
function transport() {
  smtp ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return smtp;
}

/**
 * Sends an email. Uses SMTP (for example a Gmail app password) when SMTP_USER and SMTP_PASS are set,
 * otherwise Resend when RESEND_API_KEY and EMAIL_FROM are set. Returns true only if the provider accepted the message.
 */
export async function sendMail(to: string, subject: string, text: string, html?: string, opts: { replyTo?: string } = {}): Promise<boolean> {
  if (!emailConfigured() || !to) return false;
  // Gmail only delivers as the signed-in account, so the From address is always that account, with the studio's display name.
  const user = process.env.SMTP_USER;
  const from = user ? `"${BRAND_NAME}" <${user}>` : process.env.EMAIL_FROM;
  const replyTo = opts.replyTo || user || undefined;
  if (process.env.EMAIL_TEST_JSON) { testOutbox.push({ to, subject, text, html }); return true; }
  try {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transport().sendMail({ from, to, subject, text, html, replyTo, headers: { "X-Auto-Response-Suppress": "OOF, AutoReply" } });
      return true;
    }
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text, html, reply_to: replyTo }),
    });
    if (!r.ok) console.error("Email provider rejected message", r.status);
    return r.ok;
  } catch (e) {
    console.error("Email send failed", e);
    return false;
  }
}

/** Where studio notifications go: Admin setting first, then env, then the contact email. */
export async function studioInbox() {
  const s = await getSettings();
  return s.payment.notifyEmail || process.env.STUDIO_NOTIFY_EMAIL || s.business.email;
}
