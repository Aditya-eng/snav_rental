import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, MessageCircle, ScrollText } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { bookingMoney } from "@/lib/booking";
import { candidateUnits } from "@/lib/units";
import { formatDate, formatDateTime, rentalDays, todayIST, toDateInput } from "@/lib/dates";
import { formatINR, paiseToRupees } from "@/lib/money";
import { getSettings, num } from "@/lib/settings";
import { parseJson, whatsappLink } from "@/lib/utils";
import { DISPATCH_CHECKLIST, PAYMENT_METHODS, RETURN_CHECKLIST } from "@/lib/constants";
import { Alert, Card, CardHeader, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { BookingStatusBadge, KycBadge } from "@/components/status-badge";
import { BookingProgress } from "@/components/booking-progress";
import { BookingItemsTable, BookingMoneySummary } from "@/components/booking-summary";
import {
  assignUnitsAction,
  cancelBookingAction,
  confirmBookingAction,
  decideExtensionAction,
  dispatchAction,
  recordPaymentAction,
  returnAction,
  saveAdminNotesAction,
  settleDepositAction,
} from "../actions";

export default async function AdminBookingPage(props: PageProps<"/admin/bookings/[code]">) {
  const staff = await requireStaff("bookings");
  const { code } = await props.params;
  const booking = await db.booking.findUnique({
    where: { code },
    include: {
      user: true,
      city: true,
      items: { include: { product: true } },
      units: { include: { unit: true } },
      payments: { orderBy: { createdAt: "asc" } },
      inspections: { orderBy: { createdAt: "asc" } },
      extensions: { orderBy: { createdAt: "desc" } },
      events: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!booking) notFound();

  const settings = await getSettings();
  const money = bookingMoney(booking);
  const rentals = booking.items.filter((i) => i.kind === "RENTAL" && i.productId);
  const assigned = new Set(booking.units.map((u) => u.unitId));
  const canAssign = ["REQUESTED", "PENDING_PAYMENT", "CONFIRMED"].includes(booking.status);
  const candidates = canAssign
    ? await Promise.all(rentals.map(async (i) => ({ item: i, units: await candidateUnits(i.productId!, booking.startDate, booking.endDate, booking.id) })))
    : [];

  const today = todayIST();
  const lateDays = Math.max(0, rentalDays(booking.endDate, today) - 1);
  const suggestedLate = Math.round(
    rentals.reduce((s, i) => s + (i.product?.dailyRate ?? 0) * i.quantity, 0) * lateDays * num(settings, "lateFeeMultiplier", 1),
  );
  const needed = rentals.reduce((s, i) => s + i.quantity, 0);
  const pendingExt = booking.extensions.filter((e) => e.status === "PENDING");
  const phone = booking.contactPhone || booking.user.phone;
  const waMessages = [
    { label: "Confirmation", text: `Hi ${booking.user.name}, your SNAV booking ${booking.code} (${formatDate(booking.startDate)} – ${formatDate(booking.endDate)}) is confirmed.` },
    { label: "Payment due", text: `Hi ${booking.user.name}, ${formatINR(Math.max(0, money.due))} is due on SNAV booking ${booking.code}. You can pay from your account page.` },
    { label: "Return reminder", text: `Hi ${booking.user.name}, a reminder that SNAV rental ${booking.code} ends on ${formatDate(booking.endDate)}. Please keep the equipment ready for collection.` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/bookings" className="text-sm text-slate-500 hover:text-slate-800">← Bookings</Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-3 text-2xl font-bold text-slate-900">
            {booking.code} <BookingStatusBadge status={booking.status} />
            {booking.status === "DISPATCHED" && booking.endDate < today ? <span className="text-sm font-semibold text-red-700">Overdue {lateDays} day{lateDays > 1 ? "s" : ""}</span> : null}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {formatDate(booking.startDate)} – {formatDate(booking.endDate)} · {booking.days} days · placed {formatDateTime(booking.createdAt)} · plan: {booking.paymentPlan.replace("_", " ").toLowerCase()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {booking.invoiceNo ? (
            <a href={`/documents/invoice/${booking.code}`} target="_blank" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <FileText className="size-4" aria-hidden /> Invoice {booking.invoiceNo}
            </a>
          ) : null}
          <a href={`/documents/agreement/${booking.code}`} target="_blank" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <ScrollText className="size-4" aria-hidden /> Agreement
          </a>
        </div>
      </div>

      {booking.status !== "CANCELLED" ? (
        <Card className="p-4"><BookingProgress status={booking.status} /></Card>
      ) : (
        <Alert tone="red">Cancelled{booking.cancelReason ? `: ${booking.cancelReason}` : ""}</Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Customer" action={<KycBadge status={booking.user.kycStatus} />} />
            <div className="grid gap-4 p-5 text-sm sm:grid-cols-2">
              <div>
                <Link href={`/admin/customers/${booking.user.id}`} className="font-semibold text-orange-700">{booking.user.name}</Link>
                <p className="text-slate-600">{booking.user.email} · {booking.user.phone}</p>
                <p className="text-slate-600">{booking.user.accountType === "BUSINESS" ? `Business${booking.user.companyName ? ` — ${booking.user.companyName}` : ""}` : "Individual"}</p>
                {booking.user.blocked ? <p className="mt-1 font-semibold text-red-700">Blocked customer</p> : null}
              </div>
              <div>
                <p className="text-slate-500">WhatsApp {phone}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {waMessages.map((m) => (
                    <a key={m.label} href={whatsappLink(phone, m.text)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100">
                      <MessageCircle className="size-3.5" aria-hidden /> {m.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Items" />
            <BookingItemsTable items={booking.items} />
            {booking.units.length ? (
              <p className="border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
                Assigned units: {booking.units.map((u) => u.unit.serialNumber).join(", ")}
              </p>
            ) : null}
          </Card>

          <Card>
            <CardHeader title={booking.fulfillment === "DELIVERY" ? "Delivery" : "Office pickup"} />
            <dl className="grid gap-4 p-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">{booking.fulfillment === "DELIVERY" ? "Site address" : "Pickup office"}</dt>
                <dd className="mt-1">{booking.fulfillment === "DELIVERY" ? `${booking.deliveryAddress ?? ""} – ${booking.deliveryPincode ?? ""}` : booking.city.officeAddress}</dd>
              </div>
              <div>
                <dt className="text-slate-500">City / contact</dt>
                <dd className="mt-1">{booking.city.name}, {booking.city.state} · {booking.contactName} ({booking.contactPhone})</dd>
              </div>
              <div>
                <dt className="text-slate-500">Billing</dt>
                <dd className="mt-1">{booking.billingName}{booking.billingGstin ? ` · GSTIN ${booking.billingGstin}` : ""}<br />{booking.billingAddress}, {booking.billingState}</dd>
              </div>
              {booking.customerNotes ? (
                <div>
                  <dt className="text-slate-500">Customer notes</dt>
                  <dd className="mt-1">{booking.customerNotes}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-slate-500">Agreement</dt>
                <dd className="mt-1">{booking.agreementName ? `Signed by ${booking.agreementName}, ${formatDateTime(booking.agreementAcceptedAt)}` : "Not signed"}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Payments" />
            <div className="grid gap-6 p-5 lg:grid-cols-2">
              <BookingMoneySummary booking={booking} />
              <ul className="space-y-2 text-sm">
                {booking.payments.length === 0 ? <li className="text-slate-500">No payments yet.</li> : null}
                {booking.payments.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
                    <span>
                      <span className={p.kind === "REFUND" ? "font-medium text-red-700" : "font-medium text-slate-900"}>{p.kind === "REFUND" ? "Refund" : "Payment"}</span>{" "}
                      <span className="text-slate-500">· {PAYMENT_METHODS[p.method] ?? p.method} · {formatDateTime(p.createdAt)}</span>
                      {p.status !== "PAID" ? <span className="ml-1 text-xs text-amber-700">({p.status.toLowerCase()})</span> : null}
                      {p.reference || p.razorpayPaymentId ? <span className="block text-xs text-slate-500">{p.razorpayPaymentId ?? p.reference}</span> : null}
                    </span>
                    <span className="font-semibold">{formatINR(p.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {booking.inspections.length ? (
            <Card>
              <CardHeader title="Inspections" />
              <div className="divide-y divide-slate-100">
                {booking.inspections.map((ins) => {
                  const list = parseJson<Record<string, boolean>>(ins.checklist, {});
                  const photos = parseJson<string[]>(ins.photos, []);
                  return (
                    <div key={ins.id} className="p-5 text-sm">
                      <p className="font-semibold text-slate-900">{ins.stage === "DISPATCH" ? "Dispatch check" : "Return check"} · {formatDateTime(ins.createdAt)} · {ins.createdBy}</p>
                      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                        {Object.entries(list).map(([k, v]) => (
                          <li key={k} className={v ? "text-emerald-700" : "text-red-700"}>{v ? "✓" : "✗"} {k}</li>
                        ))}
                      </ul>
                      {ins.notes ? <p className="mt-2 text-slate-700">{ins.notes}</p> : null}
                      {photos.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {photos.map((_, i) => (
                            <a key={i} href={`/api/files/inspection/${ins.id}/${i}`} target="_blank">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={`/api/files/inspection/${ins.id}/${i}`} alt={`Inspection photo ${i + 1}`} className="size-24 rounded-md border border-slate-200 object-cover" />
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Activity log" />
            <ul className="divide-y divide-slate-100 text-sm">
              {booking.events.map((e) => (
                <li key={e.id} className="flex flex-wrap justify-between gap-2 px-5 py-2.5">
                  <span>{e.message} {e.actor ? <span className="text-slate-500">— {e.actor}</span> : null}</span>
                  <span className="text-slate-500">{formatDateTime(e.createdAt)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <aside className="space-y-6">
          {["REQUESTED", "PENDING_PAYMENT"].includes(booking.status) ? (
            <Card className="p-5">
              <h2 className="font-semibold text-slate-900">New booking</h2>
              <p className="mt-1 text-sm text-slate-600">
                {booking.status === "PENDING_PAYMENT"
                  ? "Waiting for online payment. Confirming now issues the invoice without payment."
                  : "Check availability, then confirm to issue the invoice and notify the customer."}
              </p>
              <ActionForm action={confirmBookingAction} className="mt-3">
                <input type="hidden" name="code" value={booking.code} />
                <SubmitButton className="w-full" pendingText="Confirming…">Confirm booking</SubmitButton>
              </ActionForm>
            </Card>
          ) : null}

          {pendingExt.map((ext) => (
            <Card key={ext.id} className="border-amber-300 p-5">
              <h2 className="font-semibold text-slate-900">Extension request</h2>
              <p className="mt-1 text-sm text-slate-600">
                New end date {formatDate(ext.newEndDate)} (+{ext.extraDays} days). Quoted {formatINR(ext.amount)} incl. GST — re-priced on approval.
              </p>
              <ActionForm action={decideExtensionAction} className="mt-3 flex gap-2">
                <input type="hidden" name="extensionId" value={ext.id} />
                <SubmitButton name="decision" value="approve" pendingText="Saving…">Approve</SubmitButton>
                <SubmitButton name="decision" value="reject" variant="outline" pendingText="Saving…">Decline</SubmitButton>
              </ActionForm>
            </Card>
          ))}

          {canAssign && rentals.length ? (
            <Card className="p-5">
              <h2 className="font-semibold text-slate-900">Assign units</h2>
              <p className="mt-1 text-sm text-slate-600">{booking.units.length} of {needed} assigned.</p>
              <ActionForm action={assignUnitsAction} className="mt-3 space-y-4">
                <input type="hidden" name="code" value={booking.code} />
                {candidates.map(({ item, units }) => (
                  <fieldset key={item.id}>
                    <legend className="text-sm font-medium text-slate-800">{item.name} × {item.quantity}</legend>
                    {units.length === 0 ? <p className="mt-1 text-sm text-red-700">No units in the fleet. Add serial numbers under Fleet.</p> : null}
                    <div className="mt-1 space-y-1">
                      {units.map((u) => (
                        <Checkbox
                          key={u.id}
                          name="unitId"
                          value={u.id}
                          defaultChecked={assigned.has(u.id)}
                          disabled={!!u.busyWith}
                          label={
                            <span>
                              <span className="font-mono">{u.serialNumber}</span> <span className="text-slate-500">· {u.condition}</span>
                              {u.busyWith ? <span className="text-red-700"> · on {u.busyWith}</span> : null}
                            </span>
                          }
                        />
                      ))}
                    </div>
                  </fieldset>
                ))}
                <SubmitButton variant="secondary" pendingText="Saving…">Save units</SubmitButton>
              </ActionForm>
            </Card>
          ) : null}

          {booking.status === "CONFIRMED" ? (
            <Card className="p-5">
              <h2 className="font-semibold text-slate-900">{booking.fulfillment === "PICKUP" ? "Hand over to customer" : "Dispatch"}</h2>
              <ActionForm action={dispatchAction} className="mt-3 space-y-3">
                <input type="hidden" name="code" value={booking.code} />
                <div className="space-y-1">
                  {DISPATCH_CHECKLIST.map((item, i) => (
                    <Checkbox key={item} name={`check_${i}`} label={item} />
                  ))}
                </div>
                <Field label="Notes">
                  <Textarea name="notes" rows={2} className="min-h-0" placeholder="Firmware, battery health, accessories…" />
                </Field>
                <Field label="Photos (up to 6)">
                  <Input type="file" name="photos" accept="image/*" multiple className="py-1.5" />
                </Field>
                {booking.user.kycStatus !== "VERIFIED" ? <Checkbox name="overrideKyc" label="KYC not verified — I've checked ID in person" className="text-red-700" /> : null}
                {money.due > 0 && !booking.user.payLater ? <Checkbox name="overridePayment" label={`Dispatch with ${formatINR(money.due)} still due`} className="text-red-700" /> : null}
                <SubmitButton className="w-full" pendingText="Saving…">Mark dispatched</SubmitButton>
              </ActionForm>
            </Card>
          ) : null}

          {booking.status === "DISPATCHED" ? (
            <Card className="p-5">
              <h2 className="font-semibold text-slate-900">Receive return</h2>
              <ActionForm action={returnAction} className="mt-3 space-y-3">
                <input type="hidden" name="code" value={booking.code} />
                <Field label="Returned on">
                  <Input type="date" name="returnDate" defaultValue={toDateInput(today)} />
                </Field>
                <div className="space-y-1">
                  {RETURN_CHECKLIST.map((item, i) => (
                    <Checkbox key={item} name={`check_${i}`} label={item} />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Late fee (₹)" hint={lateDays ? `${lateDays} day(s) late; suggested ${formatINR(suggestedLate)}` : "On time"}>
                    <Input name="lateFee" inputMode="decimal" defaultValue={paiseToRupees(suggestedLate)} />
                  </Field>
                  <Field label="Damage / missing (₹)">
                    <Input name="damageCharge" inputMode="decimal" defaultValue="0" />
                  </Field>
                </div>
                <Field label="Notes">
                  <Textarea name="notes" rows={2} className="min-h-0" />
                </Field>
                <Field label="Photos (up to 6)">
                  <Input type="file" name="photos" accept="image/*" multiple className="py-1.5" />
                </Field>
                <SubmitButton className="w-full" pendingText="Saving…">Mark returned</SubmitButton>
              </ActionForm>
            </Card>
          ) : null}

          {booking.status === "RETURNED" && canAccess(staff.role, "payments") ? (
            <Card className="p-5">
              <h2 className="font-semibold text-slate-900">Settle deposit</h2>
              <p className="mt-1 text-sm text-slate-600">
                Customer paid {formatINR(money.netPaid)}; charges come to {formatINR(money.rentalCharges + money.extras)}. Refundable: <strong>{formatINR(money.refundable)}</strong>.
              </p>
              <ActionForm action={settleDepositAction} className="mt-3 space-y-3">
                <input type="hidden" name="code" value={booking.code} />
                <Field label="Refund amount (₹)">
                  <Input name="refund" inputMode="decimal" defaultValue={paiseToRupees(money.refundable)} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Method">
                    <Select name="method" defaultValue="BANK">
                      {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Reference">
                    <Input name="reference" placeholder="UTR / txn id" />
                  </Field>
                </div>
                <SubmitButton className="w-full" pendingText="Saving…">Settle & complete</SubmitButton>
              </ActionForm>
            </Card>
          ) : null}

          <Card className="p-5">
            <h2 className="font-semibold text-slate-900">Record payment or refund</h2>
            <p className="mt-1 text-sm text-slate-600">For cash, UPI, bank transfer or cheque. Online payments are recorded automatically.</p>
            <ActionForm action={recordPaymentAction} resetOnSuccess className="mt-3 space-y-3">
              <input type="hidden" name="code" value={booking.code} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type">
                  <Select name="kind" defaultValue="PAYMENT">
                    <option value="PAYMENT">Payment received</option>
                    <option value="REFUND">Refund sent</option>
                  </Select>
                </Field>
                <Field label="Amount (₹)">
                  <Input name="amount" inputMode="decimal" defaultValue={money.due > 0 ? paiseToRupees(money.due) : ""} required />
                </Field>
                <Field label="Method">
                  <Select name="method" defaultValue="UPI">
                    {Object.entries(PAYMENT_METHODS)
                      .filter(([k]) => k !== "RAZORPAY")
                      .map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                  </Select>
                </Field>
                <Field label="Reference">
                  <Input name="reference" placeholder="UTR / cheque no." />
                </Field>
              </div>
              {["REQUESTED", "PENDING_PAYMENT"].includes(booking.status) ? <Checkbox name="confirm" defaultChecked label="Also confirm the booking" /> : null}
              <SubmitButton variant="secondary" className="w-full" pendingText="Saving…">Record</SubmitButton>
            </ActionForm>
          </Card>

          {["REQUESTED", "PENDING_PAYMENT", "CONFIRMED"].includes(booking.status) ? (
            <Card className="p-5">
              <h2 className="font-semibold text-slate-900">Cancel booking</h2>
              <ActionForm action={cancelBookingAction} confirm="Cancel this booking? The customer will be emailed." className="mt-3 space-y-3">
                <input type="hidden" name="code" value={booking.code} />
                <Field label="Reason (sent to customer)">
                  <Input name="reason" placeholder="e.g. Equipment unavailable" />
                </Field>
                <SubmitButton variant="danger" pendingText="Cancelling…">Cancel booking</SubmitButton>
              </ActionForm>
            </Card>
          ) : null}

          <Card className="p-5">
            <h2 className="font-semibold text-slate-900">Internal notes</h2>
            <ActionForm action={saveAdminNotesAction} className="mt-3 space-y-3">
              <input type="hidden" name="code" value={booking.code} />
              <Textarea name="adminNotes" defaultValue={booking.adminNotes ?? ""} rows={3} aria-label="Internal notes" />
              <SubmitButton variant="outline" size="sm" pendingText="Saving…">Save notes</SubmitButton>
            </ActionForm>
          </Card>
        </aside>
      </div>
    </div>
  );
}
