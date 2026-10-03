import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, ScrollText } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { addDays, formatDate, formatDateTime, toDateInput } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { bookingMoney } from "@/lib/booking";
import { razorpayEnabled } from "@/lib/razorpay";
import { getSettings } from "@/lib/settings";
import { Alert, Card, CardHeader, Field, Input, Textarea } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { BookingStatusBadge } from "@/components/status-badge";
import { BookingProgress } from "@/components/booking-progress";
import { BookingItemsTable, BookingMoneySummary } from "@/components/booking-summary";
import { cancelOwnBooking, createTicket, requestExtension } from "../../actions";
import { PayButton } from "./pay-button";

export default async function CustomerBookingPage(props: PageProps<"/account/bookings/[code]">) {
  const { code } = await props.params;
  const sp = await props.searchParams;
  const user = await requireUser(`/account/bookings/${code}`);
  const booking = await db.booking.findUnique({
    where: { code },
    include: {
      items: true,
      city: true,
      extensions: { orderBy: { createdAt: "desc" } },
      events: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!booking || booking.userId !== user.id) notFound();

  const settings = await getSettings();
  const money = bookingMoney(booking);
  const online = razorpayEnabled();
  const open = !["CANCELLED", "COMPLETED"].includes(booking.status);
  const canExtend = ["CONFIRMED", "DISPATCHED"].includes(booking.status);
  const pendingExtension = booking.extensions.find((e) => e.status === "PENDING");
  const canCancel = ["PENDING_PAYMENT", "REQUESTED"].includes(booking.status) && booking.amountPaid === 0;
  const isFirstAdvance = booking.amountPaid === 0 && booking.paymentPlan === "ADVANCE";

  return (
    <div className="space-y-6">
      {sp.placed ? <Alert tone="green">Booking placed! We&apos;ll confirm availability and contact you with payment details.</Alert> : null}
      {sp.paid ? <Alert tone="green">Payment received — thank you. Your booking is confirmed.</Alert> : null}
      {sp.payment === "cancelled" ? <Alert tone="amber">Payment was not completed. Your booking is saved — pay below to confirm it.</Alert> : null}
      {sp.payment === "failed" ? <Alert tone="red">We couldn&apos;t confirm the payment. If money was deducted, it will be reconciled automatically — or contact us.</Alert> : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/account" className="text-sm text-slate-500 hover:text-slate-800">← All bookings</Link>
          <h2 className="mt-1 flex flex-wrap items-center gap-3 text-xl font-bold text-slate-900">
            {booking.code} <BookingStatusBadge status={booking.status} />
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {formatDate(booking.startDate)} – {formatDate(booking.endDate)} · {booking.days} day{booking.days > 1 ? "s" : ""} · placed {formatDateTime(booking.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {booking.invoiceNo ? (
            <a href={`/documents/invoice/${booking.code}`} target="_blank" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <FileText className="size-4" aria-hidden /> Invoice
            </a>
          ) : null}
          <a href={`/documents/agreement/${booking.code}`} target="_blank" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <ScrollText className="size-4" aria-hidden /> Agreement
          </a>
        </div>
      </div>

      {booking.status === "CANCELLED" ? (
        <Alert tone="red">This booking was cancelled{booking.cancelReason ? `: ${booking.cancelReason}` : "."}</Alert>
      ) : (
        <Card className="p-5">
          <BookingProgress status={booking.status} />
        </Card>
      )}

      {open && user.kycStatus !== "VERIFIED" ? (
        <Alert tone="amber">
          We need your KYC verified before dispatch. <Link href="/account/kyc" className="font-semibold underline">Upload documents</Link>
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Equipment & services" />
            <BookingItemsTable items={booking.items} />
          </Card>

          <Card>
            <CardHeader title={booking.fulfillment === "DELIVERY" ? "Delivery" : "Office pickup"} />
            <dl className="grid gap-4 p-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">{booking.fulfillment === "DELIVERY" ? "Site address" : "Pickup from"}</dt>
                <dd className="mt-1 text-slate-900">
                  {booking.fulfillment === "DELIVERY"
                    ? `${booking.deliveryAddress ?? ""}${booking.deliveryPincode ? ` – ${booking.deliveryPincode}` : ""}`
                    : booking.city.officeAddress ?? booking.city.name}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Contact on site</dt>
                <dd className="mt-1 text-slate-900">{booking.contactName} · {booking.contactPhone}</dd>
              </div>
              <div>
                <dt className="text-slate-500">City</dt>
                <dd className="mt-1 text-slate-900">{booking.city.name}, {booking.city.state}</dd>
              </div>
              {booking.customerNotes ? (
                <div>
                  <dt className="text-slate-500">Your notes</dt>
                  <dd className="mt-1 text-slate-900">{booking.customerNotes}</dd>
                </div>
              ) : null}
            </dl>
          </Card>

          {canExtend ? (
            <Card>
              <CardHeader title="Extend this rental" subtitle="Pick a new end date. We'll check availability and confirm the extra charge." />
              <div className="p-5">
                {pendingExtension ? (
                  <Alert tone="amber">
                    Extension to {formatDate(pendingExtension.newEndDate)} (+{pendingExtension.extraDays} days, {formatINR(pendingExtension.amount)}) is awaiting approval.
                  </Alert>
                ) : (
                  <ActionForm action={requestExtension} className="flex flex-wrap items-end gap-3">
                    <input type="hidden" name="code" value={booking.code} />
                    <Field label="New end date">
                      <Input type="date" name="newEnd" min={toDateInput(addDays(booking.endDate, 1))} required />
                    </Field>
                    <SubmitButton pendingText="Checking…">Request extension</SubmitButton>
                  </ActionForm>
                )}
                {booking.extensions.filter((e) => e.status !== "PENDING").length ? (
                  <ul className="mt-4 space-y-1 text-sm text-slate-600">
                    {booking.extensions
                      .filter((e) => e.status !== "PENDING")
                      .map((e) => (
                        <li key={e.id}>
                          Extension to {formatDate(e.newEndDate)} — <span className={e.status === "APPROVED" ? "text-emerald-700" : "text-red-700"}>{e.status.toLowerCase()}</span>
                        </li>
                      ))}
                  </ul>
                ) : null}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Need help with this booking?" subtitle="Early return, changes, issues on site — we'll reply here and by email." />
            <ActionForm action={createTicket} className="space-y-3 p-5">
              <input type="hidden" name="bookingCode" value={booking.code} />
              <Field label="Subject">
                <Input name="subject" defaultValue={`Booking ${booking.code}`} required />
              </Field>
              <Field label="Message">
                <Textarea name="body" rows={3} required />
              </Field>
              <SubmitButton variant="secondary" pendingText="Sending…">Send to support</SubmitButton>
            </ActionForm>
          </Card>

          <Card>
            <CardHeader title="Activity" />
            <ul className="divide-y divide-slate-100 text-sm">
              {booking.events.map((e) => (
                <li key={e.id} className="flex flex-wrap justify-between gap-2 px-5 py-3">
                  <span className="text-slate-800">{e.message}</span>
                  <span className="text-slate-500">{formatDateTime(e.createdAt)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="p-5">
            <h3 className="font-semibold text-slate-900">Payment</h3>
            <div className="mt-4">
              <BookingMoneySummary booking={booking} />
            </div>
            {open && money.due > 0 && booking.status !== "REQUESTED" ? (
              <div className="mt-5">
                {online ? (
                  <PayButton
                    code={booking.code}
                    label={isFirstAdvance ? "Pay advance now" : `Pay ${formatINR(money.due)} now`}
                  />
                ) : settings.bankDetails ? (
                  <div className="rounded-lg bg-slate-50 p-3 text-sm">
                    <p className="font-medium text-slate-900">Pay by bank transfer / UPI</p>
                    <p className="mt-1 whitespace-pre-line text-slate-600">{settings.bankDetails}</p>
                    <p className="mt-2 text-xs text-slate-500">Use {booking.code} as the payment reference.</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">Our team will share payment details with you.</p>
                )}
              </div>
            ) : null}
            {booking.status === "REQUESTED" ? (
              <p className="mt-4 text-sm text-slate-600">We&apos;re confirming availability. You&apos;ll get payment details once confirmed.</p>
            ) : null}
          </Card>

          {canCancel ? (
            <Card className="p-5">
              <h3 className="font-semibold text-slate-900">Cancel booking</h3>
              <p className="mt-1 text-sm text-slate-600">No payment has been made, so you can cancel now at no charge.</p>
              <ActionForm action={cancelOwnBooking} confirm="Cancel this booking?" className="mt-3">
                <input type="hidden" name="code" value={booking.code} />
                <SubmitButton variant="outline" pendingText="Cancelling…">Cancel booking</SubmitButton>
              </ActionForm>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
