import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { Badge, Card, CardHeader, EmptyState, Field, Input, Textarea } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { createTicket } from "../actions";

export default async function TicketsPage() {
  const user = await requireUser("/account/tickets");
  const tickets = await db.ticket.findMany({
    where: { userId: user.id },
    include: { booking: { select: { code: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Your support requests" />
        {tickets.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No requests yet" />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link href={`/account/tickets/${t.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                  <span>
                    <span className="font-medium text-slate-900">{t.subject}</span>
                    {t.booking ? <span className="ml-2 text-xs text-slate-500">{t.booking.code}</span> : null}
                  </span>
                  <span className="flex items-center gap-3 text-sm text-slate-500">
                    {formatDateTime(t.updatedAt)}
                    <Badge tone={t.status === "OPEN" ? "amber" : "green"}>{t.status === "OPEN" ? "Open" : "Closed"}</Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <CardHeader title="New request" />
        <ActionForm action={createTicket} className="space-y-3 p-5">
          <Field label="Subject">
            <Input name="subject" required />
          </Field>
          <Field label="Message">
            <Textarea name="body" rows={4} required />
          </Field>
          <SubmitButton pendingText="Sending…">Send</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
