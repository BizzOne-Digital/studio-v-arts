import { ActionButton, AdminForm, Check, Field, ImageField } from "@/components/admin/ui";
import { Badge, Card, Empty, Title } from "@/components/admin/server-ui";
import { col } from "@/lib/db";
import { money } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import { deleteRoom, moveRow, saveRoom } from "../actions";

export const metadata = { title: "Rooms" };

function RoomForm({ r }: { r?: any }) {
  return (
    <AdminForm action={saveRoom} submitLabel={r ? "Save room" : "Add room"} resetOnSuccess={!r}>
      {r ? <input type="hidden" name="id" value={r.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Room name"><input name="name" required defaultValue={r?.name} className="admin-input" /></Field>
        <Field label="Size (sq ft)"><input name="size" type="number" min={1} defaultValue={r?.size_sqft ?? ""} className="admin-input" /></Field>
        <Field label="Price per hour (CAD)"><input name="price" required inputMode="decimal" defaultValue={r ? r.price_cents / 100 : ""} className="admin-input" /></Field>
        <Field label="Maximum people"><input name="capacity" required type="number" min={1} defaultValue={r?.capacity ?? ""} className="admin-input" /></Field>
        <Field label="Price note (shown beside the price)" hint="For example: introductory rate for the first 6 months." wide><input name="priceNote" defaultValue={r?.price_note} className="admin-input" /></Field>
        <Field label="Price after the introductory period (CAD)" hint="Optional. Used automatically after the end date below."><input name="afterPrice" inputMode="decimal" defaultValue={r?.after_price_cents != null ? r.after_price_cents / 100 : ""} className="admin-input" /></Field>
        <Field label="Introductory price ends on" hint="Optional date. Leave empty if the price has no end date."><input name="priceUntil" type="date" defaultValue={r?.price_until ?? ""} className="admin-input" /></Field>
        <Field label="Description" wide><textarea name="description" rows={3} defaultValue={r?.description} className="admin-input" /></Field>
        <Field label="Good for (one per line)" wide><textarea name="uses" rows={3} defaultValue={(r?.uses ?? []).join("\n")} className="admin-input" placeholder={"Dance classes\nWorkshops\nRehearsals"} /></Field>
        <ImageField name="image_url" folder="pages" current={r?.image_url || mediaSrc(r?.image_id)} label="Photo" />
        <Field label="Photo alt text" wide><input name="imageAlt" defaultValue={r?.image_alt} className="admin-input" /></Field>
        <Check name="active" label="Bookable online" defaultChecked={r ? r.active !== false : true} />
      </div>
    </AdminForm>
  );
}

export default async function Rooms() {
  const rows = await (await col("rooms")).find({}).sort({ sort_order: 1, created_at: 1 }).toArray();
  return (
    <>
      <Title title="Rooms" sub="The spaces people can book. Each room has its own calendar, so a booking in one room never blocks another. The first room is the main studio, and classes are scheduled in it." />
      <Card title="Add a room"><RoomForm /></Card>
      <div className="mt-6 space-y-4">
        {rows.length === 0 ? <Empty>No rooms yet. Add the main studio first.</Empty> : rows.map((r, i) => (
          <details key={r.id} className="rounded-3xl border border-plum/10 bg-white p-5">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
              <span className="font-semibold">{r.name} {i === 0 ? <span className="text-xs font-normal text-ink/60">(main studio)</span> : null} <Badge v={r.active === false ? "draft" : "published"} /></span>
              <span className="text-sm text-ink/65">{money(r.price_cents)} / hour &middot; up to {r.capacity} people</span>
            </summary>
            <div className="mt-5 space-y-4">
              <RoomForm r={r} />
              <div className="flex flex-wrap gap-2">
                <ActionButton action={moveRow.bind(null, "rooms", r.id, "up")}>Move up</ActionButton>
                <ActionButton action={moveRow.bind(null, "rooms", r.id, "down")}>Move down</ActionButton>
                <ActionButton action={deleteRoom.bind(null, r.id)} confirm="Delete this room? This is only possible if it has no bookings.">Delete</ActionButton>
              </div>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
