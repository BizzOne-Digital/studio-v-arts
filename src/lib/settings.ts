import "server-only";
import { cache } from "react";
import { cached } from "./cache";
import { col } from "./db";
import { DEFAULT_WAIVER } from "./waiver";

export type DayHours = { enabled: boolean; open: string; close: string };

export type Settings = {
  business: {
    name: string; shortName: string; tagline: string; supportingLine: string;
    email: string; secondaryEmail: string; phone: string; sizeSqFt: number; logoId: string; logoUrl: string;
  };
  address: {
    street: string; city: string; region: string; postal: string; country: string;
    verified: boolean; // map + directions only render when the owner confirms the address is correct
  };
  social: { instagram: string; facebook: string; tiktok: string; youtube: string; whatsapp: string };
  /** Public business hours (display only). Hidden until published. */
  hours: { published: boolean; days: DayHours[]; note: string };
  /** Interac e-transfer details shown at checkout, and who is emailed. */
  payment: { interacEmail: string; instructions: string; notifyEmail: string; confirmInstructions: string };
  copy: {
    heroSub: string; introHeading: string; introBody: string;
    rentalHeading: string; rentalBody: string; closingHeading: string; closingBody: string;
    aboutStory: string; aboutVision: string;
  };
  booking: {
    live: boolean;
    timezone: string;
    leadTimeHours: number;
    bufferBeforeMin: number;
    bufferAfterMin: number;
    minHours: number;
    maxHours: number;
    slotStepMin: number;
    maxSlotsPerBooking: number;
    rentalMaxAttendees: number;
    rentalHours: DayHours[]; // index 0 = Sunday
    regularRateCents: number | null;
    showRegularRate: boolean;
    minRateCents: number;
    terms: string;
    waiver: string;
    cancellation: string;
    tax: { configured: boolean; enabled: boolean; ratePct: number; label: string };
  };
};

const day = (enabled: boolean, open = "09:00", close = "21:00"): DayHours => ({ enabled, open, close });

export const DEFAULT_SETTINGS: Settings = {
  business: {
    name: "STUDIO VM Arts, Wellness & Learning Centre Inc.",
    shortName: "Studio VM",
    tagline: "Vibe. Move. Repeat.",
    supportingLine: "Your Space. Your Passion. Your Vibe.",
    email: "yourstudiovm@gmail.com",
    secondaryEmail: "",
    phone: "+1 (514) 718-9145",
    sizeSqFt: 600,
    logoId: "",
    logoUrl: "",
  },
  address: { street: "", city: "", region: "", postal: "", country: "", verified: false },
  social: { instagram: "https://www.instagram.com/yourstudiovm/", facebook: "", tiktok: "", youtube: "", whatsapp: "" },
  hours: { published: false, days: Array.from({ length: 7 }, () => day(false)), note: "" },
  payment: {
    interacEmail: "yourstudiovm@gmail.com",
    instructions: "Send your Interac e-transfer to the email address above and include your booking reference in the message. Your booking stays Pending until the studio confirms your payment.",
    notifyEmail: "",
    confirmInstructions: "",
  },
  copy: {
    heroSub: "Move, create, connect. Discover a welcoming space to explore what makes you, you.",
    introHeading: "One room. Endless ways to belong.",
    introBody:
      "Studio VM brings creativity, wellness, learning and celebration together under one roof. Come to explore an interest, build confidence, meet your neighbours and make memories worth keeping.",
    rentalHeading: "A 600 sq ft room that becomes yours.",
    rentalBody:
      "Hire the studio for your own class, workshop or small gathering. Approximately 600 sq ft of flexible, light-filled space, booked by the hour.",
    closingHeading: "Ready to own your vibe?",
    closingBody: "Pick a class or reserve the studio. Every request is reviewed personally and confirmed by our team.",
    aboutStory:
      "Studio VM brings creativity, wellness, learning and celebration together under one roof. It is a welcoming space to explore your interests, build confidence, meet people and make memories.\n\nDancers and chess players, painters and parents, children, seniors and curious beginners all share the same floor. Some come for a class. Some hire the space for their own. Many come for both.",
    aboutVision: "To create a welcoming and inspiring community where every individual feels empowered to explore, grow, connect, and celebrate life.",
  },
  booking: {
    live: false,
    timezone: "America/Toronto",
    leadTimeHours: 0,
    bufferBeforeMin: 0,
    bufferAfterMin: 0,
    minHours: 1,
    maxHours: 8,
    slotStepMin: 60,
    maxSlotsPerBooking: 12,
    rentalMaxAttendees: 25,
    rentalHours: Array.from({ length: 7 }, () => day(true, "08:00", "22:00")),
    regularRateCents: null,
    showRegularRate: false,
    minRateCents: 2500,
    terms: "",
    waiver: DEFAULT_WAIVER,
    cancellation: "",
    tax: { configured: false, enabled: false, ratePct: 0, label: "" },
  },
};

function merge<T>(base: T, over: any): T {
  if (Array.isArray(base)) return (Array.isArray(over) && over.length === base.length ? over : base) as T;
  if (base && typeof base === "object") {
    const out: any = {};
    for (const k of Object.keys(base as any)) out[k] = merge((base as any)[k], over?.[k]);
    return out;
  }
  return (over === undefined || over === null ? base : over) as T;
}

const loadSettings = cached("settings", ["content"], async (): Promise<Settings> => {
  const row = await (await col("settings")).findOne({ _id: "site" } as any);
  return merge(DEFAULT_SETTINGS, row?.value ?? {});
});
export const getSettings = cache(() => loadSettings());

export async function saveSettings(next: Settings) {
  await (await col("settings")).updateOne({ _id: "site" } as any, { $set: { value: next, updated_at: new Date() } }, { upsert: true });
}

export function addressLine(a: Settings["address"]) {
  return [a.street, a.city, [a.region, a.postal].filter(Boolean).join(" "), a.country].filter(Boolean).join(", ");
}
export const hasAddress = (a: Settings["address"]) => Boolean(a.street.trim() && a.city.trim());

export function mapLinks(s: Settings) {
  if (!s.address.verified || !hasAddress(s.address)) return null;
  const q = encodeURIComponent(addressLine(s.address));
  return {
    embed: `https://www.google.com/maps?q=${q}&output=embed`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
  };
}

export function emailConfigured() {
  return Boolean((process.env.SMTP_USER && process.env.SMTP_PASS) || (process.env.RESEND_API_KEY && process.env.EMAIL_FROM));
}

/** Everything that must be true before live bookings can be switched on. */
export function launchChecklist(s: Settings, hasRentalPrice: boolean) {
  const b = s.booking;
  return [
    { ok: b.terms.trim().length > 0, label: "Booking terms written" },
    { ok: b.cancellation.trim().length > 0, label: "Cancellation terms written" },
    { ok: b.tax.configured, label: "Tax settings reviewed and confirmed" },
    { ok: hasRentalPrice, label: "A rental price exists (regular rate or an active offer)" },
    { ok: b.rentalHours.some((d) => d.enabled), label: "Rental opening hours set" },
  ];
}
