import "server-only";
import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { col } from "./db";

const COOKIE = "sv_admin";
const MAX_AGE = 60 * 60 * 8;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set to a random string of at least 32 characters.");
  return new TextEncoder().encode(s);
}

export { hashPassword, verifyPassword } from "./password";

export async function startSession(userId: string) {
  const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(userId).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE });
}
export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export type Admin = { id: string; email: string };

export async function getAdmin(): Promise<Admin | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    const u = await (await col("admin_users")).findOne({ _id: payload.sub } as any);
    return u ? { id: u.id, email: u.email } : null;
  } catch {
    return null;
  }
}

/** For admin pages. Redirects to login. */
export async function requireAdmin(): Promise<Admin> {
  const a = await getAdmin();
  if (!a) redirect("/admin/login");
  return a;
}

/** For server actions and route handlers: every admin mutation calls this first. */
export async function assertAdmin(): Promise<Admin> {
  const a = await getAdmin();
  if (!a) throw new Error("Not authorised");
  return a;
}

export async function adminCount() {
  return (await col("admin_users")).countDocuments();
}

/* Small in-memory throttle (per server instance). Enough to slow password guessing and form spam. */
const hits = new Map<string, number[]>();
export function throttle(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    hits.set(key, arr);
    return false;
  }
  arr.push(now);
  hits.set(key, arr);
  return true;
}
export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "local").split(",")[0].trim();
}
