"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fail, done, type ActionState } from "@/lib/action-state";
import { isValidGstin, isValidPhone, isValidPincode, optStr, str } from "@/lib/utils";
import { saveUpload, UploadError } from "@/lib/storage";
import { formatDate, parseDateOnly } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { priceExtension } from "@/lib/extension";
import { logEvent } from "@/lib/booking";
import { notifyAdmin } from "@/lib/notify";
import { INDIAN_STATES, KYC_DOC_TYPES } from "@/lib/constants";

async function me() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function updateProfile(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await me();
  const name = str(form, "name");
  const phone = str(form, "phone");
  const gstin = optStr(form, "gstin")?.toUpperCase() ?? null;
  const pincode = optStr(form, "pincode");
  const state = optStr(form, "state");
  if (name.length < 2) return fail("Please enter your full name.");
  if (!isValidPhone(phone)) return fail("Please enter a valid 10-digit mobile number.");
  if (gstin && !isValidGstin(gstin)) return fail("That GSTIN doesn't look right.");
  if (pincode && !isValidPincode(pincode)) return fail("Enter a valid 6-digit PIN code.");
  if (state && !(INDIAN_STATES as readonly string[]).includes(state)) return fail("Choose a valid state.");
  await db.user.update({
    where: { id: user.id },
    data: {
      name,
      phone,
      companyName: user.accountType === "BUSINESS" ? optStr(form, "companyName") : null,
      gstin: user.accountType === "BUSINESS" ? gstin : null,
      addressLine: optStr(form, "addressLine"),
      city: optStr(form, "city"),
      state,
      pincode,
    },
  });
  revalidatePath("/account", "layout");
  return done("Profile saved.");
}

export async function uploadKyc(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await me();
  const docType = str(form, "docType");
  const file = form.get("file");
  if (!(docType in KYC_DOC_TYPES)) return fail("Choose the document type.");
  if (!(file instanceof File)) return fail("Choose a file to upload.");
  try {
    const key = await saveUpload(file, "kyc");
    await db.kycDocument.create({ data: { userId: user.id, docType, fileRef: key, fileName: file.name.slice(0, 200) } });
  } catch (e) {
    if (e instanceof UploadError) return fail(e.message);
    console.error(e);
    return fail("Upload failed. Please try again.");
  }
  if (user.kycStatus !== "VERIFIED") {
    await db.user.update({ where: { id: user.id }, data: { kycStatus: "PENDING", kycNote: null } });
    await notifyAdmin(`KYC uploaded by ${user.name}`, [`${user.name} (${user.email}) uploaded a ${KYC_DOC_TYPES[docType]}.`], `/admin/customers/${user.id}`);
  }
  revalidatePath("/account", "layout");
  return done("Document uploaded. We'll review it shortly.");
}

export async function deleteKycDoc(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await me();
  if (user.kycStatus === "VERIFIED") return fail("Verified documents can't be removed. Contact us to update them.");
  await db.kycDocument.deleteMany({ where: { id: str(form, "id"), userId: user.id } });
  const left = await db.kycDocument.count({ where: { userId: user.id } });
  if (left === 0) await db.user.update({ where: { id: user.id }, data: { kycStatus: "NOT_SUBMITTED" } });
  revalidatePath("/account/kyc");
  return done("Document removed.");
}

async function ownBooking(code: string, userId: string) {
  const booking = await db.booking.findUnique({ where: { code } });
  return booking && booking.userId === userId ? booking : null;
}

export async function requestExtension(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await me();
  const booking = await ownBooking(str(form, "code"), user.id);
  if (!booking) return fail("Booking not found.");
  const newEnd = parseDateOnly(str(form, "newEnd"));
  if (!newEnd) return fail("Choose a new end date.");
  if (await db.extensionRequest.findFirst({ where: { bookingId: booking.id, status: "PENDING" } }))
    return fail("You already have an extension request waiting for approval.");
  const price = await priceExtension(booking.id, newEnd);
  if (!price.ok) return fail(price.error);
  await db.extensionRequest.create({
    data: { bookingId: booking.id, newEndDate: newEnd, extraDays: price.extraDays, amount: price.amount },
  });
  await logEvent(booking.id, `Extension requested to ${formatDate(newEnd)} (+${price.extraDays} days, ${formatINR(price.amount)}).`, user.name);
  await notifyAdmin(
    `Extension request on ${booking.code}`,
    [`${user.name} wants to extend to ${formatDate(newEnd)} (+${price.extraDays} days, ${formatINR(price.amount)} incl. GST).`],
    `/admin/bookings/${booking.code}`,
  );
  revalidatePath(`/account/bookings/${booking.code}`);
  return done(`Extension requested: +${price.extraDays} days for ${formatINR(price.amount)} incl. GST. We'll confirm shortly.`);
}

export async function cancelOwnBooking(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await me();
  const booking = await ownBooking(str(form, "code"), user.id);
  if (!booking) return fail("Booking not found.");
  if (!["PENDING_PAYMENT", "REQUESTED"].includes(booking.status) || booking.amountPaid > 0)
    return fail("This booking can't be cancelled online. Please raise a support request and we'll help.");
  await db.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED", cancelReason: "Cancelled by customer" } });
  await logEvent(booking.id, "Cancelled by customer.", user.name);
  await notifyAdmin(`Booking ${booking.code} cancelled by customer`, [`${user.name} cancelled ${booking.code}.`], `/admin/bookings/${booking.code}`);
  revalidatePath(`/account/bookings/${booking.code}`);
  return done("Booking cancelled.");
}

export async function createTicket(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await me();
  const subject = str(form, "subject");
  const body = str(form, "body");
  if (subject.length < 3) return fail("Add a short subject.");
  if (body.length < 5) return fail("Tell us a little more.");
  const code = optStr(form, "bookingCode");
  const booking = code ? await ownBooking(code, user.id) : null;
  const ticket = await db.ticket.create({
    data: {
      userId: user.id,
      bookingId: booking?.id ?? null,
      subject: subject.slice(0, 160),
      messages: { create: { authorName: user.name, body: body.slice(0, 4000) } },
    },
  });
  await notifyAdmin(`Support request: ${subject}`, [`From ${user.name}${booking ? ` about ${booking.code}` : ""}.`, body], `/admin/tickets/${ticket.id}`);
  redirect(`/account/tickets/${ticket.id}`);
}

export async function replyTicket(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await me();
  const ticket = await db.ticket.findUnique({ where: { id: str(form, "ticketId") } });
  if (!ticket || ticket.userId !== user.id) return fail("Request not found.");
  const body = str(form, "body");
  if (body.length < 1) return fail("Write a message.");
  await db.ticket.update({
    where: { id: ticket.id },
    data: { status: "OPEN", messages: { create: { authorName: user.name, body: body.slice(0, 4000) } } },
  });
  await notifyAdmin(`New reply on: ${ticket.subject}`, [body], `/admin/tickets/${ticket.id}`);
  revalidatePath(`/account/tickets/${ticket.id}`);
  return done();
}
