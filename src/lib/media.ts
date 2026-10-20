import "server-only";
import { Binary } from "mongodb";
import { insert } from "./db";

const MAX = 4 * 1024 * 1024;

function sniff(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return "image/webp";
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 && b[8] === 0x61 && b[9] === 0x76) return "image/avif";
  return null;
}

/** Stores an uploaded image. The type is decided from file contents, not the filename. */
export async function saveUpload(file: File | null | undefined): Promise<{ id: string | null; error?: string }> {
  if (!file || typeof file === "string" || file.size === 0) return { id: null };
  if (file.size > MAX) return { id: null, error: "Image is larger than 4 MB." };
  const buf = new Uint8Array(await file.arrayBuffer());
  const mime = sniff(buf);
  if (!mime) return { id: null, error: "Use a JPG, PNG, WebP or AVIF image." };
  const doc = await insert("media", { mime, bytes: new Binary(Buffer.from(buf)), size_bytes: buf.length, filename: file.name.slice(0, 120) });
  return { id: doc.id };
}

export const mediaSrc = (id: string | null | undefined) => (id ? `/api/media/${id}` : null);
