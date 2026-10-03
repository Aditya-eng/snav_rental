"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { buildQuote, type CartInput } from "@/lib/quote";
import { availableQuantities } from "@/lib/availability";
import { bookingMoney, generateBookingCode, logEvent, settleRazorpayOrder } from "@/lib/booking";
import { createRazorpayOrder, razorpayEnabled, razorpayKeyId, verifyPaymentSignature } from "@/lib/razorpay";
import { getSettings, num } from "@/lib/settings";
import { percentOf, formatINR } from "@/lib/money";
import { formatDate, parseDateOnly } from "@/lib/dates";
import { emailLayout, notifyAdmin, sendEmail, siteUrl } from "@/lib/notify";
import { INDIAN_STATES } from "@/lib/constants";
import { isValidGstin, isValidPhone, isValidPincode } from "@/lib/utils";

export type CheckoutDetails = {
  fulfillment: "DELIVERY" | "PICKUP";
  cityId: string;
  deliveryAddress: string;
  deliveryPincode: string;
  contactName: string;
  contactPhone: string;
  customerNotes: string;
  billingName: string;
  billingGstin: string;
  billingAddress: string;
  billingState: string;
  couponCode: string;
  paymentPlan: "FULL" | "ADVANCE" | "PAY_LATER";
  agreementName: string;
  agreementAccepted: boolean;
};

export type RazorpayCheckout = {
  keyId: string;
  orderId: string;
  amount: number;
  bookingCode: string;
  name: string;
  email: string;
  phone: string;
};

type PlaceResult = { ok: false; error: string } | { ok: true; code: string; payment: RazorpayCheckout | null };

export async function placeBooking(cart: CartInput, details: CheckoutDetails): Promise<PlaceResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please log in to place your booking." };
  if (user.blocked) return { ok: false, error: "Your account can't place online bookings. Please contact us." };

  const d = details;
  if (d.fulfillment !== "DELIVERY" && d.fulfillment !== "PICKUP") return { ok: false, error: "Choose delivery or office pickup." };
  if (!d.cityId) return { ok: false, error: "Choose your city." };
  if (d.fulfillment === "DELIVERY") {
    if (d.deliveryAddress.trim().length < 10) return { ok: false, error: "Enter the full site / delivery address." };
    if (!isValidPincode(d.deliveryPincode.trim())) return { ok: false, error: "Enter a valid 6-digit PIN code." };
  }
  if (!d.contactName.trim()) return { ok: false, error: "Enter the name of the person receiving the equipment." };
  if (!isValidPhone(d.contactPhone)) return { ok: false, error: "Enter a valid 10-digit contact number." };
  if (!d.billingName.trim() || d.billingAddress.trim().length < 10) return { ok: false, error: "Enter your billing name and address." };
  if (!(INDIAN_STATES as readonly string[]).includes(d.billingState)) return { ok: false, error: "Choose your billing state." };
  const gstin = d.billingGstin.trim().toUpperCase();
  if (gstin && !isValidGstin(gstin)) return { ok: false, error: "That GSTIN doesn't look right. Please check it." };
  if (!d.agreementAccepted || d.agreementName.trim().length < 2)
    return { ok: false, error: "Please accept the rental agreement and type your full name to sign it." };

  const online = razorpayEnabled();
  let plan = d.paymentPlan;
  if (plan === "PAY_LATER" && !user.payLater) plan = "FULL";
  if (plan !== "FULL" && plan !== "ADVANCE" && plan !== "PAY_LATER") plan = "FULL";

  const quote = await buildQuote({
    ...cart,
    cityId: d.cityId,
    fulfillment: d.fulfillment,
    couponCode: d.couponCode || null,
    billingState: d.billingState,
  });
  if (!quote.ok) return { ok: false, error: quote.errors.join(" ") };
  if (d.couponCode && !quote.couponCode) return { ok: false, error: quote.couponMessage ?? "Coupon is not valid." };

  const status = online && plan !== "PAY_LATER" ? "PENDING_PAYMENT" : "REQUESTED";
  const code = await generateBookingCode();
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const booking = await db.booking.create({
    data: {
      code,
      userId: user.id,
      status,
      startDate: parseDateOnly(quote.start)!,
      endDate: parseDateOnly(quote.end)!,
      days: quote.days,
      fulfillment: d.fulfillment,
      cityId: d.cityId,
      deliveryAddress: d.fulfillment === "DELIVERY" ? d.deliveryAddress.trim().slice(0, 500) : null,
      deliveryPincode: d.fulfillment === "DELIVERY" ? d.deliveryPincode.trim() : null,
      contactName: d.contactName.trim().slice(0, 120),
      contactPhone: d.contactPhone.trim(),
      customerNotes: d.customerNotes.trim().slice(0, 1000) || null,
      billingName: d.billingName.trim().slice(0, 160),
      billingGstin: gstin || null,
      billingAddress: d.billingAddress.trim().slice(0, 500),
      billingState: d.billingState,
      paymentPlan: plan,
      subtotal: quote.subtotal,
      discount: quote.discount,
      couponCode: quote.couponCode,
      deliveryFee: quote.deliveryFee,
      taxableAmount: quote.taxable,
      cgst: quote.cgst,
      sgst: quote.sgst,
      igst: quote.igst,
      deposit: quote.deposit,
      agreementName: d.agreementName.trim().slice(0, 120),
      agreementAcceptedAt: new Date(),
      agreementIp: ip,
      items: {
        create: quote.lines.map((l) => ({
          kind: l.kind,
          productId: l.productId ?? null,
          serviceId: l.serviceId ?? null,
          name: l.name,
          sacCode: l.sacCode,
          quantity: l.quantity,
          days: l.days,
          unitAmount: l.unitAmount,
          amount: l.amount,
          pricingNote: l.pricingNote,
          deposit: l.deposit,
        })),
      },
    },
  });

  // Guard against two people booking the last unit at the same moment.
  const rentalLines = quote.lines.filter((l) => l.kind === "RENTAL" && l.productId);
  const after = await availableQuantities(
    rentalLines.map((l) => l.productId!),
    booking.startDate,
    booking.endDate,
    booking.id,
  );
  if (rentalLines.some((l) => l.quantity > (after.get(l.productId!) ?? 0))) {
    await db.booking.delete({ where: { id: booking.id } });
    return { ok: false, error: "Sorry — some of this equipment was just booked by someone else. Please review your dates." };
  }

  if (quote.couponCode) await db.coupon.update({ where: { code: quote.couponCode }, data: { used: { increment: 1 } } });
  await logEvent(booking.id, `Booking placed online (${plan === "PAY_LATER" ? "pay later" : plan.toLowerCase()} payment).`, user.name);

  await sendEmail(
    user.email,
    `Booking ${code} received`,
    emailLayout({
      heading: "We've received your booking",
      paragraphs: [
        `Booking ${code}: ${formatDate(booking.startDate)} – ${formatDate(booking.endDate)} (${booking.days} days).`,
        status === "PENDING_PAYMENT"
          ? "Complete the payment to confirm it."
          : "Our team will confirm availability and share payment details shortly.",
      ],
      cta: { label: "View booking", url: siteUrl(`/account/bookings/${code}`) },
    }),
  );
  await notifyAdmin(
    `New booking ${code}`,
    [
      `${user.name} (${user.phone}) booked ${quote.lines.map((l) => `${l.quantity} × ${l.name}`).join(", ")}.`,
      `${formatDate(booking.startDate)} – ${formatDate(booking.endDate)}, total ${formatINR(quote.total)}.`,
    ],
    `/admin/bookings/${code}`,
  );

  if (status !== "PENDING_PAYMENT") return { ok: true, code, payment: null };
  const amount = plan === "ADVANCE" ? quote.advanceAmount : quote.total;
  const payment = await createOrderFor(booking.id, code, amount, user);
  return { ok: true, code, payment };
}

