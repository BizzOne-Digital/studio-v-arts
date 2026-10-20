// Creates (or resets the password of) an admin user.
// Usage: npm run db:admin -- admin@example.com "a-strong-password"
import { hashPassword } from "../src/lib/password";
import { col, insert } from "../src/lib/db";

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) throw new Error('Usage: npm run db:admin -- <email> "<password>"');
  const users = await col("admin_users");
  const e = email.trim().toLowerCase();
  const existing = await users.findOne({ email: e });
  if (existing) {
    await users.updateOne({ _id: existing._id }, { $set: { password_hash: hashPassword(password) } });
    console.log("Updated password for", e);
  } else {
    await insert("admin_users", { email: e, password_hash: hashPassword(password) });
    console.log("Created admin", e);
  }
  process.exit(0);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
