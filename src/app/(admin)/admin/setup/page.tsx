import { redirect } from "next/navigation";
import { AdminForm, Field } from "@/components/admin/ui";
import { adminCount } from "@/lib/auth";
import { setup } from "../auth-actions";

export const metadata = { title: "First-time setup" };

export default async function Setup() {
  if ((await adminCount()) > 0) redirect("/admin/login");
  return (
    <main className="grid min-h-svh place-items-center p-6">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-xl sm:p-10">
        <p className="eyebrow">First-time setup</p>
        <h1 className="display mt-2 text-4xl text-plum">Create the admin account</h1>
        <p className="mt-3 text-sm text-ink/70">Enter the setup token from the server&apos;s ADMIN_SETUP_TOKEN setting. This page disappears once an admin exists.</p>
        <AdminForm action={setup} submitLabel="Create account" className="mt-6">
          <Field label="Setup token"><input name="token" type="password" autoComplete="off" required className="admin-input" /></Field>
          <Field label="Email"><input name="email" type="email" autoComplete="username" required className="admin-input" /></Field>
          <Field label="Password" hint="At least 12 characters."><input name="password" type="password" autoComplete="new-password" minLength={12} required className="admin-input" /></Field>
          <Field label="Confirm password"><input name="confirm" type="password" autoComplete="new-password" required className="admin-input" /></Field>
        </AdminForm>
      </div>
    </main>
  );
}
