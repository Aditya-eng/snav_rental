import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { getSettings, grievanceContact } from "@/lib/settings";
import { Container } from "./ui";
import { Logo } from "./logo";

export async function SiteFooter() {
  const s = await getSettings();
  const g = grievanceContact(s);
  return (
    <footer className="mt-auto bg-navy-950 text-slate-300">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo light />
          <p className="mt-4 text-sm leading-6 text-slate-400">{s.tagline}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Equipment</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/equipment?category=gnss-receivers">GNSS / DGPS receivers</Link></li>
            <li><Link className="hover:text-white" href="/equipment?category=base-stations">Base stations</Link></li>
            <li><Link className="hover:text-white" href="/equipment?category=controllers">Field controllers</Link></li>
            <li><Link className="hover:text-white" href="/equipment?mode=buy">Buy equipment</Link></li>
            <li><Link className="hover:text-white" href="/compare">Compare models</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Company</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/services">Operators & training</Link></li>
            <li><Link className="hover:text-white" href="/delivery">Delivery & pickup</Link></li>
            <li><Link className="hover:text-white" href="/quote">Bulk / long-term quote</Link></li>
            <li><Link className="hover:text-white" href="/faq">FAQ</Link></li>
            <li><Link className="hover:text-white" href="/terms">Rental terms</Link></li>
            <li><Link className="hover:text-white" href="/refund-policy">Cancellation & refunds</Link></li>
            <li><Link className="hover:text-white" href="/privacy">Privacy policy</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Contact</h3>
          <ul className="mt-3 space-y-3 text-sm">
            {s.phone ? (
              <li className="flex gap-2"><Phone className="size-4 mt-0.5 shrink-0" aria-hidden /><a className="hover:text-white" href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a></li>
            ) : null}
            <li className="flex gap-2"><Mail className="size-4 mt-0.5 shrink-0" aria-hidden /><a className="hover:text-white" href={`mailto:${s.email}`}>{s.email}</a></li>
            <li className="flex gap-2"><MapPin className="size-4 mt-0.5 shrink-0" aria-hidden /><span>{s.address}</span></li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-white/10">
        <Container className="space-y-2 py-5 text-xs text-slate-500">
          <p>
            {s.legalName}
            {s.address ? ` · ${s.address}` : ""}
            {s.gstin ? ` · GSTIN ${s.gstin}` : ""}
          </p>
          <p>
            Grievance Officer: {g.name} ·{" "}
            <a className="hover:text-white" href={`mailto:${g.email}`}>{g.email}</a>
            {g.phone ? ` · ${g.phone}` : ""}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <p>© {new Date().getFullYear()} {s.legalName}. All rights reserved.</p>
            <p>eSurvey and product names are trademarks of their respective owners.</p>
          </div>
        </Container>
      </div>
    </footer>
  );
}
