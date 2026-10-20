"use server";
import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminCount, clientIp, endSession, hashPassword, startSession, throttle, verifyPassword } from "@/lib/auth";
import { col, insert } from "@/lib/db";
import type { FormState } from "@/components/admin/ui";

const DUMMY = hashPassword("not-a-real-password");

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const ip = await clientIp();
  if (!throttle(`login:${ip}`, 10, 15 * 60_000) || !throttle(`login:${email}`, 6, 15 * 60_000))
    return { ok: false, message: "Too many attempts. Try again in a few minutes." };
  const u = await (await col("admin_users")).findOne({ email });
  const good = verifyPassword(password, u?.password_hash ?? DUMMY);
  if (!u || !good) return { ok: false, message: "Incorrect email or password." };
  await startSession(u.id);
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

export async function setup(_: FormState, fd: FormData): Promise<FormState> {
  if ((await adminCount()) > 0) return { ok: false, message: "Setup is already complete. Please sign in." };
  const expected = process.env.ADMIN_SETUP_TOKEN;
  if (!expected || expected.length < 8) return { ok: false, message: "ADMIN_SETUP_TOKEN is not configured on the server." };
  if (!throttle(`setup:${await clientIp()}`, 10, 15 * 60_000)) return { ok: false, message: "Too many attempts. Try again later." };
  const p = z.object({
    token: z.string(),
    email: z.string().trim().toLowerCase().email("Enter a valid email."),
    password: z.string().min(12, "Use at least 12 characters."),
    confirm: z.string(),
  }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const a = Buffer.from(p.data.token), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, message: "Setup token is incorrect." };
  if (p.data.password !== p.data.confirm) return { ok: false, message: "Passwords do not match." };
  // Only the first setup can claim this marker, even if two setups race.
  const claim = await (await col("locks")).updateOne({ _id: "admin-setup" } as any, { $setOnInsert: { at: new Date() } }, { upsert: true });
  if (!claim.upsertedCount) return { ok: false, message: "Setup is already complete. Please sign in." };
  const admin = await insert("admin_users", { email: p.data.email, password_hash: hashPassword(p.data.password) });
  await startSession(admin.id);
  redirect("/admin");
}
