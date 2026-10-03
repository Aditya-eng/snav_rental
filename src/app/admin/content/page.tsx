import type { Faq, Testimonial } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { Card, CardHeader, Checkbox, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { saveFaqAction, saveTestimonialAction } from "../config-actions";

export const metadata = { title: "FAQ & testimonials" };

function FaqForm({ f }: { f?: Faq }) {
  return (
    <ActionForm action={saveFaqAction} className="grid gap-3 p-5 md:grid-cols-[1fr_90px]">
      {f ? <input type="hidden" name="id" value={f.id} /> : null}
      <Field label="Question">
        <Input name="question" defaultValue={f?.question} required />
      </Field>
      <Field label="Order">
        <Input name="sortOrder" type="number" defaultValue={f?.sortOrder ?? 99} />
      </Field>
      <Field label="Answer" className="md:col-span-2">
        <Textarea name="answer" defaultValue={f?.answer} rows={2} className="min-h-0" required />
      </Field>
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <Checkbox name="active" defaultChecked={f?.active ?? true} label="Show" />
        <SubmitButton size="sm" pendingText="…">{f ? "Save" : "Add FAQ"}</SubmitButton>
        {f ? <SubmitButton name="delete" value="1" size="sm" variant="ghost" pendingText="…">Delete</SubmitButton> : null}
      </div>
    </ActionForm>
  );
}

function TestimonialForm({ t }: { t?: Testimonial }) {
  return (
    <ActionForm action={saveTestimonialAction} className="grid gap-3 p-5 md:grid-cols-4">
      {t ? <input type="hidden" name="id" value={t.id} /> : null}
      <Field label="Customer name">
        <Input name="name" defaultValue={t?.name} required />
      </Field>
      <Field label="Company / role">
        <Input name="company" defaultValue={t?.company ?? ""} />
      </Field>
      <Field label="Rating (1–5)">
        <Input name="rating" type="number" min={1} max={5} defaultValue={t?.rating ?? 5} />
      </Field>
      <Field label="Order">
        <Input name="sortOrder" type="number" defaultValue={t?.sortOrder ?? 0} />
      </Field>
      <Field label="What they said" className="md:col-span-4">
        <Textarea name="quote" defaultValue={t?.quote} rows={2} className="min-h-0" required />
      </Field>
      <div className="flex flex-wrap items-center gap-3 md:col-span-4">
        <Checkbox name="active" defaultChecked={t?.active ?? true} label="Show on home page" />
        <SubmitButton size="sm" pendingText="…">{t ? "Save" : "Add testimonial"}</SubmitButton>
        {t ? <SubmitButton name="delete" value="1" size="sm" variant="ghost" pendingText="…">Delete</SubmitButton> : null}
      </div>
    </ActionForm>
  );
}

export default async function ContentPage() {
  await requireStaff("content");
  const [faqs, testimonials] = await Promise.all([
    db.faq.findMany({ orderBy: { sortOrder: "asc" } }),
    db.testimonial.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader title="FAQ & testimonials" />
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Testimonials</h2>
        <p className="text-sm text-slate-600">Only add real customer feedback you have permission to publish.</p>
        <Card>
          <CardHeader title="Add testimonial" />
          <TestimonialForm />
        </Card>
        {testimonials.map((t) => (
          <Card key={t.id}>
            <TestimonialForm t={t} />
          </Card>
        ))}
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
        <Card>
          <CardHeader title="Add question" />
          <FaqForm />
        </Card>
        <Card>
          <div className="divide-y divide-slate-100">
            {faqs.map((f) => (
              <FaqForm key={f.id} f={f} />
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
