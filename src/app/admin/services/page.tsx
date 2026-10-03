import type { Service } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { paiseToRupees } from "@/lib/money";
import { Card, CardHeader, Checkbox, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { saveServiceAction } from "../config-actions";

export const metadata = { title: "Services" };

function ServiceForm({ s }: { s?: Service }) {
  return (
    <ActionForm action={saveServiceAction} className="grid gap-4 p-5 md:grid-cols-4">
      {s ? <input type="hidden" name="id" value={s.id} /> : null}
      <Field label="Name" className="md:col-span-2">
        <Input name="name" defaultValue={s?.name} required />
      </Field>
      <Field label="Rate per person per day (₹)">
        <Input name="dailyRate" inputMode="decimal" defaultValue={paiseToRupees(s?.dailyRate ?? 0)} required />
      </Field>
      <Field label="SAC code" hint="Check with your CA.">
        <Input name="sacCode" defaultValue={s?.sacCode ?? ""} />
      </Field>
      <Field label="Description" className="md:col-span-4">
        <Textarea name="description" defaultValue={s?.description} rows={2} className="min-h-0" />
      </Field>
      <Field label="Sort order">
        <Input name="sortOrder" type="number" defaultValue={s?.sortOrder ?? 0} />
      </Field>
      <div className="flex items-end gap-4 md:col-span-3">
        <Checkbox name="active" defaultChecked={s?.active ?? true} label="Offered on the website" />
        <SubmitButton pendingText="Saving…">{s ? "Save" : "Add service"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export default async function ServicesAdmin() {
  await requireStaff("services");
  const services = await db.service.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title="Services" subtitle="Per-day add-ons customers can book with equipment." />
      {services.map((s) => (
        <Card key={s.id}>
          <CardHeader title={s.name} />
          <ServiceForm s={s} />
        </Card>
      ))}
      <Card>
        <CardHeader title="Add a service" />
        <ServiceForm />
      </Card>
    </div>
  );
}
