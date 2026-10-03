import type { Category, Product } from "@prisma/client";
import { paiseToRupees } from "@/lib/money";
import { parseJson, specsToText, type Spec } from "@/lib/utils";
import { Card, CardHeader, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { ProductImage } from "@/components/product-image";
import { saveProductAction } from "./actions";

export function ProductForm({ product, categories }: { product?: Product; categories: Category[] }) {
  const p = product;
  return (
    <ActionForm action={saveProductAction} className="space-y-6">
      {p ? <input type="hidden" name="id" value={p.id} /> : null}
      <Card>
        <CardHeader title="Details" />
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <Field label="Name">
            <Input name="name" defaultValue={p?.name} required />
          </Field>
          <Field label="URL slug" hint="Leave blank to generate from the name.">
            <Input name="slug" defaultValue={p?.slug} />
          </Field>
          <Field label="Brand">
            <Input name="brand" defaultValue={p?.brand ?? "eSurvey"} />
          </Field>
          <Field label="Category">
            <Select name="categoryId" defaultValue={p?.categoryId} required>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tagline" className="md:col-span-2">
            <Input name="tagline" defaultValue={p?.tagline ?? ""} />
          </Field>
          <Field label="Description" className="md:col-span-2">
            <Textarea name="description" defaultValue={p?.description} rows={4} />
          </Field>
          <Field label="Specifications" hint='One per line as "Label: Value".' className="md:col-span-2">
            <Textarea name="specs" defaultValue={p ? specsToText(parseJson<Spec[]>(p.specs, [])) : ""} rows={7} className="font-mono text-xs" />
          </Field>
          <Field label="Highlights" hint="One per line." className="md:col-span-2">
            <Textarea name="features" defaultValue={p ? parseJson<string[]>(p.features, []).join("\n") : ""} rows={4} />
          </Field>
          <Field label="Feature tags" hint="Comma separated — used for catalog filters (e.g. IMU tilt, AR stakeout, 4G).">
            <Input name="tags" defaultValue={p?.tags ?? ""} />
          </Field>
          <Field label="Datasheet URL (optional)">
            <Input name="datasheetUrl" type="url" defaultValue={p?.datasheetUrl ?? ""} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Photo" />
        <div className="flex flex-wrap items-center gap-6 p-5">
          <ProductImage src={p?.imageUrl} name={p?.name ?? "Product"} className="size-32 rounded-lg border border-slate-200" />
          <div className="space-y-3">
            <Field label="Upload new photo" hint="JPG/PNG/WEBP, ideally on a white background.">
              <Input type="file" name="image" accept="image/jpeg,image/png,image/webp" className="py-1.5" />
            </Field>
            {p?.imageUrl ? <Checkbox name="removeImage" label="Remove current photo" /> : null}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Rental pricing" subtitle="In rupees, excluding GST. The cheapest combination is applied automatically." />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Per day (₹)">
            <Input name="dailyRate" inputMode="decimal" defaultValue={paiseToRupees(p?.dailyRate ?? 0)} />
          </Field>
          <Field label="Per week (₹)">
            <Input name="weeklyRate" inputMode="decimal" defaultValue={paiseToRupees(p?.weeklyRate ?? 0)} />
          </Field>
          <Field label="Per month (₹)">
            <Input name="monthlyRate" inputMode="decimal" defaultValue={paiseToRupees(p?.monthlyRate ?? 0)} />
          </Field>
          <Field label="Refundable deposit (₹)">
            <Input name="deposit" inputMode="decimal" defaultValue={paiseToRupees(p?.deposit ?? 0)} />
          </Field>
          <Checkbox name="rentable" defaultChecked={p?.rentable ?? true} label="Available for rent" />
        </div>
      </Card>

      <Card>
        <CardHeader title="Sale & visibility" />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Sale price (₹, excl. GST)" hint="Leave blank to show “Price on request”.">
            <Input name="salePrice" inputMode="decimal" defaultValue={paiseToRupees(p?.salePrice)} />
          </Field>
          <Field label="Sort order">
            <Input name="sortOrder" type="number" defaultValue={p?.sortOrder ?? 0} />
          </Field>
          <div className="space-y-2 sm:col-span-2">
            <Checkbox name="forSale" defaultChecked={p?.forSale ?? true} label="Available to buy" />
            <Checkbox name="featured" defaultChecked={p?.featured ?? false} label="Feature on home page" />
            <Checkbox name="active" defaultChecked={p?.active ?? true} label="Visible on website" />
          </div>
        </div>
      </Card>

      <SubmitButton size="lg" pendingText="Saving…">{p ? "Save product" : "Create product"}</SubmitButton>
    </ActionForm>
  );
}
