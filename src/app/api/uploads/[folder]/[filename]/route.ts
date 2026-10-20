import { col } from "@/lib/db";
import { FOLDERS } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(_: Request, ctx: { params: Promise<{ folder: string; filename: string }> }) {
  const { folder, filename } = await ctx.params;
  if (!(FOLDERS as readonly string[]).includes(folder) || !/^[A-Za-z0-9._-]+$/.test(filename) || filename.includes("..")) return new Response("Not found", { status: 404 });
  const doc = await (await col("stored_uploads")).findOne({ folder, filename });
  if (!doc) return new Response("Not found", { status: 404 });
  const bytes = Buffer.from(doc.data.buffer);
  return new Response(bytes, {
    headers: {
      "Content-Type": doc.mime_type,
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
