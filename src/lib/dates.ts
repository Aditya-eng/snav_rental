// Rental dates are calendar dates stored as UTC midnight. Rental periods are inclusive:
// 5 Oct -> 7 Oct is 3 rental days.

const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 330 * 60_000;

export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (d.getUTCMonth() !== Number(m[2]) - 1) return null;
  return d;
}

export function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** The current calendar date in India, as UTC midnight. */
export function todayIST(): Date {
  const now = new Date(Date.now() + IST_OFFSET_MS);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

/** Inclusive number of days between two calendar dates. */
export function rentalDays(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

export function formatDate(d: Date | null | undefined): string {
  return d ? dateFmt.format(d) : "—";
}

export function formatDateTime(d: Date | null | undefined): string {
  return d ? dateTimeFmt.format(d) : "—";
}

/** Indian financial year label for a date, e.g. "26-27" for 3 Oct 2026. */
export function financialYear(d: Date): string {
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const startYear = ist.getUTCMonth() >= 3 ? y : y - 1;
  return `${String(startYear).slice(2)}-${String(startYear + 1).slice(2)}`;
}
