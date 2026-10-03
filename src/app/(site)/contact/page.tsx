import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { whatsappLink } from "@/lib/utils";
import { Card, Container } from "@/components/ui";
import { EnquiryForm } from "@/components/enquiry-form";

export const metadata: Metadata = { title: "Contact us" };

export default async function ContactPage() {
  const [s, products, user, offices] = await Promise.all([
    getSettings(),
    db.product.findMany({ where: { active: true }, select: { slug: true, name: true }, orderBy: { sortOrder: "asc" } }),
    getCurrentUser(),
    db.city.findMany({ where: { active: true, pickupAvailable: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const wa = s.whatsapp || s.phone;
  return (
    <Container className="py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Contact us</h1>
      <p className="mt-2 text-slate-600">Questions about a model, a project or an existing booking? We&apos;re happy to help.</p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <Card className="p-6">
          <EnquiryForm
            kind="GENERAL"
            products={products}
            defaults={user ? { name: user.name, email: user.email, phone: user.phone, company: user.companyName } : undefined}
          />
        </Card>
        <div className="space-y-4">
          <Card className="space-y-4 p-6 text-sm">
            {s.phone ? (
              <p className="flex gap-3"><Phone className="size-5 text-orange-600" aria-hidden /><a href={`tel:${s.phone.replace(/\s/g, "")}`} className="font-medium text-slate-900">{s.phone}</a></p>
            ) : null}
            {wa ? (
              <p className="flex gap-3"><MessageCircle className="size-5 text-orange-600" aria-hidden /><a href={whatsappLink(wa)} target="_blank" rel="noopener noreferrer" className="font-medium text-slate-900">Chat on WhatsApp</a></p>
            ) : null}
            <p className="flex gap-3"><Mail className="size-5 text-orange-600" aria-hidden /><a href={`mailto:${s.email}`} className="font-medium text-slate-900">{s.email}</a></p>
            <p className="flex gap-3"><MapPin className="size-5 shrink-0 text-orange-600" aria-hidden /><span className="text-slate-700">{s.address}</span></p>
          </Card>
          {offices.length ? (
            <Card className="p-6 text-sm">
              <h2 className="font-semibold text-slate-900">Pickup offices</h2>
              <ul className="mt-3 space-y-3">
                {offices.map((o) => (
                  <li key={o.id}>
                    <p className="font-medium text-slate-900">{o.name}</p>
                    <p className="text-slate-600">{o.officeAddress}</p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </Container>
  );
}
