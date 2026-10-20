import type { Metadata } from "next";
import { BookCTA, EmptyNote, PageHero } from "@/components/site/sections";
import { Mask, Parallax, Reveal } from "@/components/site/motion";
import { Photo } from "@/components/site/Photo";
import { getTeam } from "@/lib/content";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Our Team",
  description: "Meet the instructors and people who bring Studio V to life.",
};

export default async function Team() {
  const team = await getTeam();
  return (
    <>
      <PageHero eyebrow="Team" title="Meet the people behind the vibe." italic={["vibe."]} body="The instructors and hosts who make every session welcoming." tone="about" photo={12} />
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
              </Reveal>
            ))}
          </ul>
        )}
      </section>
      <BookCTA />
    </>
  );
}
