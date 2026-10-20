import "server-only";
import crypto from "node:crypto";
import { MongoClient, type ClientSession, type Collection, type Db } from "mongodb";

/**
 * MongoDB data layer. Every document uses a string UUID as `_id` and repeats it as `id`, so the rest of the
 * app can treat ids as plain strings. Timestamps are Dates, date-only values are "YYYY-MM-DD" strings.
 */
type G = typeof globalThis & { __mongo?: Promise<{ client: MongoClient; db: Db }> };
const g = globalThis as G;

const COLLECTIONS = [
  "settings", "media", "services", "sessions", "offers", "bookings", "booking_slots", "blocked_dates",
  "testimonials", "faqs", "team_members", "gallery_images", "contact_messages", "admin_users", "locks", "stored_uploads",
];

function uri() {
  const u = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!u || !/^mongodb(\+srv)?:\/\//.test(u)) throw new Error("Set MONGODB_URI (a mongodb:// or mongodb+srv:// connection string) in the environment.");
  return u;
}

export async function ensureIndexes(db: Db) {
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  for (const n of COLLECTIONS) if (!existing.has(n)) await db.createCollection(n).catch(() => {});
  await Promise.all([
    db.collection("services").createIndex({ slug: 1 }, { unique: true }),
    db.collection("offers").createIndex({ slug: 1 }, { unique: true }),
    db.collection("bookings").createIndex({ reference: 1 }, { unique: true }),
    db.collection("bookings").createIndex({ status: 1 }),
    db.collection("bookings").createIndex({ session_id: 1 }),
    db.collection("bookings").createIndex({ customer_email: 1 }),
    db.collection("booking_slots").createIndex({ booking_id: 1 }),
    db.collection("booking_slots").createIndex({ active: 1, starts_at: 1 }),
    db.collection("sessions").createIndex({ starts_at: 1 }),
    db.collection("admin_users").createIndex({ email: 1 }, { unique: true }),
    db.collection("stored_uploads").createIndex({ folder: 1, filename: 1 }, { unique: true }),
  ]);
}

function conn() {
  g.__mongo ??= (async () => {
    const client = new MongoClient(uri(), { maxPoolSize: 10, minPoolSize: 1, compressors: ["zlib"] });
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || "studio_v");
    // The lock document must exist before any booking transaction. Indexes are re-checked in the background after a delay so early requests are not slowed (seed also creates them).
    await db.collection("locks").updateOne({ _id: "studio" as any }, { $setOnInsert: { n: 0 } }, { upsert: true });
    setTimeout(() => ensureIndexes(db).catch((e) => console.error("ensureIndexes failed", e)), 30_000).unref?.();
    return { client, db };
  })();
  g.__mongo.catch(() => { g.__mongo = undefined; });
  return g.__mongo;
}

export async function col(name: string): Promise<Collection<any>> {
  return (await conn()).db.collection(name);
}

export const newId = () => crypto.randomUUID();

/** Inserts a document with generated id and created_at. Returns the stored document. */
export async function insert(name: string, doc: Record<string, unknown>, session?: ClientSession) {
  const id = newId();
  const full = { _id: id, id, created_at: new Date(), ...doc };
  await (await col(name)).insertOne(full as any, { session });
  return full as Record<string, any> & { id: string };
}

export async function byId<T = any>(name: string, id: string, session?: ClientSession): Promise<T | null> {
  return ((await (await col(name)).findOne({ _id: id } as any, { session })) as T) ?? null;
}

/** Next sort_order for ordered lists (testimonials, faqs, etc.). */
export async function nextSort(name: string, filter: Record<string, unknown> = {}) {
  const top = await (await col(name)).find(filter).sort({ sort_order: -1 }).limit(1).toArray();
  return (top[0]?.sort_order ?? 0) + 1;
}

/**
 * Runs fn in a transaction (needs a replica set, which Atlas always is). Booking writes call lockStudio first:
 * all of them update one shared document, so concurrent transactions conflict and are retried one after another.
 */
export async function tx<T>(fn: (s: ClientSession) => Promise<T>): Promise<T> {
  const { client } = await conn();
  const session = client.startSession();
  try {
    let out!: T;
    await session.withTransaction(async () => { out = await fn(session); }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
    return out;
  } finally {
    await session.endSession();
  }
}

export async function lockStudio(session: ClientSession) {
  await (await col("locks")).updateOne({ _id: "studio" as any }, { $inc: { n: 1 } }, { session });
}

export type { ClientSession };
