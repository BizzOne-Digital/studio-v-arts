import Link from "next/link";
import type { Metadata } from "next";
import { BookCTA, EmptyNote, PageHero, Quotes } from "@/components/site/sections";
import { getTestimonials } from "@/lib/content";

export const metadata: Metadata = {
  title: "Testimonials",
  description: "What the Studio V community says about their time in the studio.",
};

export default async function Testimonials() {
  const quotes = await getTestimonials();
  return (
    <>
      <PageHero eyebrow="Testimonials" title="Kind words from our community." italic={["community."]} tone="connect" photo={5} />
      <section className="mx-auto max-w-[88rem] px-5 pb-28 sm:px-8">
        {quotes.length ? (
          <Quotes items={quotes} large />
        ) : (
          <EmptyNote>Community reviews will appear here once members share their experiences. Be one of the first: <Link href="/booking" className="ulink font-semibold text-plum">book your vibe</Link>.</EmptyNote>
        )}
      </section>
      <BookCTA />
    </>
  );
}
