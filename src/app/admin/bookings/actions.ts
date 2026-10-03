"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { fail, done, type ActionState } from "@/lib/action-state";
import { bookingMoney, confirmBooking, logEvent, recalcBookingTotals } from "@/lib/booking";
import { priceExtension } from "@/lib/extension";
import { saveUpload, UploadError } from "@/lib/storage";
import { formatDate, parseDateOnly, rentalDays, todayIST } from "@/lib/dates";
import { formatINR, rupeesToPaise } from "@/lib/money";
import { emailLayout, sendEmail, siteUrl } from "@/lib/notify";
import { DISPATCH_CHECKLIST, PAYMENT_METHODS, RETURN_CHECKLIST } from "@/lib/constants";
import { bool, str } from "@/lib/utils";
import { candidateUnits } from "@/lib/units";

async function load(code: string) {
  return db.booking.findUnique({ where: { code }, include: { user: true, items: true, units: true } });
}

function refresh(code: string) {
  revalidatePath(`/admin/bookings/${code}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
}

export async function confirmBookingAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const staff = await requireStaff("bookings");
  const booking = await load(str(form, "code"));
  if (!booking) return fail("Booking not found.");
  if (!["REQUESTED", "PENDING_PAYMENT"].includes(booking.status)) return fail("Only new bookings can be confirmed.");
  await confirmBooking(booking.id, staff.name);
  refresh(booking.code);
  return done("Booking confirmed and invoice number issued.");
}

export async function cancelBookingAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const staff = await requireStaff("bookings");
  const booking = await load(str(form, "code"));
  if (!booking) return fail("Booking not found.");
  if (!["REQUESTED", "PENDING_PAYMENT", "CONFIRMED"].includes(booking.status)) return fail("This booking can no longer be cancelled.");
  const reason = str(form, "reason") || "Cancelled by SNAV";
  await db.$transaction([
    db.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED", cancelReason: reason } }),
    db.bookingUnit.deleteMany({ where: { bookingId: booking.id } }),
  ]);
  await logEvent(booking.id, `Cancelled: ${reason}`, staff.name);
  await sendEmail(
    booking.user.email,
    `Booking ${booking.code} cancelled`,
    emailLayout({
      heading: "Your booking was cancelled",
      paragraphs: [
        `Booking ${booking.code} has been cancelled. Reason: ${reason}.`,
        booking.amountPaid > 0 ? "Any amount paid will be refunded to you — our team will be in touch." : "",
      ].filter(Boolean),
    }),
  );
  refresh(booking.code);
  return done(
    booking.amountPaid > 0
      ? `Cancelled. ${formatINR(booking.amountPaid)} was paid — record the refund below once it's sent.`
      : "Booking cancelled.",
  );
}

export async function assignUnitsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const staff = await requireStaff("bookings");
  const booking = await load(str(form, "code"));
  if (!booking) return fail("Booking not found.");
  if (!["REQUESTED", "PENDING_PAYMENT", "CONFIRMED"].includes(booking.status)) return fail("Units can only be assigned before dispatch.");

  const chosen = form.getAll("unitId").map(String);
  const rentals = booking.items.filter((i) => i.kind === "RENTAL" && i.productId);
  const units = await db.unit.findMany({ where: { id: { in: chosen } } });

  for (const item of rentals) {
    const forItem = units.filter((u) => u.productId === item.productId);
    if (forItem.length > item.quantity) return fail(`Pick at most ${item.quantity} unit(s) for ${item.name}.`);
    const candidates = await candidateUnits(item.productId!, booking.startDate, booking.endDate, booking.id);
    for (const u of forItem) {
      const c = candidates.find((x) => x.id === u.id);
      if (!c) return fail(`${u.serialNumber} is not in the active fleet.`);
      if (c.busyWith) return fail(`${u.serialNumber} is already assigned to ${c.busyWith} for overlapping dates.`);
    }
  }
  if (units.some((u) => !rentals.some((r) => r.productId === u.productId))) return fail("A selected unit doesn't match the booked products.");

  await db.$transaction([
    db.bookingUnit.deleteMany({ where: { bookingId: booking.id } }),
    db.bookingUnit.createMany({ data: units.map((u) => ({ bookingId: booking.id, unitId: u.id })) }),
  ]);
  await logEvent(booking.id, `Units assigned: ${units.map((u) => u.serialNumber).join(", ") || "none"}.`, staff.name);
  refresh(booking.code);
  return done("Units saved.");
}

async function savePhotos(form: FormData): Promise<string[]> {
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 6);
  const keys: string[] = [];
  for (const f of files) keys.push(await saveUpload(f, "inspections", { allowPdf: false }));
  return keys;
}

function checklist(form: FormData, items: string[]) {
  return Object.fromEntries(items.map((item, i) => [item, bool(form, `check_${i}`)]));
}

