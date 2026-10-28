export const PAGES = [
  { href: "/", label: "Home" },
  { href: "/experiences", label: "Activities" },
  { href: "/schedule", label: "Schedule" },
  { href: "/booking", label: "Book the Studio" },
  { href: "/studio-rental", label: "Studio Rental" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/team", label: "Instructors & Classes" },
  { href: "/gallery", label: "Gallery" },
  { href: "/testimonials", label: "Testimonials" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const;

/** Shown in the desktop bar. All twelve appear in the mobile menu and footer. */
export const PRIMARY = ["/", "/studio-rental", "/team", "/about", "/contact"];

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** The phone menu: five core destinations, numbered. Other pages stay reachable from these and from the footer. */
export const MOBILE_MENU = [
  { href: "/", label: "Home", note: "About, team and gallery", match: ["/", "/about", "/gallery"] },
  { href: "/booking", label: "Book the Studio", note: "Pick a date and your hours", match: ["/booking", "/pricing"] },
  { href: "/studio-rental", label: "Studio Rental", note: "Our rooms, sizes and prices", match: ["/studio-rental"] },
  { href: "/team", label: "Instructors & Classes", note: "Teachers and class booking", match: ["/team", "/schedule", "/experiences"] },
  { href: "/contact", label: "Info & Contact", note: "FAQ, reviews, map and contact", match: ["/contact", "/faq", "/testimonials"] },
] as const;
