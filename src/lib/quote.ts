import { db } from "./db";
import { addDays, formatDate, parseDateOnly, rentalDays, todayIST, toDateInput } from "./dates";
import { bestRentalPrice, servicePrice } from "./pricing";
import { availableQuantities } from "./availability";
import { computeGst } from "./gst";
import { getSettings, num } from "./settings";
import { percentOf } from "./money";
import { MAX_RENTAL_DAYS } from "./constants";

export type CartInput = {
  start: string;
  end: string;
  items: { productId: string; quantity: number }[];
  services: { serviceId: string; quantity: number; days: number }[];
  cityId?: string | null;
  fulfillment?: "DELIVERY" | "PICKUP" | null;
  couponCode?: string | null;
  billingState?: string | null;
};

export type QuoteLine = {
  kind: "RENTAL" | "SERVICE";
  productId?: string;
  serviceId?: string;
  slug?: string;
  imageUrl?: string | null;
  categorySlug?: string;
  name: string;
  sacCode: string | null;
  quantity: number;
  days: number;
  unitAmount: number;
  amount: number;
  pricingNote: string;
  deposit: number;
  available?: number;
};

export type Quote = {
  ok: boolean;
  errors: string[];
  start: string;
  end: string;
  days: number;
  lines: QuoteLine[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  couponMessage: string | null;
  deliveryFee: number;
  taxable: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  interState: boolean;
  deposit: number;
  rentalCharges: number; // taxable + GST
  total: number; // rentalCharges + deposit
  advanceAmount: number;
  advancePercent: number;
};

function clampInt(n: unknown, min: number, max: number) {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, v));
}

export async function evaluateCoupon(code: string | null | undefined, subtotal: number) {
  if (!code) return { discount: 0, code: null, message: null };
  const normalized = code.trim().toUpperCase();
  const coupon = await db.coupon.findUnique({ where: { code: normalized } });
  const now = new Date();
  if (!coupon || !coupon.active) return { discount: 0, code: null, message: "This coupon code is not valid." };
  if (coupon.validFrom && coupon.validFrom > now) return { discount: 0, code: null, message: "This coupon is not active yet." };
  if (coupon.validTo && coupon.validTo < now) return { discount: 0, code: null, message: "This coupon has expired." };
  if (coupon.maxUses !== null && coupon.used >= coupon.maxUses)
    return { discount: 0, code: null, message: "This coupon has been fully used." };
  if (subtotal < coupon.minOrder) return { discount: 0, code: null, message: "Order total is below the coupon minimum." };
  let discount = 0;
  if (coupon.percentOff) discount = percentOf(subtotal, coupon.percentOff);
  else if (coupon.flatOff) discount = coupon.flatOff;
  discount = Math.min(discount, subtotal);
  return { discount, code: coupon.code, message: `Coupon ${coupon.code} applied.` };
}

