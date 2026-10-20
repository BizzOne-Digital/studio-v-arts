import { ActionButton, AdminForm, Check, Field, ImageField } from "@/components/admin/ui";
import { Badge, Card, Empty, Title } from "@/components/admin/server-ui";
import { col } from "@/lib/db";
import { CATEGORIES, CATEGORY_KEYS, money } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import { moveFeatured, moveRow, saveService, setServiceStatus, toggleFeatured } from "../actions";

export const metadata = { title: "Services" };

export default async function Services({ searchParams }: { searchParams: Promise<{ edit?: string; show?: string }> }) {
  const sp = await searchParams;
  const [svcRows, up] = await Promise.all([
    (await col("services")).find({}).sort({ sort_order: 1, created_at: 1 }).toArray(),
    (await col("sessions")).aggregate([{ $match: { status: "published", starts_at: { $gt: new Date() } } }, { $group: { _id: "$service_id", n: { $sum: 1 } } }]).toArray(),
  ]);
  const upMap = new Map(up.map((u) => [u._id as string, u.n as number]));
  const rows = svcRows.map((r) => ({ ...r, upcoming: upMap.get(r.id) ?? 0 }));
  const show = sp.show === "archived" ? "archived" : "active";
  const list = rows.filter((r) => (show === "archived" ? r.status === "archived" : r.status !== "archived"));
  const x = sp.edit ? rows.find((r) => r.id === sp.edit) : null;
  const featured = rows.filter((r) => r.featured_order != null).sort((a, b) => a.featured_order - b.featured_order);

  return (
    <>
      <Title title="Services" sub="Experiences shown on the Experiences page. Draft and archived services are never visible to the public." />
      <Card title={x ? `Edit: ${x.title}` : "Add a service"}>
        <AdminForm action={saveService} submitLabel={x ? "Save service" : "Create service"} resetOnSuccess={!x} key={x?.id ?? "new"}>
          {x ? <input type="hidden" name="id" value={x.id} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" wide><input name="title" required defaultValue={x?.title} className="admin-input" /></Field>
            <Field label="Category"><select name="category" defaultValue={x?.category ?? "move"} className="admin-input">{CATEGORY_KEYS.map((k) => <option key={k} value={k}>{CATEGORIES[k].label}</option>)}</select></Field>
            <Field label="Booking type" hint="Class = scheduled sessions people book. Rental = studio hire. Enquiry = contact us."><select name="bookingType" defaultValue={x?.booking_type ?? "class"} className="admin-input"><option value="class">Class (scheduled sessions)</option><option value="rental">Studio rental</option><option value="enquiry">Enquiry only</option></select></Field>
            <Field label="Short summary" wide><input name="summary" maxLength={240} defaultValue={x?.summary} className="admin-input" /></Field>
            <Field label="Description" wide><textarea name="description" rows={4} defaultValue={x?.description} className="admin-input" /></Field>
            <Field label="Audience" hint="Only what the owner has confirmed."><input name="audience" defaultValue={x?.audience} className="admin-input" /></Field>
            <Field label="Age information"><input name="ageInfo" defaultValue={x?.age_info} className="admin-input" /></Field>
            <Field label="Duration (minutes)"><input name="duration" type="number" min={1} defaultValue={x?.duration_minutes ?? ""} className="admin-input" /></Field>
            <Field label="Price per person (CAD)" hint="Empty = no online price. Classes need a price (here or per session) to be bookable."><input name="price" inputMode="decimal" defaultValue={x?.price_cents != null ? x.price_cents / 100 : ""} className="admin-input" /></Field>
            <Field label="Price note (shown instead of a price)"><input name="priceNote" defaultValue={x?.price_note} className="admin-input" /></Field>
            <Field label="Instructor"><input name="instructor" defaultValue={x?.instructor} className="admin-input" /></Field>
            <Field label="Capacity"><input name="capacity" type="number" min={1} defaultValue={x?.capacity ?? ""} className="admin-input" /></Field>
            <Field label="Status"><select name="status" defaultValue={x?.status ?? "draft"} className="admin-input"><option value="draft">Draft (hidden)</option><option value="published">Published</option><option value="archived">Archived</option></select></Field>
            <ImageField name="image_url" folder="services" current={x?.image_url || mediaSrc(x?.image_id)} />
            <Field label="Image alt text" hint="Describe the photo for screen readers." wide><input name="imageAlt" defaultValue={x?.image_alt} className="admin-input" /></Field>
          </div>
        </AdminForm>
        {x ? <a href="/admin/services" className="mt-3 inline-block text-sm underline">Cancel editing</a> : null}
      </Card>

      <div className="mt-8 flex gap-3 text-sm">
        <a href="/admin/services" className={show === "active" ? "font-bold underline" : "underline"}>Active</a>
        <a href="/admin/services?show=archived" className={show === "archived" ? "font-bold underline" : "underline"}>Archived</a>
      </div>
      <div className="mt-3 space-y-3">
        {list.length === 0 ? <Empty>No services here.</Empty> : list.map((r, i) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-plum/10 bg-white p-5">
            <div className="min-w-0">
              <p className="font-semibold">{r.title} <Badge v={r.status} /> {r.featured_order != null ? <span className="rounded-full bg-champagne-soft px-2.5 py-1 text-xs font-semibold">Featured #{featured.findIndex((f) => f.id === r.id) + 1}</span> : null}</p>
              <p className="text-sm text-ink/65">{CATEGORIES[r.category as keyof typeof CATEGORIES].label} · {r.booking_type} · {r.price_cents != null ? money(r.price_cents) : "no price"}{r.booking_type === "class" ? ` · ${r.upcoming} upcoming` : ""}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton action={moveRow.bind(null, "services", r.id, "up")} title="Move up" className={i === 0 ? "opacity-40" : ""}>&uarr;</ActionButton>
              <ActionButton action={moveRow.bind(null, "services", r.id, "down")} title="Move down">&darr;</ActionButton>
              <a href={`/admin/services?edit=${r.id}`} className="inline-flex min-h-10 items-center rounded-full border border-plum/30 px-4 text-sm font-semibold text-plum">Edit</a>
              {r.status === "published" ? <ActionButton action={setServiceStatus.bind(null, r.id, "draft")}>Unpublish</ActionButton> : r.status !== "archived" ? <ActionButton action={setServiceStatus.bind(null, r.id, "published")}>Publish</ActionButton> : null}
              {r.status === "archived" ? <ActionButton action={setServiceStatus.bind(null, r.id, "draft")}>Restore</ActionButton> : <ActionButton action={setServiceStatus.bind(null, r.id, "archived")} confirm="Archive this service? It will be hidden publicly.">Archive</ActionButton>}
              {r.featured_order == null ? <ActionButton action={toggleFeatured.bind(null, r.id, true)}>Feature</ActionButton> : (
                <>
                  <ActionButton action={moveFeatured.bind(null, r.id, "up")} title="Move earlier in featured order">Featured &uarr;</ActionButton>
                  <ActionButton action={moveFeatured.bind(null, r.id, "down")} title="Move later in featured order">&darr;</ActionButton>
                  <ActionButton action={toggleFeatured.bind(null, r.id, false)}>Unfeature</ActionButton>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
