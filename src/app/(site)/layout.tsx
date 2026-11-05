import { MotionConfig } from "motion/react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ScrollProgress } from "@/components/site/motion";
import { getSettings } from "@/lib/settings";
import { mediaSrc } from "@/lib/media";
import { ClientMotion } from "@/components/site/ClientMotion";
import { IntroSplash } from "@/components/site/IntroSplash";
import { HiringPopup } from "@/components/site/HiringPopup";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const logo = s.business.logoUrl || mediaSrc(s.business.logoId || null);
  return (
    <ClientMotion>
      <a href="#main" className="skip">Skip to content</a>
      <IntroSplash name={s.business.name} logoSrc={logo} />
      <ScrollProgress />
      <HiringPopup phone={s.business.phone} email={s.business.email} />
      <Header logoSrc={logo} name={s.business.shortName} instagram={s.social.instagram || null} />
      <main id="main" className="relative">{children}</main>
      <Footer s={s} logoSrc={logo} />
    </ClientMotion>
  );
}
