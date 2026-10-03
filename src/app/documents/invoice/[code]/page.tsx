import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSettings, num } from "@/lib/settings";
import { formatDate } from "@/lib/dates";
import { formatINRExact } from "@/lib/money";
import { rupeesInWords } from "@/lib/words";
import { Logo } from "@/components/logo";
import { bookingForDocument } from "../../access";
import { PrintButton } from "../../print-button";

export const metadata: Metadata = { title: "Tax invoice", robots: { index: false } };

export default async function InvoicePage(props: PageProps<"/documents/invoice/[code]">) {
  const { code } = await props.params;
  const booking = await bookingForDocument(code, `/documents/invoice/${code}`);
  if (!booking.invoiceNo) notFound();
  const s = await getSettings();
  const rate = num(s, "gstRate", 18);
  const gst = booking.cgst + booking.sgst + booking.igst;
  const invoiceTotal = booking.taxableAmount + gst;

  const lines = [
    ...booking.items.map((i) => ({
      description:
        i.kind === "RENTAL"
          ? `${i.name} — rental ${formatDate(booking.startDate)} to ${formatDate(booking.endDate)} (${i.days} day${i.days > 1 ? "s" : ""}, billed as ${i.pricingNote})`
          : `${i.name} — ${i.days} day${i.days > 1 ? "s" : ""}`,
      sac: i.sacCode ?? s.rentalSac,
      qty: i.quantity,
      rate: i.unitAmount,
      amount: i.amount,
    })),
    ...(booking.deliveryFee
      ? [{ description: `Delivery & collection — ${booking.city.name}`, sac: s.rentalSac, qty: 1, rate: booking.deliveryFee, amount: booking.deliveryFee }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-4xl px-4">
      <div className="no-print mb-4 flex justify-end">
        <PrintButton />
      </div>
      <article className="bg-white p-8 text-sm text-slate-900 shadow-sm print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <div>
            <Logo />
            <p className="mt-3 font-semibold">{s.legalName}</p>
            <p className="max-w-xs whitespace-pre-line text-slate-600">{s.address}</p>
            {s.gstin ? <p className="mt-1">GSTIN: <span className="font-mono">{s.gstin}</span></p> : null}
            {s.pan ? <p>PAN: <span className="font-mono">{s.pan}</span></p> : null}
            <p className="text-slate-600">{[s.phone, s.email].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold tracking-tight">TAX INVOICE</h1>
            <dl className="mt-3 space-y-1">
              <div><dt className="inline text-slate-500">Invoice no: </dt><dd className="inline font-semibold">{booking.invoiceNo}</dd></div>
              <div><dt className="inline text-slate-500">Date: </dt><dd className="inline">{formatDate(booking.invoiceDate ?? booking.createdAt)}</dd></div>
              <div><dt className="inline text-slate-500">Booking: </dt><dd className="inline">{booking.code}</dd></div>
              <div><dt className="inline text-slate-500">Place of supply: </dt><dd className="inline">{booking.billingState}</dd></div>
            </dl>
          </div>
        </header>

        <section className="grid gap-6 border-b border-slate-200 py-6 sm:grid-cols-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bill to</h2>
            <p className="mt-1 font-semibold">{booking.billingName}</p>
            <p className="whitespace-pre-line text-slate-700">{booking.billingAddress}</p>
            <p className="text-slate-700">{booking.billingState}</p>
            {booking.billingGstin ? <p className="mt-1">GSTIN: <span className="font-mono">{booking.billingGstin}</span></p> : null}
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{booking.fulfillment === "DELIVERY" ? "Ship to" : "Collected from"}</h2>
            <p className="mt-1 text-slate-700">
              {booking.fulfillment === "DELIVERY"
                ? `${booking.deliveryAddress ?? ""} ${booking.deliveryPincode ?? ""}`
                : booking.city.officeAddress ?? booking.city.name}
            </p>
            <p className="text-slate-700">Contact: {booking.contactName}, {booking.contactPhone}</p>
          </div>
        </section>

        <table className="mt-6 w-full">
          <thead>
            <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">Description</th>
              <th className="py-2 pr-2">SAC</th>
              <th className="py-2 pr-2 text-right">Qty</th>
              <th className="py-2 pr-2 text-right">Rate</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-slate-100 align-top">
                <td className="py-2 pr-2">{i + 1}</td>
                <td className="py-2 pr-2">{l.description}</td>
                <td className="py-2 pr-2 font-mono text-xs">{l.sac}</td>
                <td className="py-2 pr-2 text-right">{l.qty}</td>
                <td className="py-2 pr-2 text-right">{formatINRExact(l.rate)}</td>
                <td className="py-2 text-right">{formatINRExact(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <dl className="w-full max-w-xs space-y-1">
            {booking.discount ? (
              <div className="flex justify-between"><dt>Discount{booking.couponCode ? ` (${booking.couponCode})` : ""}</dt><dd>− {formatINRExact(booking.discount)}</dd></div>
            ) : null}
            <div className="flex justify-between"><dt>Taxable value</dt><dd>{formatINRExact(booking.taxableAmount)}</dd></div>
            {booking.igst ? (
              <div className="flex justify-between"><dt>IGST @ {rate}%</dt><dd>{formatINRExact(booking.igst)}</dd></div>
            ) : (
              <>
                <div className="flex justify-between"><dt>CGST @ {rate / 2}%</dt><dd>{formatINRExact(booking.cgst)}</dd></div>
                <div className="flex justify-between"><dt>SGST @ {rate / 2}%</dt><dd>{formatINRExact(booking.sgst)}</dd></div>
              </>
            )}
            <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-bold"><dt>Invoice total</dt><dd>{formatINRExact(invoiceTotal)}</dd></div>
          </dl>
        </div>
        <p className="mt-2 text-right text-xs text-slate-600">{rupeesInWords(invoiceTotal)}</p>

        {booking.deposit ? (
          <p className="mt-6 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
            A refundable security deposit of {formatINRExact(booking.deposit)} is collected separately and is not part of the taxable value of this invoice.
          </p>
        ) : null}

        {booking.payments.length ? (
          <section className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payments received</h2>
            <ul className="mt-1 space-y-0.5 text-xs text-slate-700">
              {booking.payments.map((p) => (
                <li key={p.id}>
                  {formatDate(p.createdAt)} · {p.kind === "REFUND" ? "Refund" : "Payment"} · {p.method} · {formatINRExact(p.amount)}
                  {p.razorpayPaymentId ? ` · ${p.razorpayPaymentId}` : p.reference ? ` · ${p.reference}` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {s.bankDetails ? (
          <section className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bank details</h2>
            <p className="mt-1 whitespace-pre-line text-xs text-slate-700">{s.bankDetails}</p>
          </section>
        ) : null}

        <footer className="mt-10 flex items-end justify-between border-t border-slate-200 pt-4 text-xs text-slate-500">
          <p>This is a computer-generated invoice.</p>
          <p className="text-right">For {s.legalName}<br /><br />Authorised signatory</p>
        </footer>
      </article>
    </div>
  );
}
