// Imports the supplied illustrative photos into the media library and assigns them to services and the gallery.
// Run once:  npx tsx --conditions=react-server --env-file-if-exists=.env.local scripts/import-photos.ts
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { Binary } from "mongodb";
import { col, insert } from "../src/lib/db";

const DIR = path.join(process.cwd(), "output", "studio-v-site-photos");
const ALT: Record<string, string> = {
  "01-studio-interior": "Bright studio room with ivory walls, pale oak floor and tall arched windows",
  "02-yoga-wellness": "Yoga mats, cork blocks and folded blankets laid out in a sunlit room",
  "03-dance-studio": "Dance room with a ballet barre, large mirror and soft mauve curtains",
  "04-art-workshop": "Art workshop table set up with paints and brushes",
  "05-chess": "Chess board set up on a table ready to play",
  "06-board-games": "Board games laid out on a table",
  "07-learning-corner": "Quiet learning corner with books and a table",
  "08-birthday-setup": "Small birthday celebration table set up in the studio",
  "09-community-lounge": "Cosy community lounge seating area",
  "10-creative-textiles": "Fabrics and sewing supplies for costume making",
  "11-fitness-equipment": "Fitness equipment neatly arranged in the studio",
  "12-tea-and-learning": "Tea service and notebooks set up for a lunch-and-learn",
  "13-studio-detail": "Detail of the studio's warm interior",
  "14-studio-rental": "Open studio floor ready to be rented",
  "15-wellness-still-life": "Still life of wellness items in soft daylight",
};
const SERVICE: Record<string, string> = {
  "Dance Classes": "03-dance-studio", Zumba: "03-dance-studio", Yoga: "02-yoga-wellness", Fitness: "11-fitness-equipment",
  Painting: "04-art-workshop", "Creative Workshops": "04-art-workshop", "Costume Making": "10-creative-textiles",
  Chess: "05-chess", "Board Games": "06-board-games", Tutoring: "07-learning-corner", "Educational Workshops": "07-learning-corner",
  "Small Birthdays": "08-birthday-setup", "Community Gatherings & Baithaks": "09-community-lounge", "Lunch-and-Learn Events": "12-tea-and-learning",
  "Studio Rental": "14-studio-rental",
};
const GALLERY = ["01-studio-interior", "03-dance-studio", "02-yoga-wellness", "04-art-workshop", "09-community-lounge", "08-birthday-setup", "13-studio-detail",
  "15-wellness-still-life", "05-chess", "06-board-games", "10-creative-textiles", "11-fitness-equipment", "07-learning-corner", "12-tea-and-learning", "14-studio-rental"];

async function main() {
  const ids: Record<string, string> = {};
  for (const key of Object.keys(ALT)) {
    const fn = `import:${key}`;
    const ex = await (await col("media")).findOne({ filename: fn });
    if (ex) { ids[key] = ex.id as string; continue; }
    const buf = await sharp(path.join(DIR, `${key}.png`)).resize({ width: 1800, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    const r = await insert("media", { mime: "image/webp", bytes: new Binary(buf), size_bytes: buf.length, filename: fn });
    ids[key] = r.id;
    console.log("imported", key, Math.round(buf.length / 1024) + " KB");
  }
  for (const [title, key] of Object.entries(SERVICE))
    await (await col("services")).updateOne({ title }, { $set: { image_id: ids[key], image_alt: ALT[key] } });
  if ((await (await col("gallery_images")).countDocuments()) === 0) {
    let i = 0;
    for (const key of GALLERY) await insert("gallery_images", { image_id: ids[key], alt: ALT[key], caption: "", status: "published", sort_order: i++ });
  }
  console.log("done");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
