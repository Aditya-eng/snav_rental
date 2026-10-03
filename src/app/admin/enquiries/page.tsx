import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/dates";
import { ENQUIRY_KIND } from "@/lib/constants";
import { cn, whatsappLink } from "@/lib/utils";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { setEnquiryStatusAction } from "../people-actions";

export const metadata = { title: "Enquiries" };

export default async function EnquiriesPage(props: PageProps<"/admin/enquiries">) {
  await requireStaff("enquiries");
  const sp = await props.searchParams;
  const status = typeof sp.status === "string" ? sp.status : "OPEN";
  const enquiries = await db.enquiry.findMany({
    where: status === "OPEN" ? { status: { in: ["NEW", "CONTACTED"] } } : status === "ALL" ? {} : { status },
    include: { product: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader title="Enquiries" subtitle="Quote requests, purchase enquiries and contact form messages." />
      <div className="mb-4 flex gap-1">
        {[["OPEN", "Open"], ["NEW", "New"], ["CLOSED", "Closed"], ["ALL", "All"]].map(([key, label]) => (
          <Link key={key} href={`/admin/enquiries?status=${key}`} className={cn("rounded-md px-3 py-1.5 text-sm font-medium", status === key ? "bg-navy-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200")}>
            {label}
          </Link>
        ))}
      </div>
      {enquiries.length === 0 ? (
        <EmptyState title="No enquiries here" />
      ) : (
        <div className="space-y-3">
          {enquiries.map((e) => (
            <Card key={e.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{e.name}</p>
                    <Badge tone={e.kind === "PURCHASE" ? "violet" : e.kind === "RENTAL_QUOTE" ? "blue" : "slate"}>{ENQUIRY_KIND[e.kind]}</Badge>
                    <Badge tone={e.status === "NEW" ? "amber" : e.status === "CONTACTED" ? "blue" : "green"}>{e.status.toLowerCase()}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {e.company ? `${e.company} · ` : ""}
                    <a href={`mailto:${e.email}`} className="text-orange-700">{e.email}</a> ·{" "}
                    <a href={whatsappLink(e.phone)} target="_blank" rel="noopener noreferrer" className="text-emerald-700">{e.phone}</a>
                  </p>
                </div>
                <p className="text-sm text-slate-500">{formatDateTime(e.createdAt)}</p>
              </div>
              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                {e.product ? <div><dt className="inline text-slate-500">Instrument: </dt><dd className="inline">{e.product.name}</dd></div> : null}
                {e.quantity ? <div><dt className="inline text-slate-500">Qty: </dt><dd className="inline">{e.quantity}</dd></div> : null}
                {e.city ? <div><dt className="inline text-slate-500">City: </dt><dd className="inline">{e.city}</dd></div> : null}
                {e.duration ? <div><dt className="inline text-slate-500">Duration: </dt><dd className="inline">{e.duration}</dd></div> : null}
                {e.startDate ? <div><dt className="inline text-slate-500">Start: </dt><dd className="inline">{formatDate(e.startDate)}</dd></div> : null}
              </dl>
              {e.message ? <p className="mt-2 whitespace-pre-line text-sm text-slate-800">{e.message}</p> : null}
              <ActionForm action={setEnquiryStatusAction} inlineMessage className="mt-3 flex items-center gap-2">
                <input type="hidden" name="id" value={e.id} />
                {e.status !== "CONTACTED" ? <SubmitButton name="status" value="CONTACTED" size="sm" variant="outline" pendingText="…">Mark contacted</SubmitButton> : null}
                {e.status !== "CLOSED" ? <SubmitButton name="status" value="CLOSED" size="sm" variant="outline" pendingText="…">Close</SubmitButton> : null}
                {e.status === "CLOSED" ? <SubmitButton name="status" value="NEW" size="sm" variant="ghost" pendingText="…">Reopen</SubmitButton> : null}
              </ActionForm>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
