import type { Booking, BookingItem } from "@prisma/client";
import { bookingMoney } from "@/lib/booking";
import { formatINR } from "@/lib/money";
import { Table } from "./ui";

export function BookingItemsTable({ items }: { items: BookingItem[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Period</th>
          <th className="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        {items.map((i) => (
          <tr key={i.id}>
            <td>
              <span className="font-medium text-slate-900">{i.name}</span>
              {i.kind === "SERVICE" ? <span className="ml-2 text-xs text-slate-500">service</span> : null}
            </td>
            <td>{i.quantity}</td>
            <td className="text-slate-600">
              {i.days} day{i.days > 1 ? "s" : ""}
              <span className="block text-xs text-slate-500">billed as {i.pricingNote}</span>
            </td>
            <td className="text-right font-medium">{formatINR(i.amount)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export function BookingMoneySummary({ booking }: { booking: Booking }) {
  const m = bookingMoney(booking);
  const rows: [string, number, string?][] = [["Rental & services", booking.subtotal]];
  if (booking.discount) rows.push([`Discount${booking.couponCode ? ` (${booking.couponCode})` : ""}`, -booking.discount, "text-emerald-700"]);
  if (booking.deliveryFee) rows.push(["Delivery & collection", booking.deliveryFee]);
  if (booking.igst) rows.push(["IGST", booking.igst]);
  else {
    rows.push(["CGST", booking.cgst]);
    rows.push(["SGST", booking.sgst]);
  }
  rows.push(["Refundable deposit", booking.deposit]);
  if (booking.lateFee) rows.push(["Late return fee", booking.lateFee, "text-red-700"]);
  if (booking.damageCharge) rows.push(["Damage / missing items", booking.damageCharge, "text-red-700"]);

  return (
    <dl className="space-y-2 text-sm">
      {rows.map(([label, value, cls]) => (
        <div key={label} className="flex justify-between gap-4">
          <dt className="text-slate-600">{label}</dt>
          <dd className={cls ?? "text-slate-900"}>{value < 0 ? `− ${formatINR(-value)}` : formatINR(value)}</dd>
        </div>
      ))}
      <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
        <dt>Total</dt>
        <dd>{formatINR(m.grandTotal)}</dd>
      </div>
      <div className="flex justify-between text-slate-600">
        <dt>Paid</dt>
        <dd>{formatINR(booking.amountPaid)}</dd>
      </div>
      {booking.depositRefunded ? (
        <div className="flex justify-between text-slate-600">
          <dt>Refunded</dt>
          <dd>− {formatINR(booking.depositRefunded)}</dd>
        </div>
      ) : null}
      {booking.status !== "CANCELLED" ? (
        <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
          <dt>{m.due >= 0 ? "Balance due" : "Credit / refund due to customer"}</dt>
          <dd className={m.due > 0 ? "text-orange-700" : "text-slate-900"}>{formatINR(Math.abs(m.due))}</dd>
        </div>
      ) : null}
    </dl>
  );
}