export async function dispatchAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const staff = await requireStaff("bookings");
  const booking = await load(str(form, "code"));
  if (!booking) return fail("Booking not found.");
  if (booking.status !== "CONFIRMED") return fail("Confirm the booking before dispatching it.");

  const needed = booking.items.filter((i) => i.kind === "RENTAL").reduce((s, i) => s + i.quantity, 0);
  if (booking.units.length < needed) return fail(`Assign all ${needed} unit(s) before dispatch (${booking.units.length} assigned).`);
  if (booking.user.kycStatus !== "VERIFIED" && !bool(form, "overrideKyc"))
    return fail("Customer KYC is not verified. Verify it first, or tick the override box if you've checked ID in person.");
  const due = bookingMoney(booking).due;
  if (due > 0 && !booking.user.payLater && !bool(form, "overridePayment"))
    return fail(`${formatINR(due)} is still due. Record the payment first, or tick the override box to dispatch anyway.`);

  let photos: string[];
  try {
    photos = await savePhotos(form);
  } catch (e) {
    return fail(e instanceof UploadError ? e.message : "Photo upload failed.");
  }
  await db.$transaction([
    db.inspection.create({
      data: {
        bookingId: booking.id,
        stage: "DISPATCH",
        checklist: JSON.stringify(checklist(form, DISPATCH_CHECKLIST)),
        notes: str(form, "notes") || null,
        photos: JSON.stringify(photos),
        createdBy: staff.name,
      },
    }),
    db.booking.update({ where: { id: booking.id }, data: { status: "DISPATCHED", dispatchedAt: new Date() } }),
  ]);
  await logEvent(booking.id, `Dispatched${booking.fulfillment === "PICKUP" ? " (collected from office)" : ""}.`, staff.name);
  await sendEmail(
    booking.user.email,
    `Booking ${booking.code} dispatched`,
    emailLayout({
      heading: booking.fulfillment === "PICKUP" ? "Equipment handed over" : "Your equipment is on its way",
      paragraphs: [`Rental ${booking.code} runs until ${formatDate(booking.endDate)}. Need more time? Request an extension from your booking page.`],
      cta: { label: "View booking", url: siteUrl(`/account/bookings/${booking.code}`) },
    }),
  );
  refresh(booking.code);
  return done("Marked as dispatched.");
}

export async function returnAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const staff = await requireStaff("bookings");
  const booking = await load(str(form, "code"));
  if (!booking) return fail("Booking not found.");
  if (booking.status !== "DISPATCHED") return fail("Only rentals that are out can be marked returned.");

  const returnDate = parseDateOnly(str(form, "returnDate")) ?? todayIST();
  const lateFee = rupeesToPaise(str(form, "lateFee"));
  const damageCharge = rupeesToPaise(str(form, "damageCharge"));
  let photos: string[];
  try {
    photos = await savePhotos(form);
  } catch (e) {
    return fail(e instanceof UploadError ? e.message : "Photo upload failed.");
  }
  await db.$transaction([
    db.inspection.create({
      data: {
        bookingId: booking.id,
        stage: "RETURN",
        checklist: JSON.stringify(checklist(form, RETURN_CHECKLIST)),
        notes: str(form, "notes") || null,
        photos: JSON.stringify(photos),
        createdBy: staff.name,
      },
    }),
    db.booking.update({
      where: { id: booking.id },
      data: { status: "RETURNED", returnedAt: returnDate, lateFee, damageCharge },
    }),
  ]);
  const lateDays = Math.max(0, rentalDays(booking.endDate, returnDate) - 1);
  await logEvent(
    booking.id,
    `Returned on ${formatDate(returnDate)}${lateDays ? ` (${lateDays} day${lateDays > 1 ? "s" : ""} late)` : ""}.${lateFee ? ` Late fee ${formatINR(lateFee)}.` : ""}${damageCharge ? ` Damage charge ${formatINR(damageCharge)}.` : ""}`,
    staff.name,
  );
  refresh(booking.code);
  return done("Marked as returned. Settle the deposit next.");
}

export async function settleDepositAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const staff = await requireStaff("payments");
  const booking = await load(str(form, "code"));
  if (!booking) return fail("Booking not found.");
  if (booking.status !== "RETURNED") return fail("Mark the equipment returned first.");
  const refund = rupeesToPaise(str(form, "refund"));
  const method = str(form, "method");
  if (!(method in PAYMENT_METHODS)) return fail("Choose how the refund was paid.");
  const max = bookingMoney(booking).refundable;
  if (refund > max) return fail(`Refund can't exceed ${formatINR(max)} (what the customer has paid beyond charges).`);

  await db.$transaction([
    ...(refund > 0
      ? [
          db.payment.create({
            data: {
              bookingId: booking.id,
              kind: "REFUND",
              method,
              amount: refund,
              reference: str(form, "reference") || null,
              note: "Deposit refund",
              recordedBy: staff.name,
            },
          }),
        ]
      : []),
    db.booking.update({
      where: { id: booking.id },
      data: { depositRefunded: { increment: refund }, depositStatus: "SETTLED", status: "COMPLETED" },
    }),
  ]);
  await logEvent(booking.id, `Deposit settled. Refunded ${formatINR(refund)}.`, staff.name);
  await sendEmail(
    booking.user.email,
    `Deposit settled for ${booking.code}`,
    emailLayout({
      heading: "Your rental is complete",
      paragraphs: [
        refund > 0 ? `We've refunded ${formatINR(refund)} of your deposit.` : "Your deposit has been settled against the charges on this booking.",
        "Thank you for renting with SNAV.",
      ],
      cta: { label: "View booking", url: siteUrl(`/account/bookings/${booking.code}`) },
    }),
  );
  refresh(booking.code);
  return done("Deposit settled and booking completed.");
}

