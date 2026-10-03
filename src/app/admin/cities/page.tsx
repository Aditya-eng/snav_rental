import type { City } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { paiseToRupees } from "@/lib/money";
import { INDIAN_STATES } from "@/lib/constants";
import { Card, CardHeader, Checkbox, Field, Input, PageHeader, Select } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { saveCityAction } from "../config-actions";

export const metadata = { title: "Cities & delivery" };

function CityForm({ c }: { c?: City }) {
  return (
    <ActionForm action={saveCityAction} inlineMessage={!!c} className="grid items-end gap-3 px-5 py-4 md:grid-cols-[1.2fr_1.2fr_110px_2fr_auto]">
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      <Field label="City">
        <Input name="name" defaultValue={c?.name} required />
      </Field>
      <Field label="State">
        <Select name="state" defaultValue={c?.state ?? ""} required>
          <option value="">Select</option>
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </Field>
      <Field label="Delivery ₹">
        <Input name="deliveryFee" inputMode="decimal" defaultValue={paiseToRupees(c?.deliveryFee ?? 0)} />
      </Field>
      <Field label="Pickup office address">
        <Input name="officeAddress" defaultValue={c?.officeAddress ?? ""} placeholder="Leave blank if no office" />
      </Field>
      <div className="flex flex-wrap items-center gap-3 pb-1">
        <Checkbox name="pickupAvailable" defaultChecked={c?.pickupAvailable ?? false} label="Pickup" />
        <Checkbox name="active" defaultChecked={c?.active ?? true} label="Active" />
        <input type="hidden" name="sortOrder" value={c?.sortOrder ?? 99} />
        <SubmitButton size="sm" variant={c ? "outline" : "primary"} pendingText="…">{c ? "Save" : "Add city"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export default async function CitiesAdmin() {
  await requireStaff("cities");
  const cities = await db.city.findMany({ orderBy: [{ active: "desc" }, { sortOrder: "asc" }] });
  return (
    <div className="space-y-6">
      <PageHeader title="Cities & delivery" subtitle="Delivery fee is charged once per booking (delivery + collection). Pickup needs an office address." />
      <Card>
        <CardHeader title="Add a city" />
        <CityForm />
      </Card>
      <Card>
        <CardHeader title={`${cities.length} cities`} />
        <div className="divide-y divide-slate-100">
          {cities.map((c) => (
            <CityForm key={c.id} c={c} />
          ))}
        </div>
      </Card>
    </div>
  );
}