async function createOrderFor(
  bookingId: string,
  code: string,
  amount: number,
  user: { name: string; email: string; phone: string },
): Promise<RazorpayCheckout> {
  const order = await createRazorpayOrder(amount, code, { booking: code });
  await db.payment.create({
    data: { bookingId, method: "RAZORPAY", status: "CREATED", amount, razorpayOrderId: order.id },
  });
  return { keyId: razorpayKeyId(), orderId: order.id, amount, bookingCode: code, name: user.name, email: user.email, phone: user.phone };
}

/** Starts an online payment for the amount still due on a booking (or the advance on first payment). */
export async function startPayment(code: string): Promise<{ ok: false; error: string } | { ok: true; payment: RazorpayCheckout }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please log in again." };
  if (!razorpayEnabled()) return { ok: false, error: "Online payment isn't available right now. Please contact us to pay." };
  const booking = await db.booking.findUnique({ where: { code }, include: { items: true } });
  if (!booking || booking.userId !== user.id) return { ok: false, error: "Booking not found." };
  if (["CANCELLED", "COMPLETED"].includes(booking.status)) return { ok: false, error: "This booking is closed." };

  const money = bookingMoney(booking);
  if (money.due <= 0) return { ok: false, error: "Nothing is due on this booking." };

  if (booking.status === "PENDING_PAYMENT") {
    // The stock hold may have lapsed — check the equipment is still free before taking money.
    const rentals = booking.items.filter((i) => i.kind === "RENTAL" && i.productId);
    const avail = await availableQuantities(
      rentals.map((i) => i.productId!),
      booking.startDate,
      booking.endDate,
      booking.id,
    );
    if (rentals.some((i) => i.quantity > (avail.get(i.productId!) ?? 0)))
      return { ok: false, error: "Some equipment is no longer available for these dates. Please contact us or make a new booking." };
    await db.booking.update({ where: { id: booking.id }, data: { updatedAt: new Date() } });
  }

  let amount = money.due;
  if (booking.amountPaid === 0 && booking.paymentPlan === "ADVANCE") {
    const settings = await getSettings();
    amount = Math.min(money.due, percentOf(money.rentalCharges, num(settings, "advancePercent", 50)) + booking.deposit);
  }
  try {
    return { ok: true, payment: await createOrderFor(booking.id, booking.code, amount, user) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not start the payment." };
  }
}

export async function verifyPayment(input: { orderId: string; paymentId: string; signature: string }) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please log in again." };
  if (!verifyPaymentSignature(input.orderId, input.paymentId, input.signature))
    return { ok: false, error: "We couldn't verify this payment. If money was deducted, it will be confirmed automatically or refunded." };
  const payment = await db.payment.findUnique({ where: { razorpayOrderId: input.orderId }, include: { booking: true } });
  if (!payment || payment.booking.userId !== user.id) return { ok: false, error: "Payment not found." };
  await settleRazorpayOrder(input.orderId, input.paymentId, user.name);
  return { ok: true, code: payment.booking.code };
}
