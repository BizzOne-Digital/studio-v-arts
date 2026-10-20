import { ActionButton, AdminForm, Check, Field, ImageField } from "@/components/admin/ui";
import { Badge, Card, Empty, Title, Warn } from "@/components/admin/server-ui";
import { col } from "@/lib/db";
import { mediaSrc } from "@/lib/media";
import { deleteRow, moveRow, saveTeam } from "../actions";

export const metadata = { title: "Team" };

function TeamForm({ r }: { r?: any }) {
  return (
    <AdminForm action={saveTeam} submitLabel={r ? "Save" : "Add team member"} resetOnSuccess={!r}>
      {r ? <input type="hidden" name="id" value={r.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name"><input name="name" required defaultValue={r?.name} className="admin-input" /></Field>
        <Field label="Role"><input name="role" defaultValue={r?.role} className="admin-input" /></Field>
        <Field label="Biography" wide hint="Only credentials and facts the person has confirmed."><textarea name="bio" rows={4} defaultValue={r?.bio} className="admin-input" /></Field>
        <ImageField name="image_url" folder="team" current={r?.image_url || mediaSrc(r?.image_id)} label="Photo" />
        <Field label="Photo alt text" wide><input name="imageAlt" defaultValue={r?.image_alt} className="admin-input" /></Field>
        <Field label="Status"><select name="status" defaultValue={r?.status ?? "draft"} className="admin-input"><option value="draft">Draft (hidden)</option><option value="published">Published</option></select></Field>
      </div>
    </AdminForm>
  );
}

export default async function Team() {
  const rows = await (await col("team_members")).find({}).sort({ sort_order: 1, created_at: 1 }).toArray();
  return (
    <>
      <Title title="Team" sub="Instructor and team profiles for the Team and About pages." />
      <Card title="Add a team member" className="mt-6"><TeamForm /></Card>
      <div className="mt-6 space-y-4">
        {rows.length === 0 ? <Empty>No team members yet. The Team page shows a friendly placeholder.</Empty> : rows.map((r) => (
          <details key={r.id} className="rounded-3xl border border-plum/10 bg-white p-5">
            <summary className="cursor-pointer font-semibold">{r.name} <span className="font-normal text-ink/60">{r.role}</span> <Badge v={r.status} /></summary>
            <div className="mt-5 space-y-4">
              <TeamForm r={r} />
              <div className="flex flex-wrap gap-2">
                <ActionButton action={moveRow.bind(null, "team_members", r.id, "up")}>Move up</ActionButton>
                <ActionButton action={moveRow.bind(null, "team_members", r.id, "down")}>Move down</ActionButton>
                <ActionButton action={deleteRow.bind(null, "team_members", r.id)} confirm="Delete this team member?">Delete</ActionButton>
              </div>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
