import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { formatDate } from "@/lib/dates";
import { Alert, Card, CardHeader, Field, Input, PageHeader, Table } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { UnitStatusBadge } from "@/components/status-badge";
import { ProductForm } from "../product-form";
import { addUnitAction } from "../actions";

export default async function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  const staff = await requireStaff("products");
  const { id } = await props.params;
  const sp = await props.searchParams;
  const [product, categories] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { units: { orderBy: { serialNumber: "asc" } } } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!product) notFound();
  const canUnits = canAccess(staff.role, "units");

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/admin/products" className="text-sm text-slate-500 hover:text-slate-800">← Products</Link>
        <PageHeader
          title={product.name}
          action={<Link href={`/equipment/${product.slug}`} target="_blank" className="text-sm font-semibold text-orange-700">View on site ↗</Link>}
        />
      </div>
      {sp.created ? <Alert tone="green">Product created. Add its units (serial numbers) below so it can be booked.</Alert> : null}

      <Card>
        <CardHeader title="Units in fleet" subtitle="Each physical instrument with its serial number. Only units “In fleet” count towards availability." />
        {product.units.length ? (
          <Table>
            <thead>
              <tr>
                <th>Serial</th>
                <th>Status</th>
                <th>Condition</th>
                <th>Purchased</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {product.units.map((u) => (
                <tr key={u.id}>
                  <td className="font-mono">{u.serialNumber}</td>
                  <td><UnitStatusBadge status={u.status} /></td>
                  <td>{u.condition}</td>
                  <td>{formatDate(u.purchaseDate)}</td>
                  <td className="text-right">{canUnits ? <Link href={`/admin/units/${u.id}`} className="font-semibold text-orange-700">Edit</Link> : null}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="px-5 py-4 text-sm text-slate-500">No units yet — this product shows as “availability on request”.</p>
        )}
        {canUnits ? (
          <ActionForm action={addUnitAction} resetOnSuccess className="grid gap-3 border-t border-slate-100 p-5 sm:grid-cols-2">
            <input type="hidden" name="productId" value={product.id} />
            <Field label="Serial numbers" hint="One per line or comma separated." className="sm:col-span-2">
              <textarea name="serials" rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-orange-500 focus:outline-none" required />
            </Field>
            <Field label="Purchase date (optional)">
              <Input type="date" name="purchaseDate" />
            </Field>
            <Field label="Purchase cost per unit, ₹ (optional)" hint="Used for payback reports.">
              <Input name="purchaseCost" inputMode="decimal" />
            </Field>
            <div className="sm:col-span-2">
              <SubmitButton variant="secondary" pendingText="Adding…">Add units</SubmitButton>
            </div>
          </ActionForm>
        ) : null}
      </Card>

      <ProductForm product={product} categories={categories} />
    </div>
  );
}
