import type { Metadata } from "next";
import { BookCTA, PageHero } from "@/components/site/sections";
import { GalleryGrid, PLACEHOLDER_TILES } from "@/components/site/GalleryGrid";
import { getGallery } from "@/lib/content";

export const metadata: Metadata = {
  title: "Gallery",
  description: "A look inside Studio VM: movement, creativity, learning and celebration.",
};

export default async function Gallery() {
  const gallery = await getGallery();
  return (
    <>
      <PageHero eyebrow="Gallery" title="A look inside." italic={["inside."]} body="Moments from the studio. Open any photo to view it larger." tone="create" image={gallery[0]?.src} imageAlt={gallery[0]?.alt} />
      <section className="mx-auto max-w-[88rem] px-5 pb-28 sm:px-8">
        <GalleryGrid items={gallery.length ? gallery : PLACEHOLDER_TILES} />
        {!gallery.length ? <p className="mt-6 text-center text-sm text-ink/60">Illustrations are shown while studio photography is being added.</p> : null}
      </section>
      <BookCTA />
    </>
  );
}
