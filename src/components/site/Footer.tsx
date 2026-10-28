import Link from "next/link";
import { PAGES } from "@/lib/nav";
import { addressLine, hasAddress, type Settings } from "@/lib/settings";
import { Wordmark } from "./Header";
import { Brush } from "./Brush";
import { InstagramCta } from "./Instagram";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function Footer({ s, logoSrc }: { s: Settings; logoSrc: string | null }) {
  const b = s.business;
  const socials = (Object.entries(s.social) as [string, string][]).filter(([, v]) => v);
  const tel = b.phone.replace(/[^\d+]/g, "");
  return (
    <footer className="on-dark grain relative overflow-hidden bg-plum-deep text-ivory">
      <div className="pointer-events-none absolute -right-24 -top-24 w-[34rem] opacity-30"><Brush tone="lavender" delay={0} duration={2.5} /></div>
      <div className="relative mx-auto max-w-[88rem] px-5 pb-10 pt-24 sm:px-8">
        <p className="display text-[clamp(2.4rem,7vw,6rem)] leading-[0.9]">
          {b.tagline}<span className="text-champagne">.</span>
        </p>
        <p className="hand mt-2 text-2xl text-lavender">{b.supportingLine}</p>

        <div className="mt-20 grid gap-14 md:grid-cols-12">
          <div className="md:col-span-4">
            <Wordmark light logoSrc={logoSrc} name={b.name} />
            <Link href="/booking" className="btn btn-light mt-8">Book Your Vibe</Link>
          </div>

          <nav aria-label="Footer" className="md:col-span-4">
            <h2 className="eyebrow !text-lavender">Explore</h2>
            <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2.5">
              {PAGES.map((p) => (
                <li key={p.href}><Link href={p.href} className="ulink text-ivory/90">{p.label}</Link></li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-4">
            {s.social.instagram ? <InstagramCta url={s.social.instagram} className="mb-8" /> : null}
            <h2 className="eyebrow !text-lavender">Say hello</h2>
            <ul className="mt-5 space-y-2.5">
              <li><a className="ulink" href={`mailto:${b.email}`}>{b.email}</a></li>
              {b.secondaryEmail ? <li><a className="ulink" href={`mailto:${b.secondaryEmail}`}>{b.secondaryEmail}</a></li> : null}
              <li><a className="ulink" href={`tel:${tel}`}>{b.phone}</a></li>
              {hasAddress(s.address) ? <li className="text-ivory/80">{addressLine(s.address)}</li> : null}
            </ul>
            {socials.length ? (
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
                {socials.map(([k, v]) => (
                  <li key={k}><a className="ulink capitalize" href={v} target="_blank" rel="noopener noreferrer">{k}<span className="sr-only"> (opens in a new tab)</span></a></li>
                ))}
              </ul>
            ) : null}
            {s.hours.published ? (
              <dl className="mt-6 text-sm text-ivory/80">
                {s.hours.days.map((d, i) => (
                  <div key={i} className="flex justify-between gap-6 py-0.5"><dt>{DAYS[i]}</dt><dd>{d.enabled ? `${d.open} - ${d.close}` : "Closed"}</dd></div>
                ))}
              </dl>
            ) : null}
          </div>
        </div>

        <div className="mt-20 flex flex-col gap-2 border-t border-ivory/15 pt-6 text-sm text-ivory/60 sm:flex-row sm:justify-between">
          <p>&copy; {new Date().getFullYear()} {b.name} All rights reserved.</p>
          <p>All prices in CAD.</p>
        </div>
      </div>
    </footer>
  );
}
