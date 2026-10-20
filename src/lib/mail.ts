import "server-only";
import { emailConfigured, getSettings } from "./settings";

/** Sends through Resend when configured. Returns true only if the provider accepted the message. */
export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  if (!emailConfigured() || !to) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text }),
    });
    if (!r.ok) console.error("Email provider rejected message", r.status);
    return r.ok;
  } catch (e) {
    console.error("Email send failed", e);
    return false;
  }
}

export async function studioInbox() {
  return process.env.STUDIO_NOTIFY_EMAIL || (await getSettings()).business.email;
}
