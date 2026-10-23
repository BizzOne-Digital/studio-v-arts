import type { Metadata } from "next";
import { BookCTA, PageHero } from "@/components/site/sections";
import { ServiceBrowser } from "@/components/site/ServiceBrowser";
import { getServices } from "@/lib/content";
import { CATEGORY_KEYS, type Category } from "@/lib/format";

export const metadata: Metadata = {
  title: "Experiences",
  description: "Dance, yoga, Zumba, fitness, painting, chess, workshops, celebrations and studio rental. Explore everything on offer at Studio VM.",
};

export default async function Experiences({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  const services = await getServices();
  const sorted = [...services].sort((a, b) => (a.featuredOrder ?? 9999) - (b.featuredOrder ?? 9999));
  const initial = CATEGORY_KEYS.includes(cat as Category) ? (cat as Category) : "all";
  return (
    <>
      <PageHero
        eyebrow="Experiences"
        title="Move. Create. Learn. Celebrate."
        italic={["Celebrate."]}
        body="Five ways to spend your time at Studio VM. Open any experience for details, then request your spot."
        tone="move" photo={1}
      />
      <section className="mx-auto max-w-[88rem] px-5 pb-28 sm:px-8">
        <ServiceBrowser services={sorted.map(({ featuredOrder: _f, ...rest }) => rest)} initial={initial} />
      </section>
      <BookCTA />
    </>
  );
}
