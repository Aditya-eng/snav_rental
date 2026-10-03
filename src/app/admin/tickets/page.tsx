import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Support" };

export default async function AdminTicketsPage(props: PageProps<"/admin/tickets">) {
  await requireStaff("tickets");
  const sp = await props.searchParams;
  const status = sp.status === "CLOSED" ? "CLOSED" : "OPEN";
  const tickets = await db.ticket.findMany({
    where: { status },
    include: { user: true, booking: { select: { code: true } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div>
      <PageHeader title="Support requests" />
      <div className="mb-4 flex gap-1">
        {(["OPEN", "CLOSED"] as const).map((s) => (
          <Link key={s} href={`/admin/tickets?status=${s}`} className={cn("rounded-md px-3 py-1.5 text-sm font-medium", status === s ? "bg-navy-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200")}>
            {s === "OPEN" ? "Open" : "Closed"}
          </Link>
        ))}
      </div>
      {tickets.length === 0 ? (
        <EmptyState title="Nothing here" />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {tickets.map((t) => {
              const last = t.messages[0];
              return (
                <li key={t.id}>
                  <Link href={`/admin/tickets/${t.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                    <span>
                      <span className="font-semibold text-slate-900">{t.subject}</span>
                      <span className="block text-sm text-slate-500">{t.user.name}{t.booking ? ` · ${t.booking.code}` : ""}</span>
                    </span>
                    <span className="flex items-center gap-3 text-sm text-slate-500">
                      {last && !last.fromStaff && t.status === "OPEN" ? <Badge tone="amber">Awaiting reply</Badge> : null}
                      {formatDateTime(t.updatedAt)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
