import { ActionButton } from "@/components/admin/ui";
import { Badge, Empty, Title } from "@/components/admin/server-ui";
import { col } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { fmtDateTime } from "@/lib/time";
import { setMessageStatus } from "../actions";

export const metadata = { title: "Messages" };

export default async function Messages() {
  const [s, rows] = await Promise.all([getSettings(), (async () => ({ rows: await (await col("contact_messages")).find({}).sort({ created_at: -1 }).limit(200).toArray() }))()]);
  return (
    <>
      <Title title="Messages" sub="Messages sent through the Contact page form." />
      {rows.rows.length === 0 ? <Empty>No messages yet.</Empty> : (
        <ul className="space-y-4">
          {rows.rows.map((m: any) => (
            <li key={m.id} className="rounded-3xl border border-plum/10 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold">{m.name} <Badge v={m.status} /></p>
                <p className="text-sm text-ink/60">{fmtDateTime(m.created_at, s.booking.timezone)}</p>
              </div>
              <p className="mt-1 text-sm"><a className="underline" href={`mailto:${m.email}`}>{m.email}</a>{m.phone ? <> · <a className="underline" href={`tel:${m.phone}`}>{m.phone}</a></> : null}{m.subject ? <> · {m.subject}</> : null}</p>
              <p className="mt-3 whitespace-pre-line">{m.message}</p>
              <div className="mt-4 flex gap-2">
                {m.status !== "read" ? <ActionButton action={setMessageStatus.bind(null, m.id, "read")}>Mark read</ActionButton> : <ActionButton action={setMessageStatus.bind(null, m.id, "new")}>Mark unread</ActionButton>}
                {m.status !== "archived" ? <ActionButton action={setMessageStatus.bind(null, m.id, "archived")}>Archive</ActionButton> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
