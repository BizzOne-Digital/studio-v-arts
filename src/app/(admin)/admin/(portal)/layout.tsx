import { requireAdmin } from "@/lib/auth";
import { col } from "@/lib/db";
import { logout } from "../auth-actions";
import { AdminNav } from "./AdminNav";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/schedule", label: "Schedule & availability" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/pricing", label: "Pricing & offers" },
  { href: "/admin/testimonials", label: "Testimonials" },
  { href: "/admin/faqs", label: "FAQs" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/settings", label: "Website settings" },
];

export default async function Portal({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const counts = {
    p: await (await col("bookings")).countDocuments({ status: "pending" }),
    m: await (await col("contact_messages")).countDocuments({ status: "new" }),
  };
  return (
    <div className="lg:grid lg:grid-cols-[17rem_1fr]">
      <AdminNav items={NAV} badges={{ "/admin/bookings": counts.p, "/admin/messages": counts.m }} email={admin.email} logout={logout} />
      <main id="main" className="min-w-0 p-4 sm:p-8 lg:p-10">{children}</main>
    </div>
  );
}
