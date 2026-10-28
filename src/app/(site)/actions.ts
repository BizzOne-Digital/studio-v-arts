"use server";
import { updateTag } from "next/cache";
import { z } from "zod";
import { clientIp, throttle } from "@/lib/auth";
import { createClassBooking, createRentalBooking, quoteRental, type SlotInput } from "@/lib/booking";
import { insert } from "@/lib/db";
import { notifyContact, notifyNewBooking } from "@/lib/notify";
import { emailConfigured } from "@/lib/settings";

const phone = z.string().trim().min(7, "Enter a phone number we can reach you on.").max(30).regex(/^[0-9+()\-.\s]+$/, "Use digits, spaces and + ( ) - only.");
const customer = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(160),
  phone,
  notes: z.string().trim().max(500).default(""),
});

export type FieldErrors = Record<string, string>;
export type BookingResult =
  | { ok: true; reference: string; status: "pending"; totalCents: number; emailed: boolean; emailConfigured: boolean }
  | { ok: false; error: string; fields?: FieldErrors };

const flatten = (e: z.ZodError): FieldErrors => {
  const out: FieldErrors = {};
  for (const i of e.issues) out[String(i.path[0] ?? "form")] ??= i.message;
  return out;
};

const slotSchema = z.object({ date: z.string(), start: z.string(), minutes: z.number().int() });

export async function quoteAction(slots: SlotInput[], roomId: string) {
  const parsed = z.array(slotSchema).max(24).safeParse(slots);
  if (!parsed.success || typeof roomId !== "string") return { ok: false as const, error: "Check your selected times." };
  return quoteRental(parsed.data, roomId);
}

export async function submitClassBooking(input: unknown): Promise<BookingResult> {
  const p = customer.extend({ sessionId: z.string().uuid(), attendees: z.number().int().min(1).max(50) }).safeParse(input);
  if (!p.success) return { ok: false, error: "Please check the highlighted fields.", fields: flatten(p.error) };
  if (!throttle(`book:${await clientIp()}`, 8, 10 * 60_000)) return { ok: false, error: "Too many requests. Please wait a few minutes and try again." };
  const r = await createClassBooking({ name: p.data.name, email: p.data.email, phone: p.data.phone, notes: p.data.notes }, p.data.sessionId, p.data.attendees);
  if (!r.ok) return { ok: false, error: r.error, fields: r.field ? { [r.field]: r.error } : undefined };
  updateTag("bookings");
  const n = await notifyNewBooking(r.id).catch(() => ({ customerEmailed: false }));
  return { ok: true, reference: r.reference, status: "pending", totalCents: r.totalCents, emailed: n.customerEmailed, emailConfigured: emailConfigured() };
}

export async function submitRentalBooking(input: unknown): Promise<BookingResult> {
  const p = customer.extend({
    slots: z.array(slotSchema).min(1).max(24),
    attendees: z.number().int().min(1).max(200),
    roomId: z.string().min(1, "Choose a room.").max(80),
    category: z.string().trim().min(2, "Choose what the booking is for.").max(60),
    activity: z.string().trim().min(3, "Tell us the reason for your booking.").max(300),
  }).safeParse(input);
  if (!p.success) return { ok: false, error: "Please check the highlighted fields.", fields: flatten(p.error) };
  if (!throttle(`book:${await clientIp()}`, 8, 10 * 60_000)) return { ok: false, error: "Too many requests. Please wait a few minutes and try again." };
  const r = await createRentalBooking({ name: p.data.name, email: p.data.email, phone: p.data.phone, notes: p.data.notes }, p.data.slots, p.data.attendees, p.data.activity, p.data.roomId, p.data.category);
  if (!r.ok) return { ok: false, error: r.error, fields: r.field ? { [r.field]: r.error } : undefined };
  updateTag("bookings");
  const n = await notifyNewBooking(r.id).catch(() => ({ customerEmailed: false }));
  return { ok: true, reference: r.reference, status: "pending", totalCents: r.totalCents, emailed: n.customerEmailed, emailConfigured: emailConfigured() };
}

export type ContactState = { ok: boolean; message: string; fields?: FieldErrors; emailed?: boolean } | null;

export async function submitContact(_prev: ContactState, fd: FormData): Promise<ContactState> {
  if (String(fd.get("website") ?? "")) return { ok: true, message: "Thank you. Your message has been received." }; // honeypot
  const p = z.object({
    name: z.string().trim().min(2, "Enter your name.").max(100),
    email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(160),
    phone: z.string().trim().max(30).regex(/^[0-9+()\-.\s]*$/, "Use digits, spaces and + ( ) - only.").default(""),
    subject: z.string().trim().max(120).default(""),
    message: z.string().trim().min(10, "Please write at least a sentence.").max(3000),
  }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: "Please check the highlighted fields.", fields: flatten(p.error) };
  if (!throttle(`contact:${await clientIp()}`, 4, 10 * 60_000)) return { ok: false, message: "Too many messages. Please try again in a few minutes." };
  await insert("contact_messages", { name: p.data.name, email: p.data.email, phone: p.data.phone, subject: p.data.subject, message: p.data.message, status: "new" });
  const emailed = await notifyContact(p.data).catch(() => false);
  return { ok: true, emailed, message: "Thank you. Your message has been received and our team will reply to your email address." };
}
