import type { Metadata } from "next";
import { getSettings, grievanceContact } from "@/lib/settings";
import { Container } from "@/components/ui";

export const metadata: Metadata = { title: "Cancellation & Refund Policy" };

export default async function RefundPolicyPage() {
  const s = await getSettings();
  const g = grievanceContact(s);
  return (
    <Container className="max-w-3xl py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Cancellation &amp; refund policy</h1>
      <p className="mt-2 text-sm text-slate-500">This policy is part of the rental agreement you accept at checkout.</p>
      <div className="mt-8 whitespace-pre-line rounded-xl border border-slate-200 bg-white p-6 leading-7 text-slate-700">{s.refundPolicy}</div>
      <p className="mt-6 text-sm text-slate-600">
        To cancel or ask about a refund, write to{" "}
        <a className="font-medium text-orange-700" href={`mailto:${s.email}`}>{s.email}</a>
        {s.phone ? ` or call ${s.phone}` : ""}. Unresolved complaints can be escalated to our Grievance Officer ({g.name}) at{" "}
        <a className="font-medium text-orange-700" href={`mailto:${g.email}`}>{g.email}</a>.
      </p>
    </Container>
  );
}
