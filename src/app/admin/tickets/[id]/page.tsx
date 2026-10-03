import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { Badge, Card, CardHeader, Checkbox, Textarea } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { TicketThread } from "@/components/ticket-thread";
import { reopenTicketAction, staffReplyTicketAction } from "../../people-actions";

export default async function AdminTicketPage(props: PageProps<"/admin/tickets/[id]">) {
  await requireStaff("tickets");
  const { id } = await props.params;
  const ticket = await db.ticket.findUnique({
    where: { id },
    include: { user: true, booking: { select: { code: true } }, messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) notFound();
  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/admin/tickets" className="text-sm text-slate-500 hover:text-slate-800">← Support</Link>
      <Card>
        <CardHeader
          title={ticket.subject}
          subtitle={
            <>
              <Link href={`/admin/customers/${ticket.userId}`} className="text-orange-700">{ticket.user.name}</Link> · {ticket.user.phone}
              {ticket.booking ? <> · <Link href={`/admin/bookings/${ticket.booking.code}`} className="text-orange-700">{ticket.booking.code}</Link></> : null}
            </>
          }
          action={<Badge tone={ticket.status === "OPEN" ? "amber" : "green"}>{ticket.status === "OPEN" ? "Open" : "Closed"}</Badge>}
        />
        <TicketThread messages={ticket.messages} staffSide />
        {ticket.status === "OPEN" ? (
          <ActionForm action={staffReplyTicketAction} resetOnSuccess className="space-y-3 border-t border-slate-100 p-5">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <Textarea name="body" rows={3} placeholder="Reply to the customer (also sent by email)…" aria-label="Reply" />
            <Checkbox name="close" label="Close this request" />
            <SubmitButton pendingText="Sending…">Send</SubmitButton>
          </ActionForm>
        ) : (
          <ActionForm action={reopenTicketAction} className="border-t border-slate-100 p-5">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <SubmitButton variant="outline" size="sm" pendingText="…">Reopen</SubmitButton>
          </ActionForm>
        )}
      </Card>
    </div>
  );
}