export async function recordPaymentAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  // Operations staff record cash/UPI collected on delivery; accounts and admins record the rest.
  const staff = await requireStaff("bookings");
  const booking = await load(str(form, "code"));
  if (!booking) return fail("Booking not found.");
  const amount = rupeesToPaise(str(form, "amount"));
  const kind = str(form, "kind") === "REFUND" ? "REFUND" : "PAYMENT";
  const method = str(form, "method");
  if (amount <= 0) return fail("Enter an amount.");
  if (!(method in PAYMENT_METHODS) || method === "RAZORPAY") return fail("Choose the payment method.");

  await db.payment.create({
    data: { bookingId: booking.id, kind, method, amount, reference: str(form, "reference") || null, recordedBy: staff.name },
  });
  await db.booking.update({
    where: { id: booking.id },
    data: kind === "PAYMENT" ? { amountPaid: { increment: amount } } : { depositRefunded: { increment: amount } },
  });
  await logEvent(booking.id, `${kind === "PAYMENT" ? "Payment" : "Refund"} of ${formatINR(amount)} recorded (${PAYMENT_METHODS[method]}).`, staff.name);
  if (kind === "PAYMENT" && ["REQUESTED", "PENDING_PAYMENT"].includes(booking.status) && bool(form, "confirm")) {
    await confirmBooking(booking.id, staff.name);
  }
  refresh(booking.code);
  return done(`${kind === "PAYMENT" ? "Payment" : "Refund"} recorded.`);
}

export async function decideExtensionAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const staff = await requireStaff("bookings");
  const ext = await db.extensionRequest.findUnique({ where: { id: str(form, "extensionId") }, include: { booking: { include: { user: true } } } });
  if (!ext || ext.status !== "PENDING") return fail("Request not found or already handled.");
  const booking = ext.booking;
  const approve = str(form, "decision") === "approve";

  if (!approve) {
    await db.extensionRequest.update({ where: { id: ext.id }, data: { status: "REJECTED" } });
    await logEvent(booking.id, `Extension to ${formatDate(ext.newEndDate)} declined.`, staff.name);
    await sendEmail(
      booking.user.email,
      `Extension for ${booking.code} not possible`,
      emailLayout({
        heading: "We couldn't extend your rental",
        paragraphs: [`Sorry — we can't extend ${booking.code} to ${formatDate(ext.newEndDate)}. Please return the equipment by ${formatDate(booking.endDate)} or contact us.`],
      }),
    );
    refresh(booking.code);
    return done("Extension declined.");
  }

  const price = await priceExtension(booking.id, ext.newEndDate);
  if (!price.ok) return fail(price.error);
  await db.$transaction([
    ...price.items.map((i) =>
      db.bookingItem.update({ where: { id: i.id }, data: { unitAmount: i.unitAmount, amount: i.amount, pricingNote: i.pricingNote, days: i.days } }),
    ),
    db.booking.update({ where: { id: booking.id }, data: { endDate: ext.newEndDate, days: rentalDays(booking.startDate, ext.newEndDate) } }),
    db.extensionRequest.update({ where: { id: ext.id }, data: { status: "APPROVED", amount: price.amount, extraDays: price.extraDays } }),
  ]);
  await recalcBookingTotals(booking.id);
  await logEvent(booking.id, `Extension approved to ${formatDate(ext.newEndDate)} (+${formatINR(price.amount)}).`, staff.name);
  await sendEmail(
    booking.user.email,
    `Extension approved for ${booking.code}`,
    emailLayout({
      heading: "Your rental has been extended",
      paragraphs: [`${booking.code} now ends on ${formatDate(ext.newEndDate)}. ${formatINR(price.amount)} (incl. GST) has been added to your balance.`],
      cta: { label: "Pay balance", url: siteUrl(`/account/bookings/${booking.code}`) },
    }),
  );
  refresh(booking.code);
  return done("Extension approved and booking updated.");
}

export async function saveAdminNotesAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("bookings");
  const code = str(form, "code");
  await db.booking.update({ where: { code }, data: { adminNotes: str(form, "adminNotes") || null } });
  refresh(code);
  return done("Notes saved.");
}
