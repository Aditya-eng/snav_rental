import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Container } from "@/components/ui";

export const metadata: Metadata = { title: "Frequently Asked Questions" };

export default async function FaqPage() {
  const faqs = await db.faq.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
  return (
    <Container className="max-w-3xl py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Frequently asked questions</h1>
      <div className="mt-8 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {faqs.map((f) => (
          <details key={f.id} className="group px-5 py-4">
            <summary className="cursor-pointer list-none font-medium text-slate-900">
              <span className="flex items-center justify-between gap-4">
                {f.question}
                <span className="text-orange-600 transition group-open:rotate-45" aria-hidden>+</span>
              </span>
            </summary>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{f.answer}</p>
          </details>
        ))}
      </div>
    </Container>
  );
}
