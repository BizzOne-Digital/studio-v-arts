import Image from "next/image";
import { ActionButton, AdminForm, Field, ImageField } from "@/components/admin/ui";
import { Card, Empty, Title } from "@/components/admin/server-ui";
import { col } from "@/lib/db";
import { mediaSrc } from "@/lib/media";
import { deleteRow, moveRow, saveGalleryItem, addGalleryPhoto } from "../actions";

export const metadata = { title: "Gallery" };

export default async function Gallery() {
  const rows = await (await col("gallery_images")).find({}).sort({ sort_order: 1, created_at: 1 }).toArray();
  return (
    <>
      <Title title="Gallery" sub="Studio photography for the Home, About and Gallery pages. The first photos also feature in the Home hero." />
      <Card title="Add a photo">
        <AdminForm action={addGalleryPhoto} submitLabel="Add photo" resetOnSuccess key="add">
          <ImageField name="image_url" folder="gallery" label="Photo" />
          <Field label="Alt text" hint="Short description for screen readers."><input name="alt" required minLength={3} className="admin-input" /></Field>
          <Field label="Caption (optional)"><input name="caption" className="admin-input" /></Field>
        </AdminForm>
      </Card>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.length === 0 ? <div className="md:col-span-3"><Empty>No photos yet. Public pages show illustrated placeholders until you upload real photography.</Empty></div> : rows.map((r) => (
          <div key={r.id} className="overflow-hidden rounded-3xl border border-plum/10 bg-white">
            <div className="relative aspect-[4/3] w-full"><Image src={(r.image_url || mediaSrc(r.image_id))!} alt={r.alt} fill sizes="(min-width:1280px) 28vw, (min-width:768px) 45vw, 95vw" className="object-cover" /></div>
            <div className="space-y-3 p-4">
              <AdminForm action={saveGalleryItem}>
                <input type="hidden" name="id" value={r.id} />
                <Field label="Alt text"><input name="alt" defaultValue={r.alt} className="admin-input" /></Field>
                <Field label="Caption (optional)"><input name="caption" defaultValue={r.caption} className="admin-input" /></Field>
                <Field label="Status"><select name="status" defaultValue={r.status} className="admin-input"><option value="published">Published</option><option value="draft">Hidden</option></select></Field>
              </AdminForm>
              <div className="flex flex-wrap gap-2">
                <ActionButton action={moveRow.bind(null, "gallery_images", r.id, "up")}>&larr; Earlier</ActionButton>
                <ActionButton action={moveRow.bind(null, "gallery_images", r.id, "down")}>Later &rarr;</ActionButton>
                <ActionButton action={deleteRow.bind(null, "gallery_images", r.id)} confirm="Delete this photo?">Delete</ActionButton>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
