import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { KYC_DOC_TYPES } from "@/lib/constants";
import { Alert, Card, CardHeader, Field, Input, Select } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { KycBadge } from "@/components/status-badge";
import { deleteKycDoc, uploadKyc } from "../actions";

export default async function KycPage() {
  const user = await requireUser("/account/kyc");
  const docs = await db.kycDocument.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  const business = user.accountType === "BUSINESS";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="KYC documents" subtitle="Verified once, used for every rental." action={<KycBadge status={user.kycStatus} />} />
        <div className="space-y-4 p-5">
          {user.kycStatus === "REJECTED" && user.kycNote ? <Alert tone="red">Reason: {user.kycNote}</Alert> : null}
          <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">What to upload</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {business ? (
                <>
                  <li>GST registration certificate</li>
                  <li>Company PAN card</li>
                  <li>ID of the person collecting the equipment</li>
                </>
              ) : (
                <>
                  <li>PAN card</li>
                  <li>Aadhaar card (you may mask the first 8 digits)</li>
                </>
              )}
            </ul>
            <p className="mt-2 text-xs text-slate-500">JPG, PNG, WEBP or PDF, up to 4 MB each. Documents are stored privately and only our team can view them.</p>
          </div>
          {user.kycStatus !== "VERIFIED" ? (
            <ActionForm action={uploadKyc} resetOnSuccess className="grid gap-3 sm:grid-cols-[200px_1fr_auto] sm:items-end">
              <Field label="Document type">
                <Select name="docType" required defaultValue={business ? "GST" : "PAN"}>
                  {Object.entries(KYC_DOC_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
              </Field>
              <Field label="File">
                <Input type="file" name="file" accept="image/jpeg,image/png,image/webp,application/pdf" required className="py-1.5" />
              </Field>
              <SubmitButton pendingText="Uploading…">Upload</SubmitButton>
            </ActionForm>
          ) : (
            <Alert tone="green">Your KYC is verified. Contact us if your details change.</Alert>
          )}
        </div>
      </Card>

      {docs.length ? (
        <Card>
          <CardHeader title="Uploaded" />
          <ul className="divide-y divide-slate-100">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <a href={`/api/files/kyc/${d.id}`} target="_blank" className="font-medium text-orange-700 hover:text-orange-800">
                    {KYC_DOC_TYPES[d.docType] ?? d.docType}
                  </a>
                  <p className="text-xs text-slate-500">{d.fileName} · {formatDateTime(d.createdAt)}</p>
                </div>
                {user.kycStatus !== "VERIFIED" ? (
                  <ActionForm action={deleteKycDoc} confirm="Remove this document?">
                    <input type="hidden" name="id" value={d.id} />
                    <SubmitButton variant="ghost" size="sm" pendingText="Removing…">Remove</SubmitButton>
                  </ActionForm>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
