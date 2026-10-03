export type GstSplit = { cgst: number; sgst: number; igst: number; total: number; interState: boolean };

/** Intra-state supply -> CGST + SGST; inter-state -> IGST. Amounts in paise. */
export function computeGst(taxable: number, ratePercent: number, companyState: string, billingState?: string | null): GstSplit {
  const interState = !!billingState && billingState !== companyState;
  if (interState) {
    const igst = Math.round((taxable * ratePercent) / 100);
    return { cgst: 0, sgst: 0, igst, total: igst, interState };
  }
  const half = Math.round((taxable * ratePercent) / 200);
  return { cgst: half, sgst: half, igst: 0, total: half * 2, interState };
}
