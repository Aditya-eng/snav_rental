// All amounts are integer paise.

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₹12,500 (rounded to whole rupees) */
export function formatINR(paise: number): string {
  return inr.format(Math.round(paise) / 100);
}

/** ₹12,500.00 — for invoices */
export function formatINRExact(paise: number): string {
  return inrPaise.format(Math.round(paise) / 100);
}

/** Parse a rupee amount typed by a person ("12,500.50") into paise. */
export function rupeesToPaise(value: FormDataEntryValue | string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[,₹\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function paiseToRupees(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return "";
  const r = paise / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
}

export function percentOf(paise: number, percent: number): number {
  return Math.round((paise * percent) / 100);
}
