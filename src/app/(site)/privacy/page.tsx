import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getSettings, grievanceContact } from "@/lib/settings";
import { Container } from "@/components/ui";

export const metadata: Metadata = { title: "Privacy Policy" };

const UPDATED = "5 October 2026";

export default async function PrivacyPage() {
  const s = await getSettings();
  const g = grievanceContact(s);
  const mail = (email: string) => <a className="font-medium text-orange-700" href={`mailto:${email}`}>{email}</a>;
  return (
    <Container className="max-w-3xl py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Privacy policy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated {UPDATED}</p>
      <div className="mt-8 space-y-6 rounded-xl border border-slate-200 bg-white p-6 leading-7 text-slate-700">
        <Section title="Who we are">
          <p>
            This website is run by {s.legalName}
            {s.address ? `, ${s.address}` : ""}
            {s.gstin ? ` (GSTIN ${s.gstin})` : ""}. We are the Data Fiduciary for the personal data described here, under the Digital
            Personal Data Protection Act, 2023 (&quot;DPDP Act&quot;).
          </p>
        </Section>

        <Section title="What we collect">
          <ul className="list-disc space-y-1 pl-5">
            <li><b>Account details:</b> name, email, mobile number, password (stored only as a secure hash), and for businesses the company name and GSTIN.</li>
            <li><b>Booking details:</b> billing and site addresses, rental dates, equipment, payments and invoices.</li>
            <li><b>KYC documents:</b> identity and address proof you upload (for example Aadhaar, PAN, driving licence or company documents).</li>
            <li><b>Messages:</b> enquiries, support tickets and anything you send us by email or WhatsApp.</li>
            <li><b>Technical data:</b> the IP address recorded when you sign a rental agreement, and standard server logs used for security.</li>
          </ul>
          <p>We do not receive your card, UPI or bank login details. Online payments are handled directly by our payment provider (Razorpay).</p>
        </Section>

        <Section title="Why we use it">
          <ul className="list-disc space-y-1 pl-5">
            <li>To create your account, process rentals and purchases, deliver and collect equipment, and refund deposits.</li>
            <li>To verify your identity before dispatching high-value equipment and to protect against fraud, loss and theft.</li>
            <li>To issue GST invoices and keep the accounting records required by law.</li>
            <li>To reply to enquiries and send booking-related messages (confirmations, payment receipts, return reminders).</li>
          </ul>
          <p>
            We process this data with your consent, which you give when you create an account or submit a form, and where Indian law
            requires it (for example tax records). We do not send marketing emails without your separate consent, and we do not sell your data.
          </p>
        </Section>

        <Section title="Who we share it with">
          <p>Only with service providers that help us run the rental, under contracts that require them to protect it:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Razorpay (payments), delivery and courier partners (name, phone and site address only).</li>
            <li>Vercel (website hosting and private file storage) and Neon (database). These servers are located in Singapore.</li>
            <li>Our email provider, for sending booking messages.</li>
          </ul>
          <p>We also share data with government or law-enforcement authorities when the law requires it.</p>
        </Section>

        <Section title="How long we keep it">
          <p>
            Account, booking and KYC data are kept while your account is active and for up to 3 years after your last rental, so we can
            handle deposits, damage claims and disputes. After that we delete it. Invoices and accounting records are kept for as long as
            GST and income-tax law requires (currently up to 8 years).
          </p>
        </Section>

        <Section title="How we protect it">
          <p>
            Data is encrypted in transit (HTTPS). KYC documents are kept in private storage that only authorised staff can open after
            logging in. Staff access is limited by role.
          </p>
        </Section>

        <Section title="Your rights">
          <p>Under the DPDP Act you can:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>ask for a summary of the personal data we hold about you and who we have shared it with;</li>
            <li>correct or update it (most details can be changed under My account → Profile);</li>
            <li>ask us to delete it, except records we must keep by law or for an open booking;</li>
            <li>withdraw your consent at any time. This does not affect processing already done, but we may no longer be able to rent to you;</li>
            <li>nominate another person to exercise these rights if you die or become unable to;</li>
            <li>raise a grievance with us, and if it is not resolved, complain to the Data Protection Board of India.</li>
          </ul>
          <p>To use any of these rights, write to the Grievance Officer below.</p>
        </Section>

        <Section title="Children">
          <p>
            Our services are only for people aged 18 or over. We do not knowingly collect data from anyone under 18. If you believe a child
            has given us their data, contact us and we will delete it.
          </p>
        </Section>

        <Section title="Cookies and browser storage">
          <p>
            We use a single essential cookie to keep you logged in, and your browser&apos;s local storage to remember your cart. We do not
            use advertising, analytics or session-recording tools, and no third-party trackers are loaded on this site.
          </p>
        </Section>

        <Section title="Grievance Officer">
          <p>
            {g.name}, {s.legalName}
            <br />
            Email: {mail(g.email)}
            {g.phone ? <><br />Phone: {g.phone}</> : null}
            {s.address ? <><br />Address: {s.address}</> : null}
          </p>
          <p>We acknowledge complaints within 48 hours and aim to resolve them within 30 days.</p>
        </Section>

        <Section title="Changes">
          <p>If we change this policy we will update the date above, and tell you by email for any significant change.</p>
        </Section>
      </div>
    </Container>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}
