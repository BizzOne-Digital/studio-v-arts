import { ActionButton, AdminForm, Field } from "@/components/admin/ui";
import { Badge, Card, Empty, Title, Warn } from "@/components/admin/server-ui";
import { col } from "@/lib/db";
import { deleteRow, moveRow, saveTestimonial } from "../actions";

export const metadata = { title: "Testimonials" };

export default async function Testimonials() {
  const rows = await (await col("testimonials")).find({}).sort({ sort_order: 1, created_at: 1 }).toArray();
  return (
    <>
      <Title title="Testimonials" sub="Only add real feedback from real customers. Nothing is pre-filled." />
      <Card title="Add a testimonial" className="mt-6">
        <AdminForm action={saveTestimonial} submitLabel="Add testimonial" resetOnSuccess>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><input name="name" required className="admin-input" /></Field>
            <Field label="Role or context (optional)"><input name="role" className="admin-input" /></Field>
            <Field label="Quote" wide><textarea name="quote" rows={3} required className="admin-input" /></Field>
            <Field label="Status"><select name="status" defaultValue="draft" className="admin-input"><option value="draft">Draft</option><option value="published">Published</option></select></Field>
          </div>
        </AdminForm>
      </Card>
      <div className="mt-6 space-y-4">
        {rows.length === 0 ? <Empty>No testimonials yet. The public pages show a friendly empty state.</Empty> : rows.map((r) => (
          <details key={r.id} className="rounded-3xl border border-plum/10 bg-white p-5">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3"><span className="font-semibold">{r.author_name} <Badge v={r.status} /></span><span className="line-clamp-1 max-w-md text-sm text-ink/60">{r.quote}</span></summary>
            <div className="mt-5 space-y-4">
              <AdminForm action={saveTestimonial}>
                <input type="hidden" name="id" value={r.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name"><input name="name" defaultValue={r.author_name} required className="admin-input" /></Field>
                  <Field label="Role"><input name="role" defaultValue={r.author_role} className="admin-input" /></Field>
                  <Field label="Quote" wide><textarea name="quote" rows={3} defaultValue={r.quote} required className="admin-input" /></Field>
                  <Field label="Status"><select name="status" defaultValue={r.status} className="admin-input"><option value="draft">Draft</option><option value="published">Published</option></select></Field>
                </div>
              </AdminForm>
              <div className="flex flex-wrap gap-2">
                <ActionButton action={moveRow.bind(null, "testimonials", r.id, "up")}>Move up</ActionButton>
                <ActionButton action={moveRow.bind(null, "testimonials", r.id, "down")}>Move down</ActionButton>
                <ActionButton action={deleteRow.bind(null, "testimonials", r.id)} confirm="Delete this testimonial permanently?">Delete</ActionButton>
              </div>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
