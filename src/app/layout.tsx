import type { Metadata, Viewport } from "next";
import { Caveat, Cormorant_Garamond, DM_Sans, Fraunces, Mrs_Saint_Delafield, Playfair_Display } from "next/font/google";
import { SITE_URL } from "@/lib/nav";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", style: ["normal", "italic"], axes: ["SOFT", "WONK", "opsz"], display: "swap" });
const dm = DM_Sans({ subsets: ["latin"], variable: "--font-dm", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", style: ["normal", "italic"], display: "swap" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], variable: "--font-cormorant", weight: ["400", "500", "600"], display: "swap" });
const script = Mrs_Saint_Delafield({ subsets: ["latin"], variable: "--font-script", weight: "400", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Studio V | Own Your Vibe", template: "%s | Studio V" },
  description: "Dance, yoga, creative workshops, learning and small celebrations. Book a class or rent the studio.",
  openGraph: { siteName: "STUDIO V Arts, Wellness & Learning Inc", type: "website", locale: "en_CA", images: [{ url: "/hero.webp", width: 2000, height: 1125, alt: "Studio V" }] },
};
export const viewport: Viewport = { themeColor: "#faf7f2", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA" data-scroll-behavior="smooth" className={`${fraunces.variable} ${dm.variable} ${caveat.variable} ${playfair.variable} ${cormorant.variable} ${script.variable}`}>
      <body>
        {/* If scripts fail, scroll-reveal content must still be readable. */}
        <noscript>
          <style>{`[style*="opacity: 0"],[style*="opacity:0"]{opacity:1!important;transform:none!important}[style*="clip-path"]{clip-path:none!important}span[aria-hidden] > span{transform:none!important}`}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
