import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { Card, Container, Table } from "@/components/ui";

export const metadata: Metadata = {
  title: "Delivery & Pickup Across India",
  description: "DGPS and GNSS equipment delivered to your site across Indian cities, or pick up from our office.",
};

export default async function DeliveryPage() {
  const cities = await db.city.findMany({ where: { active: true }, orderBy: [{ state: "asc" }, { name: "asc" }] });
  return (
    <Container className="max-w-4xl py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Delivery & pickup</h1>
      <p className="mt-2 text-slate-600">
        We deliver to your site in the cities below and collect the equipment when the rental ends. The fee is charged once per booking.
        Where marked, you can also pick up from and return to our office at no charge.
      </p>
      <Card className="mt-8">
        <Table>
          <thead>
            <tr>
              <th>City</th>
              <th>State</th>
              <th>Delivery & collection</th>
              <th>Office pickup</th>
            </tr>
          </thead>
          <tbody>
            {cities.map((c) => (
              <tr key={c.id}>
                <td className="font-medium text-slate-900">{c.name}</td>
                <td className="text-slate-600">{c.state}</td>
                <td>{c.deliveryFee ? formatINR(c.deliveryFee) : "Free"}</td>
                <td className="text-slate-600">{c.pickupAvailable ? c.officeAddress || "Available" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <p className="mt-6 text-sm text-slate-600">
        Project outside these cities? <Link href="/quote" className="font-semibold text-orange-700">Ask for a quote</Link> and we&apos;ll see what we can arrange.
      </p>
    </Container>
  );
}
