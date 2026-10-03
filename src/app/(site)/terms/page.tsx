import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { Container } from "@/components/ui";

export const metadata: Metadata = { title: "Rental Terms" };

export default async function TermsPage() {
  const s = await getSettings();
  return (
    <Container className="max-w-3xl py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Rental terms</h1>
      <p className="mt-2 text-sm text-slate-500">These terms form the rental agreement you accept at checkout.</p>
      <div className="mt-8 whitespace-pre-line rounded-xl border border-slate-200 bg-white p-6 leading-7 text-slate-700">{s.rentalTerms}</div>
    </Container>
  );
}
