import { ActionButton, AdminForm, Check, Field } from "@/components/admin/ui";
import { Badge, Card, Empty, Title } from "@/components/admin/server-ui";
import { col } from "@/lib/db";
import { deleteRow, moveRow, saveFaq } from "../actions";

export const metadata = { title: "FAQs" };

export default async function Faqs() {
  const rows = await (await col("faqs")).find({}).sort({ sort_order: 1, created_at: 1 }).toArray();
  return (
    <>
      <Title title="FAQs" sub="Shown on the FAQ page. Tick 'Show on Home' to also feature a question on the homepage." />
      <Card title="Add a question">
        <AdminForm action={saveFaq} submitLabel="Add FAQ" resetOnSuccess>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Question" wide><input name="question" required className="admin-input" /></Field>
            <Field label="Answer" wide><textarea name="answer" rows={3} required className="admin-input" /></Field>
            <Field label="Status"><select name="status" defaultValue="published" className="admin-input"><option value="published">Published</option><option value="draft">Draft</option></select></Field>
            <Check name="home" label="Show on Home" />
          </div>
        </AdminForm>
      </Card>
      <div className="mt-6 space-y-4">
        {rows.length === 0 ? <Empty>No FAQs yet.</Empty> : rows.map((r) => (
          <details key={r.id} className="rounded-3xl border border-plum/10 bg-white p-5">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3"><span className="font-semibold">{r.question}</span><span><Badge v={r.status} /> {r.show_on_home ? <span className="text-xs font-semibold text-mauve-deep">Home</span> : null}</span></summary>
            <div className="mt-5 space-y-4">
              <AdminForm action={saveFaq}>
                <input type="hidden" name="id" value={r.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Question" wide><input name="question" defaultValue={r.question} required className="admin-input" /></Field>
                  <Field label="Answer" wide><textarea name="answer" rows={3} defaultValue={r.answer} required className="admin-input" /></Field>
                  <Field label="Status"><select name="status" defaultValue={r.status} className="admin-input"><option value="published">Published</option><option value="draft">Draft</option></select></Field>
                  <Check name="home" label="Show on Home" defaultChecked={r.show_on_home} />
                </div>
              </AdminForm>
              <div className="flex flex-wrap gap-2">
                <ActionButton action={moveRow.bind(null, "faqs", r.id, "up")}>Move up</ActionButton>
                <ActionButton action={moveRow.bind(null, "faqs", r.id, "down")}>Move down</ActionButton>
                <ActionButton action={deleteRow.bind(null, "faqs", r.id)} confirm="Delete this FAQ?">Delete</ActionButton>
              </div>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
