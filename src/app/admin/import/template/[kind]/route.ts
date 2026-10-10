import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { paiseToRupees } from "@/lib/money";
import { toDateInput } from "@/lib/dates";
import { toCsv } from "@/lib/csv";
import { PRICE_COLUMNS, UNIT_COLUMNS } from "../../columns";

const yesNo = (b: boolean) => (b ? "yes" : "no");

// Downloads the current catalog prices or fleet as a CSV, ready to edit and import again.
export async function GET(_req: Request, ctx: RouteContext<"/admin/import/template/[kind]">) {
  const { kind } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let rows: (string | number | null)[][];
  if (kind === "prices" && canAccess(user.role, "products")) {
    const products = await db.product.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
    rows = [
      [...PRICE_COLUMNS],
      ...products.map((p) => [
        p.slug,
        p.name,
        yesNo(p.rentable),
        paiseToRupees(p.dailyRate),
        paiseToRupees(p.weeklyRate),
        paiseToRupees(p.monthlyRate),
        paiseToRupees(p.deposit),
        yesNo(p.forSale),
        p.salePrice === null ? "" : paiseToRupees(p.salePrice),
        yesNo(p.active),
      ]),
    ];
  } else if (kind === "units" && canAccess(user.role, "units")) {
    const units = await db.unit.findMany({ include: { product: { select: { slug: true } } }, orderBy: [{ product: { sortOrder: "asc" } }, { serialNumber: "asc" }] });
    rows = [
      [...UNIT_COLUMNS],
      ...units.map((u) => [
        u.product.slug,
        u.serialNumber,
        u.status,
        u.condition,
        u.firmware,
        u.purchaseDate ? toDateInput(u.purchaseDate) : "",
        u.purchaseCost === null ? "" : paiseToRupees(u.purchaseCost),
        u.notes,
      ]),
    ];
  } else {
    return new Response("Not found", { status: 404 });
  }

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="snav-${kind}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
