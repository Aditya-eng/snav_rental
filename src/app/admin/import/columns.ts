// Column layout shared by the CSV templates and the importers. Amounts are in rupees.

export const PRICE_COLUMNS = [
  "slug",
  "name",
  "rentable",
  "daily_rate",
  "weekly_rate",
  "monthly_rate",
  "deposit",
  "for_sale",
  "sale_price",
  "active",
] as const;

export const UNIT_COLUMNS = [
  "product_slug",
  "serial_number",
  "status",
  "condition",
  "firmware",
  "purchase_date",
  "purchase_cost",
  "notes",
] as const;

export const IMPORT_KINDS = ["prices", "units"] as const;
export type ImportKind = (typeof IMPORT_KINDS)[number];
