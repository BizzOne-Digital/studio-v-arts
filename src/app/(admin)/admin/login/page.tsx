import { redirect } from "next/navigation";
import { AdminForm, Field } from "@/components/admin/ui";
import { adminCount, getAdmin } from "@/lib/auth";
import { login } from "../auth-actions";

export const metadata = { title: "Sign in" };

export default async function Login() {
  if (await getAdmin()) redirect("/admin");
  const first = (await adminCount()) === 0;
  return (
    <main className="grid min-h-svh place-items-center p-6">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-xl sm:p-10">
        <p className="eyebrow">Studio V</p>
        <h1 className="display mt-2 text-4xl text-plum">Admin sign in</h1>
        {first ? (
          <p className="mt-4 rounded-2xl bg-champagne-soft p-4 text-sm">No administrator exists yet. <a className="font-semibold underline" href="/admin/setup">Create the first admin account</a>.</p>
        ) : null}
        <AdminForm action={login} submitLabel="Sign in" className="mt-6">
          <Field label="Email"><input name="email" type="email" autoComplete="username" required className="admin-input" /></Field>
          <Field label="Password"><input name="password" type="password" autoComplete="current-password" required className="admin-input" /></Field>
        </AdminForm>
      </div>
    </main>
  );
}
