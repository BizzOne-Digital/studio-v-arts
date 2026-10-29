import Link from "next/link";
import type { Metadata } from "next";
import { BookCTA, EmptyNote, FaqList, PageHero } from "@/components/site/sections";
import { getFaqs } from "@/lib/content";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about booking classes and renting the studio at Studio VM.",
};

export default async function Faq() {
  const faqs = await getFaqs();
  return (
    <>
      <PageHero eyebrow="FAQ" title="Questions, answered." italic={["answered."]} tone="learn" photo={13} />
      <section className="mx-auto max-w-5xl px-5 pb-24 sm:px-8">
        {faqs.length ? (
          <div className="space-y-14">
            {[...new Set(faqs.map((f) => f.category))].map((c) => (
              <div key={c}>
                <h2 className="display mb-4 text-2xl text-plum sm:text-3xl">{c}</h2>
                <FaqList items={faqs.filter((f) => f.category === c)} />
              </div>
            ))}
          </div>
        ) : <EmptyNote>Answers will be added here soon.</EmptyNote>}
        <p className="mt-10 text-ink/75">Still wondering? <Link href="/contact" className="ulink font-semibold text-plum">Send us a message</Link>.</p>
      </section>
      <BookCTA />
    </>
  );
}
