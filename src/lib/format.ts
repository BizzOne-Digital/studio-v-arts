export const money = (cents: number | null | undefined, currency = "CAD") =>
  cents == null
    ? ""
    : new Intl.NumberFormat("en-CA", { style: "currency", currency, minimumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "item";

export const CATEGORIES = {
  move: { label: "Move", blurb: "Dance, yoga, Zumba and fitness." },
  create: { label: "Create", blurb: "Painting, costume making and creative workshops." },
  learn: { label: "Learn & Play", blurb: "Chess, board games, tutoring and educational workshops." },
  connect: { label: "Connect & Celebrate", blurb: "Small birthdays, gatherings, baithaks and lunch-and-learns." },
  rental: { label: "Studio Rental", blurb: "Space hire for suitable classes, workshops and intimate events." },
} as const;
export type Category = keyof typeof CATEGORIES;
export const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[];
