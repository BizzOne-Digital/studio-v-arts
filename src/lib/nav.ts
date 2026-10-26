export const PAGES = [
  { href: "/", label: "Home" },
  { href: "/experiences", label: "Experiences" },
  { href: "/schedule", label: "Schedule" },
  { href: "/booking", label: "Booking" },
  { href: "/studio-rental", label: "Studio Rental" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/team", label: "Team" },
  { href: "/gallery", label: "Gallery" },
  { href: "/testimonials", label: "Testimonials" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const;

/** Shown in the desktop bar. All twelve appear in the mobile menu and footer. */
export const PRIMARY = ["/", "/experiences", "/about", "/contact"];

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** The phone menu: five core destinations, numbered. Other pages stay reachable from these and from the footer. */
export const MOBILE_MENU = [
  { href: "/", label: "Home", note: "About, team and gallery", match: ["/", "/about", "/gallery"] },
  { href: "/booking?type=rental", label: "Book Hourly Studio", note: "Prices, calendar and checkout", match: ["/booking", "/pricing"] },
  { href: "/studio-rental", label: "Event Rentals", note: "Workshops, parties and events", match: ["/studio-rental"] },
  { href: "/team", label: "Instructors & Classes", note: "Teachers and class booking", match: ["/team", "/schedule", "/experiences"] },
  { href: "/contact", label: "Info & Contact", note: "FAQ, reviews, map and contact", match: ["/contact", "/faq", "/testimonials"] },
] as const;
