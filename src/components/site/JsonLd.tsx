import { addressLine, hasAddress, type Settings } from "@/lib/settings";
import { SITE_URL } from "@/lib/nav";

/** Structured data from verified details only. The address is included only once the owner marks it verified. */
export function OrgJsonLd({ s }: { s: Settings }) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: s.business.name,
    url: SITE_URL,
    email: s.business.email,
    telephone: s.business.phone,
    slogan: s.business.tagline,
  };
  const same = Object.values(s.social).filter(Boolean);
  if (same.length) data.sameAs = same;
  if (s.address.verified && hasAddress(s.address)) {
    data.address = {
      "@type": "PostalAddress", streetAddress: s.address.street, addressLocality: s.address.city,
      addressRegion: s.address.region, postalCode: s.address.postal, addressCountry: s.address.country,
    };
    data.hasMap = `https://www.google.com/maps?q=${encodeURIComponent(addressLine(s.address))}`;
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
