import { cache } from "react";
import { db } from "./db";

export const DEFAULT_TERMS = `1. Rental period: The rental runs from the start date to the end date shown on the booking (both days included). Equipment must be returned on or before the end date.
2. Late return: Each extra day is charged at the daily rental rate unless an extension has been approved in advance.
3. Security deposit: The refundable deposit is returned after the equipment is inspected, less any late fees, missing items or damage repair costs.
4. Care of equipment: The renter is responsible for the equipment from delivery/pickup until it is returned, including loss, theft and damage beyond normal wear.
5. Use: The equipment may only be used at the project site and by trained persons. Sub-renting is not allowed.
6. Identification: Valid KYC documents must be verified before dispatch.
7. Cancellation: Bookings cancelled more than 48 hours before the start date are refunded in full, less payment gateway charges. Later cancellations may be charged one day of rent.
8. Software and data: The renter is responsible for backing up project data before return. Devices are reset after each rental.
9. Jurisdiction: Disputes are subject to the jurisdiction of the courts at the company's registered office.`;

export const SETTING_DEFAULTS = {
  companyName: "SNAV",
  legalName: "SNAV",
  tagline: "DGPS & GNSS receivers on rent and for sale across India",
  gstin: "",
  pan: "",
  address: "Registered office address (update in Admin → Settings)",
  state: "Delhi",
  phone: "",
  whatsapp: "",
  email: "info@snavindia.com",
  adminEmail: "",
  gstRate: "18",
  rentalSac: "997319",
  advancePercent: "50",
  lateFeeMultiplier: "1",
  minLeadDays: "1",
  invoicePrefix: "SNAV",
  bankDetails: "",
  rentalTerms: DEFAULT_TERMS,
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type Settings = Record<SettingKey, string>;

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await db.setting.findMany();
  const out: Record<string, string> = { ...SETTING_DEFAULTS };
  for (const row of rows) if (row.key in SETTING_DEFAULTS) out[row.key] = row.value;
  return out as Settings;
});

export function num(settings: Settings, key: SettingKey, fallback: number): number {
  const n = Number(settings[key]);
  return Number.isFinite(n) ? n : fallback;
}

export async function saveSettings(values: Partial<Settings>) {
  await db.$transaction(
    Object.entries(values).map(([key, value]) =>
      db.setting.upsert({ where: { key }, create: { key, value: value ?? "" }, update: { value: value ?? "" } }),
    ),
  );
}

/** Reserve the next sequence number for a counter key (e.g. invoice numbers per financial year). */
export async function nextSequence(key: string): Promise<number> {
  return db.$transaction(async (tx) => {
    const row = await tx.setting.findUnique({ where: { key } });
    const next = (row ? Number(row.value) || 0 : 0) + 1;
    await tx.setting.upsert({ where: { key }, create: { key, value: String(next) }, update: { value: String(next) } });
    return next;
  });
}