/** Price and validate a cart. Used by the cart, checkout and when placing a booking. */
export async function buildQuote(input: CartInput, opts: { excludeBookingId?: string } = {}): Promise<Quote> {
  const settings = await getSettings();
  const errors: string[] = [];
  const gstRate = num(settings, "gstRate", 18);
  const advancePercent = num(settings, "advancePercent", 50);
  const minLead = num(settings, "minLeadDays", 1);

  const start = parseDateOnly(input.start);
  const end = parseDateOnly(input.end);
  let days = 0;
  if (!start || !end) errors.push("Choose a start and end date.");
  else {
    days = rentalDays(start, end);
    const earliest = addDays(todayIST(), minLead);
    if (start < earliest) errors.push(`The earliest start date is ${formatDate(earliest)}.`);
    if (days < 1) errors.push("The end date must be on or after the start date.");
    if (days > MAX_RENTAL_DAYS) errors.push(`Online bookings can be up to ${MAX_RENTAL_DAYS} days. Request a quote for longer rentals.`);
  }
  const validDays = Math.max(1, Math.min(days, MAX_RENTAL_DAYS));

  const itemInputs = (input.items ?? [])
    .map((i) => ({ productId: String(i.productId), quantity: clampInt(i.quantity, 0, 50) }))
    .filter((i) => i.quantity > 0);
  const serviceInputs = (input.services ?? [])
    .map((s) => ({ serviceId: String(s.serviceId), quantity: clampInt(s.quantity, 0, 20), days: clampInt(s.days, 1, validDays) }))
    .filter((s) => s.quantity > 0);

  if (itemInputs.length === 0) errors.push("Add at least one instrument to rent.");

  const [products, services] = await Promise.all([
    db.product.findMany({ where: { id: { in: itemInputs.map((i) => i.productId) } }, include: { category: true } }),
    db.service.findMany({ where: { id: { in: serviceInputs.map((s) => s.serviceId) } } }),
  ]);

  const available =
    start && end && days >= 1 && products.length
      ? await availableQuantities(
          products.map((p) => p.id),
          start,
          end,
          opts.excludeBookingId,
        )
      : new Map<string, number>();

  const lines: QuoteLine[] = [];
  for (const item of itemInputs) {
    const p = products.find((x) => x.id === item.productId);
    if (!p || !p.active || !p.rentable) {
      errors.push("One of the instruments in your booking is no longer available for rent.");
      continue;
    }
    const price = bestRentalPrice(validDays, p);
    const avail = available.get(p.id) ?? 0;
    if (start && end && item.quantity > avail) {
      errors.push(
        avail === 0
          ? `${p.name} is fully booked for these dates.`
          : `Only ${avail} × ${p.name} available for these dates.`,
      );
    }
    lines.push({
      kind: "RENTAL",
      productId: p.id,
      slug: p.slug,
      imageUrl: p.imageUrl,
      categorySlug: p.category.slug,
      name: p.name,
      sacCode: settings.rentalSac || null,
      quantity: item.quantity,
      days: validDays,
      unitAmount: price.amount,
      amount: price.amount * item.quantity,
      pricingNote: price.note,
      deposit: p.deposit * item.quantity,
      available: avail,
    });
  }
  for (const s of serviceInputs) {
    const svc = services.find((x) => x.id === s.serviceId);
    if (!svc || !svc.active) {
      errors.push("One of the selected services is no longer offered.");
      continue;
    }
    const unitAmount = servicePrice(s.days, svc.dailyRate);
    lines.push({
      kind: "SERVICE",
      serviceId: svc.id,
      name: svc.name,
      sacCode: svc.sacCode,
      quantity: s.quantity,
      days: s.days,
      unitAmount,
      amount: unitAmount * s.quantity,
      pricingNote: `${s.days} day${s.days > 1 ? "s" : ""}`,
      deposit: 0,
    });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
  const coupon = await evaluateCoupon(input.couponCode, subtotal);

  let deliveryFee = 0;
  if (input.cityId) {
    const city = await db.city.findUnique({ where: { id: input.cityId } });
    if (!city || !city.active) errors.push("We don't currently serve the selected city.");
    else if (input.fulfillment === "PICKUP") {
      if (!city.pickupAvailable) errors.push(`Office pickup is not available in ${city.name}.`);
    } else if (input.fulfillment === "DELIVERY") deliveryFee = city.deliveryFee;
  }

  const taxable = Math.max(0, subtotal - coupon.discount) + deliveryFee;
  const gst = computeGst(taxable, gstRate, settings.state, input.billingState);
  const deposit = lines.reduce((sum, l) => sum + l.deposit, 0);
  const rentalCharges = taxable + gst.total;

  return {
    ok: errors.length === 0,
    errors: [...new Set(errors)],
    start: start ? toDateInput(start) : input.start,
    end: end ? toDateInput(end) : input.end,
    days: Math.max(0, days),
    lines,
    subtotal,
    discount: coupon.discount,
    couponCode: coupon.code,
    couponMessage: coupon.message,
    deliveryFee,
    taxable,
    gstRate,
    cgst: gst.cgst,
    sgst: gst.sgst,
    igst: gst.igst,
    interState: gst.interState,
    deposit,
    rentalCharges,
    total: rentalCharges + deposit,
    advanceAmount: Math.min(rentalCharges + deposit, percentOf(rentalCharges, advancePercent) + deposit),
    advancePercent,
  };
}
