import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Badge, Card, CardHeader, Textarea } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { TicketThread } from "@/components/ticket-thread";
import { replyTicket } from "../../actions";

export default async function TicketPage(props: PageProps<"/account/tickets/[id]">) {
  const { id } = await props.params;
  const user = await requireUser("/account/tickets");
  const ticket = await db.ticket.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } }, booking: { select: { code: true } } },
  });
  if (!ticket || ticket.userId !== user.id) notFound();

  return (
    <div className="space-y-4">
      <Link href="/account/tickets" className="text-sm text-slate-500 hover:text-slate-800">← All requests</Link>
      <Card>
        <CardHeader
          title={ticket.subject}
          subtitle={ticket.booking ? <Link className="text-orange-700" href={`/account/bookings/${ticket.booking.code}`}>{ticket.booking.code}</Link> : undefined}
          action={<Badge tone={ticket.status === "OPEN" ? "amber" : "green"}>{ticket.status === "OPEN" ? "Open" : "Closed"}</Badge>}
        />
        <TicketThread messages={ticket.messages} staffSide={false} />
        <ActionForm action={replyTicket} resetOnSuccess className="space-y-3 border-t border-slate-100 p-5">
          <input type="hidden" name="ticketId" value={ticket.id} />
          <Textarea name="body" rows={3} placeholder="Write a reply…" required aria-label="Reply" />
          <SubmitButton pendingText="Sending…">Send reply</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
