import "server-only";
import { db } from "./db";
import { addDays, formatDate, rentalDays } from "./dates";
import { bestRentalPrice } from "./pricing";
import { availableQuantities } from "./availability";
import { computeGst } from "./gst";
import { getSettings, num } from "./settings";
import { MAX_RENTAL_DAYS } from "./constants";

export type ExtensionPrice =
  | { ok: false; error: string }
  | {
      ok: true;
      extraDays: number;
      amount: number; // extra charge incl. GST
      items: { id: string; unitAmount: number; amount: number; pricingNote: string; days: number }[];
    };

/**
 * Prices extending a booking to a new end date. The extra charge per unit is the difference
 * between the best price for the new length and the best price for the current length, at
 * today's rates, so a long extension can move the whole rental onto a cheaper weekly/monthly plan.
 */
export async function priceExtension(bookingId: string, newEnd: Date): Promise<ExtensionPrice> {
  const booking = await db.booking.findUnique({ where: { id: bookingId }, include: { items: { include: { product: true } } } });
  if (!booking) return { ok: false, error: "Booking not found." };
  if (!["CONFIRMED", "DISPATCHED"].includes(booking.status)) return { ok: false, error: "Only confirmed or active rentals can be extended." };
  if (newEnd <= booking.endDate) return { ok: false, error: `Choose a date after the current end date (${formatDate(booking.endDate)}).` };
  const newDays = rentalDays(booking.startDate, newEnd);
  if (newDays > MAX_RENTAL_DAYS) return { ok: false, error: `Rentals can be up to ${MAX_RENTAL_DAYS} days. Please contact us.` };

  const rentals = booking.items.filter((i) => i.kind === "RENTAL" && i.product);
  const avail = await availableQuantities(
    rentals.map((i) => i.productId!),
    addDays(booking.endDate, 1),
    newEnd,
    booking.id,
  );
  for (const item of rentals) {
    if (item.quantity > (avail.get(item.productId!) ?? 0))
      return { ok: false, error: `${item.name} is booked by someone else in that period. Try a shorter extension or contact us.` };
  }

  const items = rentals.map((item) => {
    const p = item.product!;
    const before = bestRentalPrice(booking.days, p).amount;
    const after = bestRentalPrice(newDays, p);
    const extraPerUnit = Math.max(0, after.amount - before);
    const unitAmount = item.unitAmount + extraPerUnit;
    return { id: item.id, unitAmount, amount: unitAmount * item.quantity, pricingNote: after.note, days: newDays };
  });

  const settings = await getSettings();
  const rate = num(settings, "gstRate", 18);
  const unchanged = booking.items.filter((i) => !items.some((x) => x.id === i.id)).reduce((s, i) => s + i.amount, 0);
  const newSubtotal = unchanged + items.reduce((s, i) => s + i.amount, 0);
  const newTaxable = Math.max(0, newSubtotal - booking.discount) + booking.deliveryFee;
  const newGst = computeGst(newTaxable, rate, settings.state, booking.billingState).total;
  const oldTotal = booking.taxableAmount + booking.cgst + booking.sgst + booking.igst;
  const amount = Math.max(0, newTaxable + newGst - oldTotal);

  return { ok: true, extraDays: newDays - booking.days, amount, items };
}
