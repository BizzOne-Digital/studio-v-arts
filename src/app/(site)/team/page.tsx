import type { Metadata } from "next";
import { BookCTA, EmptyNote, PageHero } from "@/components/site/sections";
import { Mask, Parallax, Reveal } from "@/components/site/motion";
import { Photo } from "@/components/site/Photo";
import Link from "next/link";
import { getTeam, getUpcomingSessions } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { fmtDate, fmtTime } from "@/lib/time";
import { money } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Instructors & Classes",
  description: "Meet the instructors at Studio VM and book your place in an upcoming class.",
};

export default async function Team() {
  const [team, sessions, s] = await Promise.all([getTeam(), getUpcomingSessions(12), getSettings()]);
  const tz = s.booking.timezone;
  return (
    <>
      <PageHero eyebrow="Instructors & Classes" title="Learn with people who love it." italic={["love"]} body="Meet our instructors, then pick a class and request your place." tone="about" photo={12} />
      <section className="mx-auto max-w-[88rem] px-5 pb-28 sm:px-8">
        {team.length === 0 ? (
          <EmptyNote>Our team profiles are on their way. Check back soon.</EmptyNote>
        ) : (
          <ul className="grid gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((m, i) => (
              <Reveal as="li" key={m.id} delay={(i % 3) * 0.1} className={cn(i % 3 === 1 && "lg:mt-16")}>
                <Mask from="bottom" className="aspect-[3/4] overflow-hidden rounded-t-[999px] rounded-b-[1.5rem]"><Parallax speed={14} className="h-full"><Photo src={m.image} alt={m.imageAlt} tone="about" sizes="(min-width:1024px) 30vw, 90vw" /></Parallax></Mask>
                <h2 className="display mt-6 text-4xl">{m.name}</h2>
                {m.role ? <p className="eyebrow mt-2">{m.role}</p> : null}
                {m.bio ? <p className="mt-4 whitespace-pre-line text-ink/80">{m.bio}</p> : null}
                {m.classes.length ? <p className="mt-4 text-sm"><span className="font-semibold text-plum">Teaches:</span> {m.classes.join(", ")}</p> : null}
              </Reveal>
            ))}
          </ul>
        )}
      </section>
      <section id="classes" className="mx-auto max-w-5xl px-5 pb-24 sm:px-8">
        <h2 className="display text-3xl sm:text-4xl">Upcoming classes</h2>
        {sessions.length === 0 ? (
          <div className="mt-6"><EmptyNote>No classes are scheduled yet. <Link href="/contact" className="ulink font-semibold text-plum">Ask what is coming up</Link>.</EmptyNote></div>
        ) : (
          <ul className="mt-6 divide-y divide-plum/10 border-y border-plum/10">
            {sessions.map((x) => (
              <li key={x.id} className="grid items-center gap-3 py-5 sm:grid-cols-[10rem_1fr_auto]">
                <p className="font-semibold text-plum">{fmtDate(x.startsAt, tz)} · {fmtTime(x.startsAt, tz)}</p>
                <div>
                  <p className="display text-2xl">{x.title}</p>
                  <p className="text-sm text-ink/70">{[x.instructor && "with " + x.instructor, x.priceCents != null ? money(x.priceCents) + " per person" : null, x.seatsLeft > 0 ? x.seatsLeft + " seats left" : "Full"].filter(Boolean).join(" · ")}</p>
                </div>
                {x.seatsLeft > 0 && x.priceCents != null ? <Link href={"/booking?session=" + x.id} className="btn btn-primary">Book</Link> : <Link href={"/contact?topic=" + encodeURIComponent(x.title)} className="btn btn-ghost">Enquire</Link>}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-6"><Link href="/schedule" className="ulink font-semibold text-plum">Full schedule &rarr;</Link> <span className="mx-3 text-ink/30">|</span> <Link href="/experiences" className="ulink font-semibold text-plum">Everything we offer &rarr;</Link></p>
      </section>
      <BookCTA />
    </>
  );
}
