import type { Quote } from "@/lib/quote";
import { formatINR } from "@/lib/money";

/** Price breakdown shared by the cart and checkout. */
export function QuoteSummary({ quote, showDelivery = false }: { quote: Quote; showDelivery?: boolean }) {
  const gst = quote.cgst + quote.sgst + quote.igst;
  return (
    <dl className="space-y-2 text-sm">
      <Row label="Rental & services" value={formatINR(quote.subtotal)} />
      {quote.discount > 0 ? <Row label={`Discount${quote.couponCode ? ` (${quote.couponCode})` : ""}`} value={`− ${formatINR(quote.discount)}`} accent /> : null}
      {showDelivery ? <Row label="Delivery & collection" value={quote.deliveryFee ? formatINR(quote.deliveryFee) : "Free"} /> : null}
      {quote.interState ? (
        <Row label={`IGST (${quote.gstRate}%)`} value={formatINR(quote.igst)} />
      ) : (
        <Row label={`GST (${quote.gstRate}%)`} value={formatINR(gst)} />
      )}
      <Row label="Refundable deposit" value={formatINR(quote.deposit)} />
      <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
        <dt>Total</dt>
        <dd>{formatINR(quote.total)}</dd>
      </div>
    </dl>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-600">{label}</dt>
      <dd className={accent ? "font-medium text-emerald-700" : "font-medium text-slate-900"}>{value}</dd>
    </div>
  );
}
