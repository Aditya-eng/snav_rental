import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { razorpayEnabled } from "@/lib/razorpay";
import { INDIAN_STATES } from "@/lib/constants";
import { Badge, Card, CardHeader, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { saveSettingsAction } from "../config-actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireStaff("settings");
  const s = await getSettings();
  const integrations = [
    ["Online payments (Razorpay)", razorpayEnabled()],
    ["Email (Resend)", !!process.env.RESEND_API_KEY],
    ["File storage (Vercel Blob)", !!process.env.BLOB_READ_WRITE_TOKEN],
    ["Daily reminders (cron)", !!process.env.CRON_SECRET],
  ] as const;

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Settings" />
      <Card>
        <CardHeader title="Integrations" subtitle="Configured with environment variables on the server (see README)." />
        <ul className="grid gap-2 p-5 text-sm sm:grid-cols-2">
          {integrations.map(([label, on]) => (
            <li key={label} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
              {label} <Badge tone={on ? "green" : "slate"}>{on ? "Connected" : "Not set"}</Badge>
            </li>
          ))}
        </ul>
      </Card>

      <ActionForm action={saveSettingsAction} className="space-y-6">
        <Card>
          <CardHeader title="Company (shown on invoices and the website)" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Brand name"><Input name="companyName" defaultValue={s.companyName} /></Field>
            <Field label="Legal name"><Input name="legalName" defaultValue={s.legalName} /></Field>
            <Field label="Tagline" className="sm:col-span-2"><Input name="tagline" defaultValue={s.tagline} /></Field>
            <Field label="Registered address" className="sm:col-span-2"><Textarea name="address" defaultValue={s.address} rows={2} className="min-h-0" /></Field>
            <Field label="State (decides CGST+SGST vs IGST)">
              <Select name="state" defaultValue={s.state}>
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </Select>
            </Field>
            <Field label="GSTIN"><Input name="gstin" defaultValue={s.gstin} className="uppercase" maxLength={15} /></Field>
            <Field label="PAN"><Input name="pan" defaultValue={s.pan} className="uppercase" maxLength={10} /></Field>
            <Field label="Phone"><Input name="phone" defaultValue={s.phone} /></Field>
            <Field label="WhatsApp number" hint="Shown as the chat button. Defaults to phone."><Input name="whatsapp" defaultValue={s.whatsapp} /></Field>
            <Field label="Public email"><Input name="email" type="email" defaultValue={s.email} /></Field>
            <Field label="Admin alert email" hint="New bookings, enquiries and KYC uploads go here."><Input name="adminEmail" type="email" defaultValue={s.adminEmail} /></Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Grievance officer"
            subtitle="Required by the DPDP Act and E-Commerce Rules. Shown in the footer, on Contact and in the Privacy policy. Blank fields fall back to the public email/phone."
          />
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <Field label="Name and designation"><Input name="grievanceName" defaultValue={s.grievanceName} placeholder="e.g. A. Garg, Director" /></Field>
            <Field label="Email"><Input name="grievanceEmail" type="email" defaultValue={s.grievanceEmail} /></Field>
            <Field label="Phone"><Input name="grievancePhone" defaultValue={s.grievancePhone} /></Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Billing & rental rules" />
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <Field label="GST rate %"><Input name="gstRate" inputMode="decimal" defaultValue={s.gstRate} /></Field>
            <Field label="Rental SAC code" hint="Verify with your CA."><Input name="rentalSac" defaultValue={s.rentalSac} /></Field>
            <Field label="Invoice prefix"><Input name="invoicePrefix" defaultValue={s.invoicePrefix} /></Field>
            <Field label="Advance payment %" hint="Of rent + GST; the deposit is always collected in full."><Input name="advancePercent" inputMode="decimal" defaultValue={s.advancePercent} /></Field>
            <Field label="Late fee multiplier" hint="× daily rate per late day (suggested on return)."><Input name="lateFeeMultiplier" inputMode="decimal" defaultValue={s.lateFeeMultiplier} /></Field>
            <Field label="Minimum notice (days)" hint="Earliest start date = today + this."><Input name="minLeadDays" type="number" min={0} defaultValue={s.minLeadDays} /></Field>
            <Field label="Bank / UPI details for offline payment" className="sm:col-span-3">
              <Textarea name="bankDetails" defaultValue={s.bankDetails} rows={3} placeholder={"Account name, number, IFSC\nUPI ID"} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Rental terms" subtitle="Shown at checkout, on /terms and in every rental agreement. Have a lawyer review these." />
          <div className="p-5">
            <Textarea name="rentalTerms" defaultValue={s.rentalTerms} rows={14} aria-label="Rental terms" />
          </div>
        </Card>

        <Card>
          <CardHeader title="Cancellation & refund policy" subtitle="Shown on /refund-policy and linked at checkout." />
          <div className="p-5">
            <Textarea name="refundPolicy" defaultValue={s.refundPolicy} rows={12} aria-label="Cancellation and refund policy" />
          </div>
        </Card>

        <SubmitButton size="lg" pendingText="Saving…">Save settings</SubmitButton>
      </ActionForm>
    </div>
  );
}
