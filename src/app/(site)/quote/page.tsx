import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Card, Container } from "@/components/ui";
import { EnquiryForm } from "@/components/enquiry-form";

export const metadata: Metadata = {
  title: "Get a Quote — Bulk Rental or Purchase",
  description: "Request a custom quote for multiple DGPS / GNSS receivers, long-term rentals or buying equipment.",
};

export default async function QuotePage(props: PageProps<"/quote">) {
  const sp = await props.searchParams;
  const purchase = sp.type === "purchase";
  const productSlug = typeof sp.product === "string" ? sp.product : undefined;
  const [products, user] = await Promise.all([
    db.product.findMany({ where: { active: true }, select: { slug: true, name: true }, orderBy: { sortOrder: "asc" } }),
    getCurrentUser(),
  ]);
  return (
    <Container className="max-w-3xl py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{purchase ? "Get a purchase quote" : "Get a custom quote"}</h1>
      <p className="mt-2 text-slate-600">
        {purchase
          ? "Tell us which instrument you need and where. We'll get back to you with a GST quote."
          : "Renting several units, for several months, or need a mixed kit with operators? We'll put together a custom price."}
      </p>
      <Card className="mt-8 p-6">
        <EnquiryForm
          kind={purchase ? "PURCHASE" : "RENTAL_QUOTE"}
          products={products}
          productSlug={productSlug}
          defaults={user ? { name: user.name, email: user.email, phone: user.phone, company: user.companyName } : undefined}
        />
      </Card>
    </Container>
  );
}
