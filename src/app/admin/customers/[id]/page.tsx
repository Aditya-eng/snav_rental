import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { bookingMoney } from "@/lib/booking";
import { KYC_DOC_TYPES } from "@/lib/constants";
import { whatsappLink } from "@/lib/utils";
import { Alert, Card, CardHeader, Checkbox, Field, Input, PageHeader, Table, Textarea } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { BookingStatusBadge, KycBadge } from "@/components/status-badge";
import { reviewKycAction, updateCustomerFlagsAction } from "../../people-actions";

export default async function CustomerPage(props: PageProps<"/admin/customers/[id]">) {
  await requireStaff("customers");
  const { id } = await props.params;
  const user = await db.user.findUnique({
    where: { id },
    include: { kycDocs: { orderBy: { createdAt: "desc" } }, bookings: { orderBy: { createdAt: "desc" } } },
  });
  if (!user || user.role !== "CUSTOMER") notFound();
  const lifetime = user.bookings.filter((b) => !["CANCELLED", "PENDING_PAYMENT"].includes(b.status)).reduce((s, b) => s + b.taxableAmount, 0);
  const outstanding = user.bookings.filter((b) => b.status !== "CANCELLED").reduce((s, b) => s + Math.max(0, bookingMoney(b).due), 0);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <Link href="/admin/customers" className="text-sm text-slate-500 hover:text-slate-800">← Customers</Link>
        <PageHeader title={user.name} subtitle={user.accountType === "BUSINESS" ? `Business · ${user.companyName ?? ""}` : "Individual"} action={<KycBadge status={user.kycStatus} />} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs text-slate-500">Bookings</p><p className="text-xl font-bold">{user.bookings.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">Lifetime value (excl. GST)</p><p className="text-xl font-bold">{formatINR(lifetime)}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">Outstanding</p><p className={`text-xl font-bold ${outstanding ? "text-orange-700" : ""}`}>{formatINR(outstanding)}</p></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Contact" />
          <dl className="space-y-2 p-5 text-sm">
            <div><dt className="inline text-slate-500">Email: </dt><dd className="inline"><a href={`mailto:${user.email}`} className="text-orange-700">{user.email}</a></dd></div>
            <div><dt className="inline text-slate-500">Phone: </dt><dd className="inline">{user.phone} · <a href={whatsappLink(user.phone)} target="_blank" rel="noopener noreferrer" className="text-emerald-700">WhatsApp</a></dd></div>
            {user.gstin ? <div><dt className="inline text-slate-500">GSTIN: </dt><dd className="inline font-mono">{user.gstin}</dd></div> : null}
            <div><dt className="inline text-slate-500">Address: </dt><dd className="inline">{[user.addressLine, user.city, user.state, user.pincode].filter(Boolean).join(", ") || "—"}</dd></div>
            <div><dt className="inline text-slate-500">Joined: </dt><dd className="inline">{formatDate(user.createdAt)}</dd></div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Account controls" />
          <ActionForm action={updateCustomerFlagsAction} className="space-y-3 p-5">
            <input type="hidden" name="userId" value={user.id} />
            <Checkbox name="payLater" defaultChecked={user.payLater} label="Trusted account — may book without paying upfront (pay later)" />
            <Checkbox name="blocked" defaultChecked={user.blocked} label="Blocked — can't log in or place bookings" />
            <Field label="Internal notes">
              <Textarea name="adminNotes" defaultValue={user.adminNotes ?? ""} rows={2} className="min-h-0" />
            </Field>
            <SubmitButton variant="secondary" size="sm" pendingText="Saving…">Save</SubmitButton>
          </ActionForm>
        </Card>
      </div>

      <Card>
        <CardHeader title="KYC documents" action={<KycBadge status={user.kycStatus} />} />
        {user.kycDocs.length ? (
          <ul className="divide-y divide-slate-100">
            {user.kycDocs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <a href={`/api/files/kyc/${d.id}`} target="_blank" className="font-medium text-orange-700">{KYC_DOC_TYPES[d.docType] ?? d.docType}</a>
                <span className="text-slate-500">{d.fileName} · {formatDateTime(d.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-4 text-sm text-slate-500">No documents uploaded.</p>
        )}
        {user.kycStatus === "REJECTED" && user.kycNote ? <Alert tone="red" className="mx-5 mb-4">Rejected: {user.kycNote}</Alert> : null}
        {user.kycDocs.length ? (
          <ActionForm action={reviewKycAction} className="flex flex-wrap items-end gap-3 border-t border-slate-100 p-5">
            <input type="hidden" name="userId" value={user.id} />
            <SubmitButton name="decision" value="verify" pendingText="Saving…">Verify KYC</SubmitButton>
            <Field label="Rejection reason (emailed)" className="min-w-64 flex-1">
              <Input name="note" placeholder="e.g. PAN image is blurred" />
            </Field>
            <SubmitButton name="decision" value="reject" variant="outline" pendingText="Saving…">Reject</SubmitButton>
          </ActionForm>
        ) : null}
      </Card>

      <Card>
        <CardHeader title="Bookings" />
        {user.bookings.length ? (
          <Table>
            <tbody>
              {user.bookings.map((b) => (
                <tr key={b.id}>
                  <td><Link href={`/admin/bookings/${b.code}`} className="font-semibold text-orange-700">{b.code}</Link></td>
                  <td>{formatDate(b.startDate)} – {formatDate(b.endDate)}</td>
                  <td><BookingStatusBadge status={b.status} /></td>
                  <td className="text-right">{formatINR(b.taxableAmount + b.cgst + b.sgst + b.igst)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="px-5 py-4 text-sm text-slate-500">No bookings yet.</p>
        )}
      </Card>
    </div>
  );
}
