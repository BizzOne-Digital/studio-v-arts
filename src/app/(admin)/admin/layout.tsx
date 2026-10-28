import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Studio VM Admin", template: "%s | Studio VM Admin" },
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = "force-dynamic";

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="min-h-svh bg-[#f4f1ea]">{children}</div>;
}
