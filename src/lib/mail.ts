import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { emailConfigured, getSettings } from "./settings";

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
export async function sendMail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
  if (!emailConfigured() || !to) return false;
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  try {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transport().sendMail({ from, to, subject, text, html });
      return true;
    }
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text, html }),
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
