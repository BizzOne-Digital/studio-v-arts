import Link from "next/link";
import type { Metadata } from "next";
import { BookCTA, EmptyNote, PageHero } from "@/components/site/sections";
import { Reveal } from "@/components/site/motion";
import { getUpcomingSessions } from "@/lib/content";
import { CATEGORIES, CATEGORY_KEYS, money, type Category } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { dateStrIn, fmtDay, fmtTime } from "@/lib/time";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Class Schedule",
  description: "Upcoming classes and workshops at Studio VM, with times, instructors, seats left and prices.",
};

export default async function Schedule({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  const [s, all] = await Promise.all([getSettings(), getUpcomingSessions(200)]);
  const tz = s.booking.timezone;
  const active = CATEGORY_KEYS.includes(cat as Category) ? (cat as Category) : null;
  const list = active ? all.filter((x) => x.category === active) : all;
  const days = new Map<string, typeof list>();
  for (const x of list) {
    const k = dateStrIn(x.startsAt, tz);
    days.set(k, [...(days.get(k) ?? []), x]);
  }
  return (
    <>
      <PageHero eyebrow="Schedule" title="Find your next class." italic={["class."]} body={`All times are shown in ${tz.replace("_", " ")} time. Seats are held for you once a request is confirmed.`} tone="create" photo={3} />
      <section className="mx-auto max-w-5xl px-5 pb-28 sm:px-8">
        <nav aria-label="Filter schedule by category" className="flex flex-wrap gap-2">
          {[{ k: null, label: "All" }, ...CATEGORY_KEYS.filter((k) => k !== "rental").map((k) => ({ k, label: CATEGORIES[k].label }))].map((t) => (
            <Link key={t.label} href={t.k ? `/schedule?cat=${t.k}` : "/schedule"} aria-current={active === t.k ? "true" : undefined} className={cn("min-h-11 rounded-full border px-5 py-2.5 text-sm font-semibold", active === t.k ? "border-plum bg-plum text-ivory" : "border-plum/30 text-plum hover:bg-lilac")}>
              {t.label}
            </Link>
          ))}
        </nav>

        {days.size === 0 ? (
          <div className="mt-12"><EmptyNote>No classes are scheduled yet. New sessions are added regularly. <Link href="/contact" className="ulink font-semibold text-plum">Ask us what is coming</Link>.</EmptyNote></div>
        ) : (
          <div className="mt-12 space-y-12">
            {[...days.entries()].map(([day, items]) => (
              <div key={day}>
                <Reveal><h2 className="display border-b border-plum/20 pb-3 text-3xl sm:text-4xl">{fmtDay(day)}</h2></Reveal>
                <ul className="divide-y divide-plum/10">
                  {items.map((x) => (
                    <Reveal as="li" key={x.id} y={16} className="grid items-center gap-3 py-6 sm:grid-cols-[9rem_1fr_auto]">
                      <p className="font-semibold text-plum">{fmtTime(x.startsAt, tz)} - {fmtTime(x.endsAt, tz, true)}</p>
                      <div>
                        <h3 className="display text-2xl">{x.title}</h3>
                        <p className="text-sm text-ink/70">
                          {[x.instructor && `with ${x.instructor}`, x.audience, x.priceCents != null ? `${money(x.priceCents)} per person` : null].filter(Boolean).join(" · ")}
                        </p>
                        <p className={cn("mt-1 text-sm font-semibold", x.seatsLeft === 0 ? "text-mauve-deep" : "text-plum")}>{x.seatsLeft === 0 ? "Class full" : `${x.seatsLeft} of ${x.capacity} seats left`}</p>
                      </div>
                      {x.seatsLeft > 0 && x.priceCents != null ? (
                        <Link href={`/booking?session=${x.id}`} className="btn btn-primary">Request a seat</Link>
                      ) : x.seatsLeft > 0 ? (
                        <Link href={`/contact?topic=${encodeURIComponent(x.title)}`} className="btn btn-ghost">Enquire</Link>
                      ) : null}
                    </Reveal>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
      <BookCTA />
    </>
  );
}
