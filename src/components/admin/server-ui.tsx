import Link from "next/link";
import { cn } from "@/lib/cn";

export const inputCls = "admin-input";

export function Title({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="display text-4xl text-plum sm:text-5xl">{title}</h1>
        {sub ? <p className="mt-2 max-w-2xl text-ink/70">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className, title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <section className={cn("rounded-3xl border border-plum/10 bg-white p-6 shadow-sm", className)}>
      {title ? <h2 className="display mb-4 text-2xl text-plum">{title}</h2> : null}
      {children}
    </section>
  );
}

const TONES: Record<string, string> = {
  pending: "bg-champagne-soft text-[#5c4515]", confirmed: "bg-[#d9f0e1] text-[#17532e]", declined: "bg-[#f8e4e9] text-[#7a1530]",
  cancelled: "bg-[#eee] text-[#444]", completed: "bg-lilac text-plum", published: "bg-[#d9f0e1] text-[#17532e]", draft: "bg-sand text-ink/70",
  archived: "bg-[#eee] text-[#444]", new: "bg-champagne-soft text-[#5c4515]", read: "bg-sand text-ink/70", unpaid: "bg-sand text-ink/70",
  paid: "bg-[#d9f0e1] text-[#17532e]", refunded: "bg-lilac text-plum", waived: "bg-lilac text-plum", active: "bg-[#d9f0e1] text-[#17532e]", inactive: "bg-sand text-ink/70",
};
export const Badge = ({ v }: { v: string }) => <span className={cn("inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize", TONES[v] ?? "bg-sand")}>{v}</span>;

export function Warn({ children, tone = "warn" }: { children: React.ReactNode; tone?: "warn" | "ok" }) {
  return <div className={cn("rounded-2xl p-4 text-sm", tone === "warn" ? "bg-champagne-soft text-[#5c4515]" : "bg-[#d9f0e1] text-[#17532e]")}>{children}</div>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-plum/25 bg-sand/50 p-8 text-center text-ink/65">{children}</p>;
}

export function Stat({ label, value, href, tone }: { label: string; value: React.ReactNode; href?: string; tone?: "warn" }) {
  const body = (
    <div className={cn("rounded-3xl border border-plum/10 bg-white p-5 transition-shadow hover:shadow-md", tone === "warn" && "border-champagne bg-champagne-soft/50")}>
      <p className="eyebrow">{label}</p>
      <p className="display mt-2 text-4xl text-plum">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export const num = (v: FormDataEntryValue | null) => (v == null || String(v).trim() === "" ? null : Number(v));
export const cents = (v: FormDataEntryValue | null) => (v == null || String(v).trim() === "" ? null : Math.round(Number(v) * 100));
