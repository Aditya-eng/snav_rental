import type { Coupon } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { paiseToRupees } from "@/lib/money";
import { toDateInput } from "@/lib/dates";
import { Card, CardHeader, Checkbox, Field, Input, PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { saveCouponAction } from "../config-actions";

export const metadata = { title: "Coupons" };

function CouponForm({ c }: { c?: Coupon }) {
  return (
    <ActionForm action={saveCouponAction} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      <Field label="Code">
        <Input name="code" defaultValue={c?.code} required className="uppercase" />
      </Field>
      <Field label="% off">
        <Input name="percentOff" type="number" min={0} max={100} defaultValue={c?.percentOff ?? ""} />
      </Field>
      <Field label="or flat ₹ off">
        <Input name="flatOff" inputMode="decimal" defaultValue={paiseToRupees(c?.flatOff ?? 0) === "0" ? "" : paiseToRupees(c?.flatOff ?? 0)} />
      </Field>
      <Field label="Minimum order ₹">
        <Input name="minOrder" inputMode="decimal" defaultValue={paiseToRupees(c?.minOrder ?? 0)} />
      </Field>
      <Field label="Max uses (blank = unlimited)">
        <Input name="maxUses" type="number" min={0} defaultValue={c?.maxUses ?? ""} />
      </Field>
      <Field label="Valid from">
        <Input name="validFrom" type="date" defaultValue={c?.validFrom ? toDateInput(c.validFrom) : ""} />
      </Field>
      <Field label="Valid to">
        <Input name="validTo" type="date" defaultValue={c?.validTo ? toDateInput(c.validTo) : ""} />
      </Field>
      <Field label="Internal description">
        <Input name="description" defaultValue={c?.description ?? ""} />
      </Field>
      <div className="flex items-center gap-4 lg:col-span-4">
        <Checkbox name="active" defaultChecked={c?.active ?? true} label="Active" />
        {c ? <span className="text-sm text-slate-500">Used {c.used} time{c.used === 1 ? "" : "s"}</span> : null}
        <SubmitButton pendingText="Saving…">{c ? "Save" : "Create coupon"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export default async function CouponsPage() {
  await requireStaff("coupons");
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title="Coupons" subtitle="Discounts apply to rental and service charges (not delivery or deposits)." />
      <Card>
        <CardHeader title="New coupon" />
        <CouponForm />
      </Card>
      {coupons.map((c) => (
        <Card key={c.id}>
          <CardHeader title={c.code} subtitle={c.description ?? undefined} />
          <CouponForm c={c} />
        </Card>
      ))}
    </div>
  );
}
