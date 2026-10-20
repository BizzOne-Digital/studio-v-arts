// Timezone helpers. Instants are stored as UTC; the studio timezone is configuration.

type Parts = { y: number; m: number; d: number; hh: number; mm: number; wd: number };

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function dtf(tz: string) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", weekday: "short",
    });
    fmtCache.set(tz, f);
  }
  return f;
}

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function partsIn(date: Date, tz: string): Parts {
  const o: Record<string, string> = {};
  for (const p of dtf(tz).formatToParts(date)) o[p.type] = p.value;
  return { y: +o.year, m: +o.month, d: +o.day, hh: +o.hour % 24, mm: +o.minute, wd: WD.indexOf(o.weekday) };
}

function offsetMs(ms: number, tz: string) {
  const p = partsIn(new Date(ms), tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm) - Math.floor(ms / 60000) * 60000;
}

/** "2026-11-03" + "18:30" in tz -> UTC Date. */
export function zonedToUtc(dateStr: string, timeStr: string, tz: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let t = guess - offsetMs(guess, tz);
  t = guess - offsetMs(t, tz);
  return new Date(t);
}

export const pad = (n: number) => String(n).padStart(2, "0");
export const dateStrIn = (date: Date, tz: string) => {
  const p = partsIn(date, tz);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
};
export const timeStrIn = (date: Date, tz: string) => {
  const p = partsIn(date, tz);
  return `${pad(p.hh)}:${pad(p.mm)}`;
};
export const weekdayOf = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};
export const addDays = (dateStr: string, n: number) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
export const isDateStr = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
export const isTimeStr = (s: unknown): s is string => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
export const minutesOf = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
export const fromMinutes = (n: number) => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;

export function fmtDateTime(date: Date, tz: string, withZone = true) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    ...(withZone ? { timeZoneName: "short" } : {}),
  }).format(date);
}
export function fmtTime(date: Date, tz: string, withZone = false) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, hour: "numeric", minute: "2-digit", ...(withZone ? { timeZoneName: "short" } : {}),
  }).format(date);
}
export function fmtDate(date: Date, tz: string, long = false) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, weekday: long ? "long" : "short", month: long ? "long" : "short", day: "numeric",
    ...(long ? { year: "numeric" } : {}),
  }).format(date);
}
export function fmtRange(a: Date, b: Date, tz: string) {
  return `${fmtDate(a, tz)} · ${fmtTime(a, tz)} – ${fmtTime(b, tz, true)}`;
}
export const fmtDay = (dateStr: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(
    new Date(dateStr + "T00:00:00Z"),
  );
