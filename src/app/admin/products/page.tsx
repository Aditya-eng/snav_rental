import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { paiseToRupees } from "@/lib/money";
import { Badge, Card, LinkButton, PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { quickPriceAction } from "./actions";

export const metadata = { title: "Products & pricing" };

const cell = "h-9 w-24 rounded-md border border-slate-300 px-2 text-sm text-right focus:border-orange-500 focus:outline-none";

export default async function AdminProducts() {
  await requireStaff("products");
  const products = await db.product.findMany({
    include: { category: true, _count: { select: { units: { where: { status: "ACTIVE" } } } } },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });

  return (
    <div>
      <PageHeader
        title="Products & pricing"
        subtitle="Edit rates inline (in ₹, excluding GST) or open a product for full details, photos and units."
        action={<LinkButton href="/admin/products/new">Add product</LinkButton>}
      />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Product</th>
              <th className="px-2 py-2.5 text-right font-medium">Day</th>
              <th className="px-2 py-2.5 text-right font-medium">Week</th>
              <th className="px-2 py-2.5 text-right font-medium">Month</th>
              <th className="px-2 py-2.5 text-right font-medium">Deposit</th>
              <th className="px-2 py-2.5 text-right font-medium">Sale price</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 align-middle">
                <td className="px-4 py-2">
                  <Link href={`/admin/products/${p.id}`} className="font-semibold text-slate-900 hover:text-orange-700">{p.name}</Link>
                  <div className="mt-0.5 flex flex-wrap gap-1 text-xs">
                    <span className="text-slate-500">{p.category.name} · {p._count.units} unit{p._count.units === 1 ? "" : "s"}</span>
                    {!p.active ? <Badge tone="slate">Hidden</Badge> : null}
                    {p.featured ? <Badge tone="amber">Featured</Badge> : null}
                    {!p.rentable ? <Badge tone="slate">Not for rent</Badge> : null}
                  </div>
                </td>
                <td colSpan={6} className="px-2 py-2">
                  <ActionForm action={quickPriceAction} inlineMessage className="flex items-center justify-end gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <input aria-label={`${p.name} daily rate`} name="dailyRate" defaultValue={paiseToRupees(p.dailyRate)} className={cell} inputMode="decimal" />
                    <input aria-label={`${p.name} weekly rate`} name="weeklyRate" defaultValue={paiseToRupees(p.weeklyRate)} className={cell} inputMode="decimal" />
                    <input aria-label={`${p.name} monthly rate`} name="monthlyRate" defaultValue={paiseToRupees(p.monthlyRate)} className={cell} inputMode="decimal" />
                    <input aria-label={`${p.name} deposit`} name="deposit" defaultValue={paiseToRupees(p.deposit)} className={cell} inputMode="decimal" />
                    <input aria-label={`${p.name} sale price`} name="salePrice" defaultValue={paiseToRupees(p.salePrice)} placeholder="On request" className={cell} inputMode="decimal" />
                    <SubmitButton size="sm" variant="outline" pendingText="…">Save</SubmitButton>
                  </ActionForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
