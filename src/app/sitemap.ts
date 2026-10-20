import type { MetadataRoute } from "next";
import { PAGES, SITE_URL } from "@/lib/nav";

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((p) => ({ url: `${SITE_URL}${p.href === "/" ? "" : p.href}` }));
}
