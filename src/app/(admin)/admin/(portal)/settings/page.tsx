import { ActionButton, AdminForm, Check, Field, ImageField } from "@/components/admin/ui";
import { Card, Title, Warn } from "@/components/admin/server-ui";
import { loadOffers } from "@/lib/booking";
import { mediaSrc } from "@/lib/media";
import { emailConfigured, getSettings, launchChecklist } from "@/lib/settings";
import { saveBusiness, saveTerms, setLive } from "../actions";

export const metadata = { title: "Website settings" };
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function Settings() {
  const [s, offers] = await Promise.all([getSettings(), loadOffers()]);
  const b = s.business, a = s.address;
  const hasPrice = s.booking.regularRateCents != null || offers.some((o) => o.active && (o.kind === "flat_rate" || o.kind === "package"));
  const list = launchChecklist(s, hasPrice);
  return (
    <>
      <Title title="Website settings" sub="Contact details, address, social links, hours, key copy and booking terms. Changes appear on the public site immediately." />

      <Card title="Go live with online booking">
        <ul className="space-y-1">{list.map((c) => <li key={c.label} className="flex items-center gap-2"><span aria-hidden>{c.ok ? "✓" : "✗"}</span><span className={c.ok ? "" : "font-semibold text-[#9b1c3a]"}>{c.label}</span><span className="sr-only">{c.ok ? "done" : "missing"}</span></li>)}</ul>
        <p className="mt-3 text-sm">Live bookings are currently <strong>{s.booking.live ? "ON" : "OFF"}</strong>.</p>
        <div className="mt-3 flex gap-2">
          {s.booking.live ? <ActionButton action={setLive.bind(null, false)}>Turn off</ActionButton> : <ActionButton action={setLive.bind(null, true)} confirm="Enable live bookings on the public website?">Turn on</ActionButton>}
        </div>
      </Card>

      <Card title="Booking terms" className="mt-6">
        <AdminForm action={saveTerms}>
          <Field label="Booking terms" hint="Shown on Pricing and in the booking summary. Write your own; nothing is pre-filled."><textarea name="terms" rows={5} defaultValue={s.booking.terms} className="admin-input" /></Field>
          <Field label="Cancellation terms"><textarea name="cancellation" rows={5} defaultValue={s.booking.cancellation} className="admin-input" /></Field>
        </AdminForm>
        <p className="mt-2 text-xs text-ink/60">Tax is configured under Pricing &amp; offers.</p>
      </Card>

      <AdminForm action={saveBusiness} submitLabel="Save website settings" className="mt-6">
        <Card title="Business and contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name"><input name="name" defaultValue={b.name} className="admin-input" /></Field>
            <Field label="Short name"><input name="shortName" defaultValue={b.shortName} className="admin-input" /></Field>
            <Field label="Tagline"><input name="tagline" defaultValue={b.tagline} className="admin-input" /></Field>
            <Field label="Supporting line"><input name="supportingLine" defaultValue={b.supportingLine} className="admin-input" /></Field>
            <Field label="Contact email"><input name="email" type="email" required defaultValue={b.email} className="admin-input" /></Field>
            <Field label="Additional business email"><input name="secondaryEmail" type="email" defaultValue={b.secondaryEmail} className="admin-input" /></Field>
            <Field label="Phone"><input name="phone" required defaultValue={b.phone} className="admin-input" /></Field>
            <ImageField name="logo_url" folder="pages" current={b.logoUrl || mediaSrc(b.logoId || null)} label="Logo (separate file, transparent PNG or WebP recommended)" />
          </div>
        </Card>

        <Card title="Address and map">
          <p className="mb-4 text-sm text-ink/70">The map and Get Directions link are built only from this address and only appear once you tick &quot;verified&quot;. Nothing is invented.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Street address" wide><input name="street" defaultValue={a.street} className="admin-input" /></Field>
            <Field label="City"><input name="city" defaultValue={a.city} className="admin-input" /></Field>
            <Field label="Province / state"><input name="region" defaultValue={a.region} className="admin-input" /></Field>
            <Field label="Postal code"><input name="postal" defaultValue={a.postal} className="admin-input" /></Field>
            <Field label="Country"><input name="country" defaultValue={a.country} className="admin-input" /></Field>
            <Check name="verified" label="I have verified this address is correct" defaultChecked={a.verified} />
          </div>
        </Card>

        <Card title="Social links">
          <div className="grid gap-4 sm:grid-cols-2">
            {(["instagram", "facebook", "tiktok", "youtube", "whatsapp"] as const).map((k) => <Field key={k} label={`${k[0].toUpperCase()}${k.slice(1)} URL`} hint="Full https:// link. Empty = not shown."><input name={k} type="url" defaultValue={s.social[k]} className="admin-input" /></Field>)}
          </div>
        </Card>

        <Card title="Business hours (public)">
          <Check name="hoursPublished" label="Show business hours publicly" defaultChecked={s.hours.published} hint="Separate from rental booking hours under Schedule & availability." />
          <div className="mt-3 space-y-2">
            {s.hours.days.map((d, i) => (
              <div key={i} className="grid grid-cols-[8rem_1fr_1fr] items-center gap-3">
                <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" name={`hen${i}`} defaultChecked={d.enabled} className="h-5 w-5 accent-[#4c294f]" />{DAYS[i]}</label>
                <input type="time" name={`hopen${i}`} defaultValue={d.open} aria-label={`${DAYS[i]} opens`} className="admin-input" />
                <input type="time" name={`hclose${i}`} defaultValue={d.close} aria-label={`${DAYS[i]} closes`} className="admin-input" />
              </div>
            ))}
          </div>
          <Field label="Hours note (optional)"><input name="hoursNote" defaultValue={s.hours.note} className="admin-input" /></Field>
        </Card>

        <Card title="Key homepage copy">
          <div className="grid gap-4">
            <Field label="Hero supporting copy"><textarea name="heroSub" rows={2} defaultValue={s.copy.heroSub} className="admin-input" /></Field>
            <Field label="Introduction heading"><input name="introHeading" defaultValue={s.copy.introHeading} className="admin-input" /></Field>
            <Field label="Introduction text"><textarea name="introBody" rows={3} defaultValue={s.copy.introBody} className="admin-input" /></Field>
            <Field label="Rental heading"><input name="rentalHeading" defaultValue={s.copy.rentalHeading} className="admin-input" /></Field>
            <Field label="Rental text"><textarea name="rentalBody" rows={3} defaultValue={s.copy.rentalBody} className="admin-input" /></Field>
            <Field label="Closing call-to-action heading"><input name="closingHeading" defaultValue={s.copy.closingHeading} className="admin-input" /></Field>
            <Field label="Closing call-to-action text"><textarea name="closingBody" rows={2} defaultValue={s.copy.closingBody} className="admin-input" /></Field>
          </div>
        </Card>
      </AdminForm>
    </>
  );
}
