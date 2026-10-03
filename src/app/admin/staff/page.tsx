import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/constants";
import { Card, CardHeader, Checkbox, Field, Input, PageHeader, Select } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { saveStaffAction } from "../config-actions";

export const metadata = { title: "Staff" };

const ROLE_HELP: Record<string, string> = {
  ADMIN: "Everything, including settings, pricing, staff and reports.",
  OPERATIONS: "Bookings, dispatch/returns, calendar, products, fleet, customers/KYC, enquiries, support.",
  ACCOUNTS: "Bookings, payments & deposit refunds, customers, coupons, reports, enquiries.",
};

export default async function StaffPage() {
  const me = await requireStaff("staff");
  const staff = await db.user.findMany({ where: { role: { not: "CUSTOMER" } }, orderBy: { createdAt: "asc" } });
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Staff" />
      <Card>
        <CardHeader title="Roles" />
        <dl className="space-y-2 p-5 text-sm">
          {Object.entries(STAFF_ROLES).map(([k, v]) => (
            <div key={k}><dt className="inline font-semibold">{v}: </dt><dd className="inline text-slate-600">{ROLE_HELP[k]}</dd></div>
          ))}
        </dl>
      </Card>
      <Card>
        <CardHeader title="Team" />
        <div className="divide-y divide-slate-100">
          {staff.map((s) => (
            <ActionForm key={s.id} action={saveStaffAction} inlineMessage className="flex flex-wrap items-center gap-3 px-5 py-3">
              <input type="hidden" name="id" value={s.id} />
              <div className="min-w-48 flex-1">
                <p className="font-medium text-slate-900">{s.name}{s.id === me.id ? " (you)" : ""}</p>
                <p className="text-sm text-slate-500">{s.email}</p>
              </div>
              <Select name="role" defaultValue={s.role} className="w-44" aria-label={`Role for ${s.name}`}>
                {Object.entries(STAFF_ROLES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
              {s.id !== me.id ? <Checkbox name="disable" label="Remove access" /> : null}
              <SubmitButton size="sm" variant="outline" pendingText="…">Save</SubmitButton>
            </ActionForm>
          ))}
        </div>
      </Card>
      <Card>
        <CardHeader title="Add staff member" subtitle="If the email already has a customer account, it's promoted to staff." />
        <ActionForm action={saveStaffAction} resetOnSuccess className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Name">
            <Input name="name" required />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" required />
          </Field>
          <Field label="Mobile">
            <Input name="phone" type="tel" />
          </Field>
          <Field label="Role">
            <Select name="role" defaultValue="OPERATIONS">
              {Object.entries(STAFF_ROLES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>
          <Field label="Temporary password" hint="They can change it from their profile.">
            <Input name="password" type="text" minLength={8} required autoComplete="off" />
          </Field>
          <div className="flex items-end">
            <SubmitButton pendingText="Saving…">Add staff</SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
