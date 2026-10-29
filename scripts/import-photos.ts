// Imports the studio photographs into the media library, assigns one photo per service (no repeats), refills the gallery
// and the room images, and removes the earlier placeholder photos.
// Run once:  npx tsx --conditions=react-server --env-file-if-exists=.env.local scripts/import-photos.ts
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { Binary } from "mongodb";
import { col, insert } from "../src/lib/db";

const DIR = path.join(process.cwd(), "output", "studio-vm-photos");
const ALT: Record<string, string> = {
  "12-ballet": "Empty dance studio with a mirror wall, ballet barre and a pair of ballet shoes on the floor",
  "13-lounge": "Cosy seating area with armchairs, floor cushions and a tea set in the studio",
  "14-studio": "Open studio floor with pale wood flooring, mirrors and a ballet barre",
  "15-speaker": "Portable speaker, water bottle and folded towel on the studio floor",
  "16-boardgames": "Board game set up on a wooden table with chairs in the studio",
  "17-meeting": "Meeting table with notebooks, refreshments and a flip chart in the studio",
  "18-kids-learning": "Child-sized table and chairs with books, pencils and an abacus",
  "19-science": "Learning table with a globe, microscope, notebooks and wooden shapes",
  "20-yoga": "Cork yoga mats with blocks and folded towels in a bright studio",
  "21-clay": "Clay bowls and pottery tools laid out on a workshop table",
  "22-celebration": "Small birthday table with gold balloons and a cake in the studio",
  "23-sewing": "Sewing machine, silk fabric and a mannequin for costume making",
  "24-fitness": "Dumbbells, a rolled mat, resistance bands and a towel on the studio floor",
  "25-painting": "Painting workshop with canvases on easels, brushes and palettes",
  "26-chess": "Wooden chess set ready to play on a table in the studio",
};
// one photo per published service, no repeats
const SERVICE: Record<string, string> = {
  "Dance Classes": "12-ballet", Zumba: "15-speaker", Yoga: "20-yoga", Fitness: "24-fitness",
  Painting: "25-painting", "Creative Workshops": "21-clay", "Costume Making": "23-sewing",
  Chess: "26-chess", "Board Games": "16-boardgames", Tutoring: "18-kids-learning", "Educational Workshops": "19-science",
  "Small Birthdays": "22-celebration", "Community Gatherings & Baithaks": "13-lounge", "Lunch-and-Learn Events": "17-meeting",
  "Studio Rental": "14-studio",
};
// order matters: the About page pulls positions 6 and 12 for its feature photo and its full-width background
const GALLERY = ["12-ballet", "20-yoga", "25-painting", "22-celebration", "21-clay", "26-chess", "13-lounge", "24-fitness", "23-sewing", "16-boardgames", "17-meeting", "19-science", "14-studio", "18-kids-learning", "15-speaker"];
const ROOMS: Record<string, string> = { "Main Studio": "14-studio", "Private Studio": "13-lounge" };

async function main() {
  const ids: Record<string, string> = {};
  for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".png")).sort()) {
    const key = file.replace(/\.png$/, "");
    const fn = `photo:${key}`;
    const ex = await (await col("media")).findOne({ filename: fn }, { projection: { id: 1 } });
    if (ex) { ids[key] = ex.id as string; continue; }
    const buf = await sharp(path.join(DIR, file)).resize({ width: 1800, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    const r = await insert("media", { mime: "image/webp", bytes: new Binary(buf), size_bytes: buf.length, filename: fn });
    ids[key] = r.id;
    console.log("imported", key, Math.round(buf.length / 1024) + " KB");
  }
  for (const [title, key] of Object.entries(SERVICE))
    await (await col("services")).updateOne({ title }, { $set: { image_id: ids[key], image_url: null, image_alt: ALT[key] } });
  for (const [name, key] of Object.entries(ROOMS))
    await (await col("rooms")).updateOne({ name }, { $set: { image_id: ids[key], image_url: null, image_alt: ALT[key] } });
  await (await col("gallery_images")).deleteMany({});
  let i = 0;
  for (const key of GALLERY) await insert("gallery_images", { image_id: ids[key], alt: ALT[key], caption: "", status: "published", sort_order: i++ });
  // remove the earlier placeholder photos
  const old = await (await col("media")).deleteMany({ filename: /^import:/ });
  console.log("removed old photos:", old.deletedCount, "| done");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
