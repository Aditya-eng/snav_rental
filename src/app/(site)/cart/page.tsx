import type { Metadata } from "next";
import { db } from "@/lib/db";
import { addDays, todayIST, toDateInput } from "@/lib/dates";
import { getSettings, num } from "@/lib/settings";
import { Container } from "@/components/ui";
import { CartBuilder } from "./cart-builder";

export const metadata: Metadata = { title: "Your booking" };

export default async function CartPage() {
  const settings = await getSettings();
  const [products, services] = await Promise.all([
    db.product.findMany({
      where: { active: true, rentable: true, dailyRate: { gt: 0 } },
      include: { category: true },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    }),
    db.service.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <Container className="py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Your booking</h1>
      <p className="mt-2 text-slate-600">Set your dates, build your kit and add an operator or trainer if you need one.</p>
      <CartBuilder
        minStart={toDateInput(addDays(todayIST(), num(settings, "minLeadDays", 1)))}
        catalog={products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          imageUrl: p.imageUrl,
          tagline: p.tagline,
          dailyRate: p.dailyRate,
          category: p.category.name,
          categorySlug: p.category.slug,
        }))}
        services={services.map((s) => ({ id: s.id, name: s.name, description: s.description, dailyRate: s.dailyRate }))}
      />
    </Container>
  );
}
