import { getAdmin } from "@/lib/auth";
import { FOLDERS, MAX_UPLOAD, storeUpload, type Folder } from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await getAdmin())) return Response.json({ success: false, error: "Not authorised" }, { status: 401 });
  const fd = await req.formData().catch(() => null);
  const file = fd?.get("file");
  const folder = String(fd?.get("folder") ?? "");
  if (!(FOLDERS as readonly string[]).includes(folder)) return Response.json({ success: false, error: "Invalid folder" }, { status: 400 });
  if (!file || typeof file === "string" || file.size === 0) return Response.json({ success: false, error: "Choose an image file" }, { status: 400 });
  if (file.size > MAX_UPLOAD) return Response.json({ success: false, error: "Image is larger than 8 MB" }, { status: 413 });
  const r = await storeUpload(folder as Folder, Buffer.from(await file.arrayBuffer()));
  if ("error" in r) return Response.json({ success: false, error: r.error }, { status: 415 });
  return Response.json({ success: true, ...r });
}
