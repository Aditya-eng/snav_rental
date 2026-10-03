import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { Logo } from "@/components/logo";
import { bookingForDocument } from "../../access";
import { PrintButton } from "../../print-button";

export const metadata: Metadata = { title: "Rental agreement", robots: { index: false } };

export default async function AgreementPage(props: PageProps<"/documents/agreement/[code]">) {
  const { code } = await props.params;
  const booking = await bookingForDocument(code, `/documents/agreement/${code}`);
  const s = await getSettings();
  const rentals = booking.items.filter((i) => i.kind === "RENTAL");
  const services = booking.items.filter((i) => i.kind === "SERVICE");

  return (
    <div className="mx-auto max-w-3xl px-4">
      <div className="no-print mb-4 flex justify-end">
        <PrintButton />
      </div>
      <article className="bg-white p-8 text-sm leading-6 text-slate-900 shadow-sm print:shadow-none">
        <header className="flex items-start justify-between border-b border-slate-200 pb-4">
          <Logo />
          <div className="text-right">
            <h1 className="text-xl font-bold">Equipment Rental Agreement</h1>
            <p className="text-slate-600">Booking {booking.code}</p>
          </div>
        </header>

        <section className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Owner</h2>
            <p className="font-semibold">{s.legalName}</p>
            <p className="whitespace-pre-line text-slate-700">{s.address}</p>
            {s.gstin ? <p>GSTIN {s.gstin}</p> : null}
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Renter</h2>
            <p className="font-semibold">{booking.billingName}</p>
            <p className="whitespace-pre-line text-slate-700">{booking.billingAddress}, {booking.billingState}</p>
            <p className="text-slate-700">{booking.user.email} · {booking.user.phone}</p>
            {booking.billingGstin ? <p>GSTIN {booking.billingGstin}</p> : null}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rental</h2>
          <p className="mt-1">
            Period: <strong>{formatDate(booking.startDate)}</strong> to <strong>{formatDate(booking.endDate)}</strong> ({booking.days} days, both inclusive).{" "}
            {booking.fulfillment === "DELIVERY" ? `Delivered to: ${booking.deliveryAddress ?? ""} ${booking.deliveryPincode ?? ""}.` : `Collected from our ${booking.city.name} office.`}
          </p>
          <ul className="mt-2 list-disc pl-5">
            {rentals.map((i) => (
              <li key={i.id}>{i.quantity} × {i.name} (deposit {formatINR(i.deposit)})</li>
            ))}
            {services.map((i) => (
              <li key={i.id}>{i.quantity} × {i.name}, {i.days} day{i.days > 1 ? "s" : ""}</li>
            ))}
          </ul>
          <p className="mt-2">Total security deposit: <strong>{formatINR(booking.deposit)}</strong> (refundable as per the terms below).</p>
        </section>

        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Terms</h2>
          <div className="mt-1 whitespace-pre-line text-slate-800">{s.rentalTerms}</div>
        </section>

        <section className="mt-8 rounded-md border border-slate-200 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Electronic acceptance</h2>
          {booking.agreementAcceptedAt ? (
            <p className="mt-1">
              Accepted online by <strong>{booking.agreementName}</strong> on {formatDateTime(booking.agreementAcceptedAt)}
              {booking.agreementIp ? ` from IP ${booking.agreementIp}` : ""}.
            </p>
          ) : (
            <p className="mt-1 text-slate-600">Not yet accepted.</p>
          )}
        </section>
      </article>
    </div>
  );
}
