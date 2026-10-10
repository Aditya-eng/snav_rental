"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { fail, done, type ActionState } from "@/lib/action-state";
import { parseDateOnly } from "@/lib/dates";
import { csvRecords } from "@/lib/csv";
import { PRICE_COLUMNS, UNIT_COLUMNS } from "./columns";

const MAX_ERRORS = 15;

async function readCsv(form: FormData, required: readonly string[]) {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file to import." };
  if (file.size > 2_000_000) return { error: "The file is too large (2 MB max)." };
  const { headers, records } = csvRecords(await file.text());
  const missing = required.filter((c) => !headers.includes(c));
  if (missing.length) return { error: `Missing columns: ${missing.join(", ")}. Start from the downloaded template.` };
  if (!records.length) return { error: "The file has no data rows." };
  return { records };
}

/** Rupee amount in a cell → paise. Blank → null; anything that isn't a non-negative number → NaN. */
function amount(v: string): number | null {
  const t = v.replace(/[,₹\s]/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
}

function yesNo(v: string): boolean | null {
  const t = v.trim().toLowerCase();
  if (["yes", "y", "true", "1"].includes(t)) return true;
  if (["no", "n", "false", "0"].includes(t)) return false;
  return null;
}

/** Accepts 2026-10-31 as well as 31-10-2026 / 31/10/2026 (how Excel in India often saves dates). */
function date(v: string): Date | null | undefined {
  if (!v) return null;
  const dmy = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(v);
  const iso = dmy ? `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}` : v;
  return parseDateOnly(iso) ?? undefined;
}

function report(errors: string[]): ActionState {
  const more = errors.length > MAX_ERRORS ? ` …and ${errors.length - MAX_ERRORS} more.` : "";
  return fail(`Nothing was imported. Fix these and upload again: ${errors.slice(0, MAX_ERRORS).join(" · ")}${more}`);
}

export async function importPricesAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("products");
  const csv = await readCsv(form, PRICE_COLUMNS.filter((c) => c !== "name"));
  if ("error" in csv) return fail(csv.error!);

  const products = await db.product.findMany({ select: { id: true, slug: true } });
  const idBySlug = new Map(products.map((p) => [p.slug, p.id]));
  const errors: string[] = [];
  const seen = new Set<string>();
  const updates = csv.records.map((r, i) => {
    const line = `Row ${i + 2}`;
    const id = idBySlug.get(r.slug);
    if (!id) errors.push(`${line}: unknown slug "${r.slug}" (add new models in Products first)`);
    if (seen.has(r.slug)) errors.push(`${line}: "${r.slug}" appears twice`);
    seen.add(r.slug);
    for (const col of ["rentable", "for_sale", "active"]) if (yesNo(r[col]) === null) errors.push(`${line}: ${col} must be yes or no`);
    for (const col of ["daily_rate", "weekly_rate", "monthly_rate", "deposit", "sale_price"])
      if (Number.isNaN(amount(r[col]))) errors.push(`${line}: ${col} is not a valid amount`);
    const flags = { rentable: yesNo(r.rentable), forSale: yesNo(r.for_sale), active: yesNo(r.active) };
    const money = {
      dailyRate: amount(r.daily_rate) ?? 0,
      weeklyRate: amount(r.weekly_rate) ?? 0,
      monthlyRate: amount(r.monthly_rate) ?? 0,
      deposit: amount(r.deposit) ?? 0,
      salePrice: amount(r.sale_price),
    };
    if (flags.rentable && money.dailyRate <= 0) errors.push(`${line}: a rentable model needs a daily_rate`);
    return { id: id ?? "", data: { ...money, rentable: !!flags.rentable, forSale: !!flags.forSale, active: !!flags.active } };
  });
  if (errors.length) return report(errors);

  await db.$transaction(updates.map((u) => db.product.update({ where: { id: u.id }, data: u.data })));
  revalidatePath("/", "layout");
  return done(`Updated prices for ${updates.length} model${updates.length === 1 ? "" : "s"}.`);
}

export async function importUnitsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("units");
  const csv = await readCsv(form, ["product_slug", "serial_number"]);
  if ("error" in csv) return fail(csv.error!);

  const products = await db.product.findMany({ select: { id: true, slug: true } });
  const idBySlug = new Map(products.map((p) => [p.slug, p.id]));
  const errors: string[] = [];
  const seen = new Set<string>();
  const rows = csv.records.map((r, i) => {
    const line = `Row ${i + 2}`;
    const productId = idBySlug.get(r.product_slug);
    if (!productId) errors.push(`${line}: unknown product_slug "${r.product_slug}"`);
    const serialNumber = r.serial_number;
    if (!serialNumber) errors.push(`${line}: serial_number is empty`);
    else if (seen.has(serialNumber)) errors.push(`${line}: serial "${serialNumber}" appears twice`);
    seen.add(serialNumber);
    const status = (r.status || "ACTIVE").toUpperCase();
    if (!["ACTIVE", "MAINTENANCE", "RETIRED"].includes(status)) errors.push(`${line}: status must be ACTIVE, MAINTENANCE or RETIRED`);
    const purchaseDate = date(r.purchase_date ?? "");
    if (purchaseDate === undefined) errors.push(`${line}: purchase_date must look like 2026-10-31`);
    const purchaseCost = amount(r.purchase_cost ?? "");
    if (Number.isNaN(purchaseCost)) errors.push(`${line}: purchase_cost is not a valid amount`);
    const data = {
      productId: productId ?? "",
      status,
      condition: r.condition || "Good",
      firmware: r.firmware || null,
      purchaseDate: purchaseDate ?? null,
      purchaseCost,
      notes: r.notes || null,
    };
    return { serialNumber, data };
  });
  if (errors.length) return report(errors);

  // A unit's model can't be switched by import: its bookings and inspections belong to that model.
  const existing = new Map(
    (await db.unit.findMany({ where: { serialNumber: { in: rows.map((r) => r.serialNumber) } }, select: { serialNumber: true, productId: true } })).map((u) => [
      u.serialNumber,
      u.productId,
    ]),
  );
  for (const r of rows) {
    const current = existing.get(r.serialNumber);
    if (current && current !== r.data.productId) errors.push(`serial "${r.serialNumber}" is already in the fleet under a different model`);
  }
  if (errors.length) return report(errors);

  await db.$transaction(
    rows.map((r) => db.unit.upsert({ where: { serialNumber: r.serialNumber }, create: { serialNumber: r.serialNumber, ...r.data }, update: r.data })),
  );
  revalidatePath("/admin/units");
  revalidatePath("/", "layout");
  const added = rows.length - existing.size;
  return done(`Fleet updated: ${added} unit${added === 1 ? "" : "s"} added, ${existing.size} updated.`);
}
