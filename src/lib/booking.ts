import "server-only";
import { db } from "./db";
import { financialYear, formatDate } from "./dates";
import { formatINR } from "./money";
import { getSettings, nextSequence } from "./settings";
import { emailLayout, sendEmail, siteUrl } from "./notify";
import { computeGst } from "./gst";
import { num } from "./settings";

type MoneyFields = {
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  deposit: number;
  lateFee: number;
  damageCharge: number;
  amountPaid: number;
  depositRefunded: number;
  depositStatus: string;
};

export function bookingMoney(b: MoneyFields) {
  const gst = b.cgst + b.sgst + b.igst;
  const rentalCharges = b.taxableAmount + gst;
  const extras = b.lateFee + b.damageCharge;
  const netPaid = b.amountPaid - b.depositRefunded;
  const depositOwed = b.depositStatus === "SETTLED" ? 0 : b.deposit;
  const due = rentalCharges + extras + depositOwed - netPaid;
  // What is left of the customer's money after rent and extra charges: the refundable amount.
  const refundable = Math.max(0, netPaid - rentalCharges - extras);
  return { gst, rentalCharges, extras, netPaid, due, refundable, grandTotal: rentalCharges + b.deposit + extras };
}

export async function generateBookingCode() {
  const now = new Date();
  const ymd = `${String(now.getUTCFullYear()).slice(2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const code = `SNV${ymd}-${suffix}`;
    const exists = await db.booking.findUnique({ where: { code }, select: { id: true } });
    if (!exists) return code;
  }
  throw new Error("Could not generate a booking code");
}

export async function logEvent(bookingId: string, message: string, actor?: string | null) {
  await db.bookingEvent.create({ data: { bookingId, message, actor: actor ?? null } });
}

/** Moves a booking to CONFIRMED, issuing an invoice number if it has none. */
export async function confirmBooking(bookingId: string, actor: string) {
  const booking = await db.booking.findUnique({ where: { id: bookingId }, include: { user: true } });
  if (!booking) throw new Error("Booking not found");
  if (!["PENDING_PAYMENT", "REQUESTED"].includes(booking.status)) return booking;

  const settings = await getSettings();
  let invoiceNo = booking.invoiceNo;
  if (!invoiceNo) {
    const fy = financialYear(new Date());
    const seq = await nextSequence(`invoiceSeq:${fy}`);
    invoiceNo = `${settings.invoicePrefix || "SNAV"}/${fy}/${String(seq).padStart(4, "0")}`;
  }
  const updated = await db.booking.update({
    where: { id: bookingId },
    data: {
      status: "CONFIRMED",
      invoiceNo,
      invoiceDate: booking.invoiceDate ?? new Date(),
      depositStatus: booking.deposit > 0 ? "HELD" : "NONE",
    },
  });
  await logEvent(bookingId, `Booking confirmed. Invoice ${invoiceNo} issued.`, actor);
  await sendEmail(
    booking.user.email,
    `Booking ${booking.code} confirmed`,
    emailLayout({
      heading: "Your booking is confirmed",
      paragraphs: [
        `Hi ${booking.user.name}, your rental ${booking.code} for ${formatDate(booking.startDate)} – ${formatDate(booking.endDate)} is confirmed.`,
        booking.user.kycStatus === "VERIFIED"
          ? "Your KYC is verified, so we'll dispatch as scheduled."
          : "Please upload your KYC documents from your account so we can dispatch on time.",
      ],
      cta: { label: "View booking", url: siteUrl(`/account/bookings/${booking.code}`) },
    }),
  );
  return updated;
}

/** Records a successful payment and confirms the booking if it was waiting for one. */
export async function applyPayment(bookingId: string, amount: number, actor: string) {
  const booking = await db.booking.update({
    where: { id: bookingId },
    data: { amountPaid: { increment: amount } },
  });
  await logEvent(bookingId, `Payment of ${formatINR(amount)} received.`, actor);
  if (booking.status === "PENDING_PAYMENT") await confirmBooking(bookingId, actor);
}

/** Recomputes GST and taxable totals after line items change (e.g. an approved extension). */
export async function recalcBookingTotals(bookingId: string) {
  const booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { items: true } });
  const settings = await getSettings();
  const subtotal = booking.items.reduce((s, i) => s + i.amount, 0);
  const taxable = Math.max(0, subtotal - booking.discount) + booking.deliveryFee;
  const gst = computeGst(taxable, num(settings, "gstRate", 18), settings.state, booking.billingState);
  return db.booking.update({
    where: { id: bookingId },
    data: { subtotal, taxableAmount: taxable, cgst: gst.cgst, sgst: gst.sgst, igst: gst.igst },
  });
}

/** Marks a Razorpay order paid exactly once (shared by the checkout callback and the webhook). */
export async function settleRazorpayOrder(orderId: string, paymentId: string, actor: string) {
  const payment = await db.payment.findUnique({ where: { razorpayOrderId: orderId } });
  if (!payment) return false;
  const res = await db.payment.updateMany({
    where: { id: payment.id, status: "CREATED" },
    data: { status: "PAID", razorpayPaymentId: paymentId },
  });
  if (res.count === 1) await applyPayment(payment.bookingId, payment.amount, actor);
  return true;
}
