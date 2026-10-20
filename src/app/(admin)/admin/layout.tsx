import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Studio V Admin", template: "%s | Studio V Admin" },
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = "force-dynamic";

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="min-h-svh bg-[#f6f2f8]">{children}</div>;
}
