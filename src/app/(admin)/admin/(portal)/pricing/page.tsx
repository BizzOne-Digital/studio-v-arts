import { ActionButton, AdminForm, Check, Field } from "@/components/admin/ui";
import { Badge, Card, Empty, Title, Warn } from "@/components/admin/server-ui";
import { loadOffers, loadUsage } from "@/lib/booking";
import { getSettings } from "@/lib/settings";
import { deleteOffer, moveRow, saveOffer, savePricing } from "../actions";

export const metadata = { title: "Pricing & offers" };
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const KIND = { flat_rate: "Flat hourly rate", percent_off: "Percent off regular rate", package: "Fixed-price package" } as const;

function OfferForm({ o, min }: { o?: any; min: number }) {
  const p = o?.params ?? {};
  return (
    <AdminForm action={saveOffer} submitLabel={o ? "Save offer" : "Create offer"} resetOnSuccess={!o}>
      {o ? <input type="hidden" name="id" value={o.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" wide><input name="title" required defaultValue={o?.title} className="admin-input" /></Field>
        <Field label="Description (public)" wide><input name="description" defaultValue={o?.description} className="admin-input" /></Field>
        <Field label="Offer type"><select name="kind" defaultValue={o?.kind ?? "flat_rate"} className="admin-input">{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Limit: first N eligible bookings" hint="One rental booking counts once. Empty = no limit."><input name="limit" type="number" min={1} defaultValue={o?.limit_count ?? ""} className="admin-input" /></Field>
        <fieldset className="rounded-2xl bg-sand/60 p-4 sm:col-span-2"><legend className="px-1 text-sm font-semibold text-plum">Flat hourly rate settings</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Rate per hour (CAD)" hint={`Min ${(min / 100).toFixed(2)}`}><input name="rate" inputMode="decimal" defaultValue={p.rateCents != null ? p.rateCents / 100 : ""} className="admin-input" /></Field>
            <Field label="Window from (optional)"><input name="from" type="time" defaultValue={p.window?.from} className="admin-input" /></Field>
            <Field label="Window until"><input name="to" type="time" defaultValue={p.window?.to} className="admin-input" /></Field>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4">{DAYS.map((d, i) => <Check key={d} name={`day${i}`} label={d} defaultChecked={p.window?.days?.includes(i)} />)}</div>
          <p className="text-xs text-ink/60">For an off-peak offer, choose the days and times that count as off-peak. Leave all empty for no restriction.</p>
        </fieldset>
        <fieldset className="rounded-2xl bg-sand/60 p-4 sm:col-span-2"><legend className="px-1 text-sm font-semibold text-plum">Percent-off settings</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Percent off (1-99)"><input name="percent" type="number" min={1} max={99} defaultValue={p.percent ?? ""} className="admin-input" /></Field>
            <Field label="Minimum sessions booked together" hint="'More than five' = 6"><input name="minSessions" type="number" min={2} defaultValue={p.minSessions ?? ""} className="admin-input" /></Field>
          </div>
        </fieldset>
        <fieldset className="rounded-2xl bg-sand/60 p-4 sm:col-span-2"><legend className="px-1 text-sm font-semibold text-plum">Package settings</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Number of sessions"><input name="sessions" type="number" min={1} defaultValue={p.sessions ?? ""} className="admin-input" /></Field>
            <Field label="Hours per session"><input name="hoursEach" type="number" step="0.5" min={0.5} defaultValue={p.hoursEach ?? ""} className="admin-input" /></Field>
            <Field label="Total price (CAD)"><input name="total" inputMode="decimal" defaultValue={p.totalCents != null ? p.totalCents / 100 : ""} className="admin-input" /></Field>
          </div>
        </fieldset>
        <Field label="Valid from (optional)"><input name="startsOn" type="date" defaultValue={o?.starts_on ?? ""} className="admin-input" /></Field>
        <Field label="Valid until (optional)"><input name="endsOn" type="date" defaultValue={o?.ends_on ?? ""} className="admin-input" /></Field>
        <Check name="active" label="Active (visible and applied to bookings)" defaultChecked={o?.active} />
        <Check name="home" label="Feature on the Home page" defaultChecked={o?.show_on_home} />
      </div>
    </AdminForm>
  );
}

export default async function Pricing() {
  const [s, offers, usage] = await Promise.all([getSettings(), loadOffers(), loadUsage()]);
  const b = s.booking;
  return (
    <>
      <Title title="Pricing & offers" sub="Rental pricing is calculated on the server. Offers never stack: the lowest eligible price applies, and never below the minimum hourly rate." />
      <Card title="Rental rate, minimum and tax">
        <AdminForm action={savePricing}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Regular rental rate (CAD per hour)" hint="Leave empty until the owner confirms it."><input name="regular" inputMode="decimal" defaultValue={b.regularRateCents != null ? b.regularRateCents / 100 : ""} className="admin-input" /></Field>
            <Field label="Minimum hourly rate (CAD)" hint="No discounted rental can fall below this."><input name="min" inputMode="decimal" defaultValue={b.minRateCents / 100} className="admin-input" /></Field>
            <Check name="showRegular" label="Show the regular rate publicly" defaultChecked={b.showRegularRate} hint="No crossed-out comparison price is ever generated." />
            <div />
            <Check name="taxConfirmed" label="I have reviewed the tax setting below" defaultChecked={b.tax.configured} hint="Required before live bookings can be turned on." />
            <Check name="taxEnabled" label="Add tax to booking totals" defaultChecked={b.tax.enabled} />
            <Field label="Tax rate (%)"><input name="taxRate" type="number" step="0.001" min={0} defaultValue={b.tax.ratePct} className="admin-input" /></Field>
            <Field label="Tax label"><input name="taxLabel" defaultValue={b.tax.label} className="admin-input" placeholder="e.g. GST/QST" /></Field>
          </div>
        </AdminForm>
        <p className="mt-3 text-xs text-ink/60">Class prices are set per service and per session, independently of rental pricing.</p>
      </Card>

      <h2 className="display mb-4 mt-10 text-3xl text-plum">Offers</h2>
      <div className="mt-4 space-y-4">
        {offers.length === 0 ? <Empty>No offers.</Empty> : offers.map((o) => (
          <details key={o.id} className="rounded-3xl border border-plum/10 bg-white p-5">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
              <span className="font-semibold">{o.title} <Badge v={o.active ? "active" : "inactive"} /> <span className="text-sm font-normal text-ink/60">{KIND[o.kind]}</span></span>
              <span className="text-sm font-semibold">{o.limit_count ? `${usage[o.id] ?? 0} of ${o.limit_count} used` : `${usage[o.id] ?? 0} used`}</span>
            </summary>
            <div className="mt-5 space-y-4">
              <OfferForm o={o} min={b.minRateCents} />
              <div className="flex flex-wrap gap-2">
                <ActionButton action={moveRow.bind(null, "offers", o.id, "up")}>Move up</ActionButton>
                <ActionButton action={moveRow.bind(null, "offers", o.id, "down")}>Move down</ActionButton>
                <ActionButton action={deleteOffer.bind(null, o.id)} confirm="Delete this offer?">Delete</ActionButton>
              </div>
            </div>
          </details>
        ))}
      </div>
      <Card title="Create an offer" className="mt-6"><OfferForm min={b.minRateCents} /></Card>
    </>
  );
}
