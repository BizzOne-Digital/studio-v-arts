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
