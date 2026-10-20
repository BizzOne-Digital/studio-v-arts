import "server-only";
import crypto from "node:crypto";
import { Binary } from "mongodb";
import sharp from "sharp";
import { col, insert } from "./db";

export const FOLDERS = ["services", "team", "gallery", "pages", "misc"] as const;
export type Folder = (typeof FOLDERS)[number];
export const MAX_UPLOAD = 8 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

/** Decides the type from the file's first bytes, never from its name or declared type. */
export function sniffImage(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return "image/webp";
  return null;
}

export async function storeUpload(folder: Folder, input: Buffer) {
  let buf = input;
  let mime = sniffImage(input);
  if (!mime) return { error: "Use a JPG, PNG, WebP or GIF image." } as const;
  // Photos are resized (max 2000px) and re-encoded as WebP so pages load fast. GIFs are kept as uploaded.
  if (mime !== "image/gif") {
    try {
      buf = await sharp(input).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
      mime = "image/webp";
    } catch {
      return { error: "That image could not be processed. Try a different file." } as const;
    }
  }
  const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${EXT[mime]}`;
  await insert("stored_uploads", { folder, filename, mime_type: mime, size: buf.length, data: new Binary(buf), updated_at: new Date() });
  return { url: `/api/uploads/${folder}/${filename}`, filename, size: buf.length, folder } as const;
}

/** Deletes the stored file behind an /api/uploads/ URL. Other URLs (legacy media, external) are left alone. */
export async function deleteUploadByUrl(url: string | null | undefined) {
  const m = /^\/api\/uploads\/([a-z]+)\/([A-Za-z0-9._-]+)$/.exec(url ?? "");
  if (!m || !(FOLDERS as readonly string[]).includes(m[1])) return;
  await (await col("stored_uploads")).deleteOne({ folder: m[1], filename: m[2] });
}

/** Accepts only URLs this site serves, so admin forms cannot store arbitrary links. */
export function cleanImageUrl(v: FormDataEntryValue | null): string {
  const s = String(v ?? "").trim();
  return /^\/api\/(uploads\/[a-z]+\/[A-Za-z0-9._-]+|media\/[0-9a-f-]{36})$/.test(s) ? s : "";
}
