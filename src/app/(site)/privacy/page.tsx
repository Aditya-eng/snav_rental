import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { Container } from "@/components/ui";

export const metadata: Metadata = { title: "Privacy Policy" };

export default async function PrivacyPage() {
  const s = await getSettings();
  return (
    <Container className="max-w-3xl py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Privacy policy</h1>
      <div className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-white p-6 leading-7 text-slate-700">
        <p>{s.legalName} (&quot;we&quot;) collects the information you give us — name, contact details, billing and site addresses, and KYC documents — to process rentals, verify identity, issue GST invoices and contact you about your bookings.</p>
        <p>KYC documents are stored privately and are only accessible to our staff. Payment card and UPI details are handled by our payment provider (Razorpay); we never see or store them.</p>
        <p>We don&apos;t sell your data. We share it only with service providers needed to run the rental (payments, email, delivery) or when required by law.</p>
        <p>You can ask us to correct or delete your information by writing to <a className="font-medium text-orange-700" href={`mailto:${s.email}`}>{s.email}</a>. Records we must keep for tax purposes (such as invoices) are retained for the period required by law.</p>
      </div>
    </Container>
  );
}
