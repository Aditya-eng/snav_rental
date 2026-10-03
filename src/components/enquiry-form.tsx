import { submitEnquiry } from "@/app/(site)/actions";
import { ActionForm, SubmitButton } from "./forms";
import { Field, Input, Select, Textarea } from "./ui";

export function EnquiryForm({
  kind,
  products,
  productSlug,
  defaults,
}: {
  kind: "RENTAL_QUOTE" | "PURCHASE" | "GENERAL";
  products: { slug: string; name: string }[];
  productSlug?: string;
  defaults?: { name?: string; email?: string; phone?: string; company?: string | null };
}) {
  return (
    <ActionForm action={submitEnquiry} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
      <Field label="I'm interested in" className="sm:col-span-2">
        <Select name="kind" defaultValue={kind}>
          <option value="RENTAL_QUOTE">Bulk or long-term rental quote</option>
          <option value="PURCHASE">Buying equipment</option>
          <option value="GENERAL">Something else</option>
        </Select>
      </Field>
      <Field label="Your name">
        <Input name="name" defaultValue={defaults?.name} autoComplete="name" required />
      </Field>
      <Field label="Company (optional)">
        <Input name="company" defaultValue={defaults?.company ?? ""} autoComplete="organization" />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" defaultValue={defaults?.email} autoComplete="email" required />
      </Field>
      <Field label="Mobile">
        <Input name="phone" type="tel" defaultValue={defaults?.phone} autoComplete="tel" required />
      </Field>
      <Field label="Instrument">
        <Select name="product" defaultValue={productSlug ?? ""}>
          <option value="">Not sure / multiple</option>
          {products.map((p) => (
            <option key={p.slug} value={p.slug}>{p.name}</option>
          ))}
        </Select>
      </Field>
      <Field label="Quantity">
        <Input name="quantity" type="number" min={1} max={1000} defaultValue={1} />
      </Field>
      {kind !== "PURCHASE" ? (
        <>
          <Field label="Project city">
            <Input name="city" />
          </Field>
          <Field label="Rental duration" hint="e.g. 3 months">
            <Input name="duration" />
          </Field>
          <Field label="Approx. start date">
            <Input name="startDate" type="date" />
          </Field>
        </>
      ) : (
        <Field label="Delivery city">
          <Input name="city" />
        </Field>
      )}
      <Field label="Details" className="sm:col-span-2">
        <Textarea name="message" rows={4} placeholder="Tell us about the project, accuracy needs, base/rover setup…" />
      </Field>
      <div className="sm:col-span-2">
        <SubmitButton size="lg" pendingText="Sending…">Send enquiry</SubmitButton>
      </div>
    </ActionForm>
  );
}
