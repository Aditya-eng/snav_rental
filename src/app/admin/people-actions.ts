"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { fail, done, type ActionState } from "@/lib/action-state";
import { bool, str } from "@/lib/utils";
import { emailLayout, sendEmail, siteUrl } from "@/lib/notify";

export async function reviewKycAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("customers");
  const user = await db.user.findUnique({ where: { id: str(form, "userId") } });
  if (!user) return fail("Customer not found.");
  const decision = str(form, "decision");
  if (decision === "verify") {
    await db.user.update({ where: { id: user.id }, data: { kycStatus: "VERIFIED", kycNote: null } });
    await sendEmail(
      user.email,
      "Your KYC is verified",
      emailLayout({ heading: "KYC verified", paragraphs: ["Thanks — your documents are verified. We can now dispatch your rentals without delay."] }),
    );
  } else if (decision === "reject") {
    const note = str(form, "note");
    if (!note) return fail("Tell the customer why (this is emailed to them).");
    await db.user.update({ where: { id: user.id }, data: { kycStatus: "REJECTED", kycNote: note } });
    await sendEmail(
      user.email,
      "Please re-upload your KYC documents",
      emailLayout({
        heading: "We couldn't verify your documents",
        paragraphs: [`Reason: ${note}`, "Please upload clear, valid documents from your account."],
        cta: { label: "Upload KYC", url: siteUrl("/account/kyc") },
      }),
    );
  } else return fail("Choose verify or reject.");
  revalidatePath(`/admin/customers/${user.id}`);
  revalidatePath("/admin/customers");
  return done(decision === "verify" ? "KYC verified." : "KYC rejected and customer notified.");
}

export async function updateCustomerFlagsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("customers");
  const id = str(form, "userId");
  await db.user.update({
    where: { id },
    data: { blocked: bool(form, "blocked"), payLater: bool(form, "payLater"), adminNotes: str(form, "adminNotes") || null },
  });
  revalidatePath(`/admin/customers/${id}`);
  return done("Saved.");
}

export async function setEnquiryStatusAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("enquiries");
  const status = str(form, "status");
  if (!["NEW", "CONTACTED", "CLOSED"].includes(status)) return fail("Invalid status.");
  await db.enquiry.update({ where: { id: str(form, "id") }, data: { status } });
  revalidatePath("/admin/enquiries");
  return done("Updated");
}

export async function staffReplyTicketAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const staff = await requireStaff("tickets");
  const ticket = await db.ticket.findUnique({ where: { id: str(form, "ticketId") }, include: { user: true } });
  if (!ticket) return fail("Ticket not found.");
  const body = str(form, "body");
  const close = bool(form, "close");
  if (!body && !close) return fail("Write a reply.");
  await db.ticket.update({
    where: { id: ticket.id },
    data: {
      status: close ? "CLOSED" : "OPEN",
      ...(body ? { messages: { create: { authorName: staff.name, fromStaff: true, body: body.slice(0, 4000) } } } : {}),
    },
  });
  if (body) {
    await sendEmail(
      ticket.user.email,
      `Re: ${ticket.subject}`,
      emailLayout({ heading: ticket.subject, paragraphs: [body], cta: { label: "View conversation", url: siteUrl(`/account/tickets/${ticket.id}`) } }),
    );
  }
  revalidatePath(`/admin/tickets/${ticket.id}`);
  revalidatePath("/admin/tickets");
  return done(close ? "Reply sent and request closed." : "Reply sent.");
}

export async function reopenTicketAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("tickets");
  const id = str(form, "ticketId");
  await db.ticket.update({ where: { id }, data: { status: "OPEN" } });
  revalidatePath(`/admin/tickets/${id}`);
  return done("Reopened.");
}
