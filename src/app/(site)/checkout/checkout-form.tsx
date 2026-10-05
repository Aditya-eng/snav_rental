"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart";
import { useQuote } from "@/components/use-quote";
import { QuoteSummary } from "@/components/quote-summary";
import { openRazorpay } from "@/components/razorpay";
import { Alert, Button, Card, CardHeader, Field, Input, Select, Textarea, LinkButton } from "@/components/ui";
import { placeBooking, verifyPayment, type CheckoutDetails } from "../payment-actions";
import { INDIAN_STATES } from "@/lib/constants";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";

type City = { id: string; name: string; state: string; deliveryFee: number; pickupAvailable: boolean; officeAddress: string | null };
type UserInfo = {
  name: string;
  phone: string;
  companyName: string | null;
  gstin: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  kycStatus: string;
  payLater: boolean;
};

export function CheckoutForm({
  user,
  cities,
  terms,
  onlinePayments,
  advancePercent,
}: {
  user: UserInfo;
  cities: City[];
  terms: string;
  onlinePayments: boolean;
  advancePercent: number;
}) {
  const { cart, ready, clear } = useCart();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const defaultCity = cities.find((c) => c.name === user.city) ?? null;
  const [d, setD] = useState<CheckoutDetails>({
    fulfillment: "DELIVERY",
    cityId: defaultCity?.id ?? "",
    deliveryAddress: user.addressLine ?? "",
    deliveryPincode: user.pincode ?? "",
    contactName: user.name,
    contactPhone: user.phone,
    customerNotes: "",
    billingName: user.companyName || user.name,
    billingGstin: user.gstin ?? "",
    billingAddress: [user.addressLine, user.city, user.pincode].filter(Boolean).join(", "),
    billingState: user.state ?? defaultCity?.state ?? "",
    couponCode: "",
    paymentPlan: user.payLater ? "PAY_LATER" : "FULL",
    agreementName: "",
    agreementAccepted: false,
  });
  const [couponInput, setCouponInput] = useState("");
  const set = <K extends keyof CheckoutDetails>(k: K, v: CheckoutDetails[K]) => setD((prev) => ({ ...prev, [k]: v }));

  const city = cities.find((c) => c.id === d.cityId);
  const input = useMemo(
    () =>
      ready && cart.items.length && cart.start
        ? {
            start: cart.start,
            end: cart.end,
            items: cart.items,
            services: cart.services,
            cityId: d.cityId || null,
            fulfillment: d.fulfillment,
            couponCode: d.couponCode || null,
            billingState: d.billingState || null,
          }
        : null,
    [ready, cart, d.cityId, d.fulfillment, d.couponCode, d.billingState],
  );
  const { quote, loading } = useQuote(input);

  if (!ready) return <div className="mt-8 h-64 animate-pulse rounded-xl bg-slate-100" />;
  if (!cart.items.length) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="font-medium text-slate-800">Your booking cart is empty.</p>
        <LinkButton href="/equipment" className="mt-4">Browse equipment</LinkButton>
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await placeBooking({ start: cart.start, end: cart.end, items: cart.items, services: cart.services }, d);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      clear();
      if (!res.payment) {
        router.push(`/account/bookings/${res.code}?placed=1`);
        return;
      }
      try {
        const rz = await openRazorpay(res.payment);
        if (!rz) {
          router.push(`/account/bookings/${res.code}?payment=cancelled`);
          return;
        }
        setMessage("Confirming your payment…");
        const v = await verifyPayment({ orderId: rz.razorpay_order_id, paymentId: rz.razorpay_payment_id, signature: rz.razorpay_signature });
        router.push(`/account/bookings/${res.code}${v.ok ? "?paid=1" : "?payment=failed"}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Payment could not be started.");
        router.push(`/account/bookings/${res.code}?payment=failed`);
      }
    });
  }

  const pickupPossible = !!city?.pickupAvailable;

  return (
    <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0 space-y-6">
        {user.kycStatus !== "VERIFIED" ? (
          <Alert tone="amber">
            Your KYC isn&apos;t verified yet. You can book now, but we need it verified before dispatch —{" "}
            <Link href="/account/kyc" className="font-semibold underline">upload documents</Link> after placing the booking.
          </Alert>
        ) : null}

        <Card>
          <CardHeader title="Delivery or pickup" />
          <div className="space-y-4 p-5">
            <Field label="City">
              <Select
                value={d.cityId}
                onChange={(e) => {
                  const c = cities.find((x) => x.id === e.target.value);
                  setD((prev) => ({
                    ...prev,
                    cityId: e.target.value,
                    fulfillment: prev.fulfillment === "PICKUP" && !c?.pickupAvailable ? "DELIVERY" : prev.fulfillment,
                    billingState: prev.billingState || c?.state || "",
                  }));
                }}
                required
              >
                <option value="">Select your city</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}, {c.state}</option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <OptionCard
                checked={d.fulfillment === "DELIVERY"}
                onSelect={() => set("fulfillment", "DELIVERY")}
                title="Deliver to my site"
                body={city ? (city.deliveryFee ? `${formatINR(city.deliveryFee)} delivery & collection` : "Free delivery") : "Fee depends on city"}
              />
              <OptionCard
                checked={d.fulfillment === "PICKUP"}
                onSelect={() => pickupPossible && set("fulfillment", "PICKUP")}
                disabled={!pickupPossible}
                title="Pick up from office"
                body={pickupPossible ? city?.officeAddress || "Office pickup" : city ? `Not available in ${city.name}` : "Choose a city first"}
              />
            </div>
            {d.fulfillment === "DELIVERY" ? (
              <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                <Field label="Site / delivery address">
                  <Textarea value={d.deliveryAddress} onChange={(e) => set("deliveryAddress", e.target.value)} rows={2} required className="min-h-0" />
                </Field>
                <Field label="PIN code">
                  <Input value={d.deliveryPincode} onChange={(e) => set("deliveryPincode", e.target.value)} inputMode="numeric" maxLength={6} required />
                </Field>
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact person on site">
                <Input value={d.contactName} onChange={(e) => set("contactName", e.target.value)} required />
              </Field>
              <Field label="Contact mobile">
                <Input value={d.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} type="tel" required />
              </Field>
            </div>
            <Field label="Notes for our team (optional)" hint="Site access, preferred delivery time, project details…">
              <Textarea value={d.customerNotes} onChange={(e) => set("customerNotes", e.target.value)} rows={2} className="min-h-0" />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Billing details" subtitle="Shown on your GST invoice." />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Billing name (person or company)">
              <Input value={d.billingName} onChange={(e) => set("billingName", e.target.value)} required />
            </Field>
            <Field label="GSTIN (optional)">
              <Input value={d.billingGstin} onChange={(e) => set("billingGstin", e.target.value.toUpperCase())} maxLength={15} />
            </Field>
            <Field label="Billing address" className="sm:col-span-2">
              <Textarea value={d.billingAddress} onChange={(e) => set("billingAddress", e.target.value)} rows={2} required className="min-h-0" />
            </Field>
            <Field label="State">
              <Select value={d.billingState} onChange={(e) => set("billingState", e.target.value)} required>
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Payment" />
          <div className="space-y-3 p-5">
            {onlinePayments ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <OptionCard
                  checked={d.paymentPlan === "FULL"}
                  onSelect={() => set("paymentPlan", "FULL")}
                  title="Pay in full"
                  body={quote ? formatINR(quote.total) : "Total incl. deposit"}
                />
                <OptionCard
                  checked={d.paymentPlan === "ADVANCE"}
                  onSelect={() => set("paymentPlan", "ADVANCE")}
                  title={`Pay ${advancePercent}% advance + deposit`}
                  body={quote ? `${formatINR(quote.advanceAmount)} now, balance before dispatch` : "Balance before dispatch"}
                />
                {user.payLater ? (
                  <OptionCard
                    checked={d.paymentPlan === "PAY_LATER"}
                    onSelect={() => set("paymentPlan", "PAY_LATER")}
                    title="Pay later (credit account)"
                    body="Invoice raised on your account terms"
                  />
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                We&apos;ll confirm availability and send payment details (UPI / bank transfer). Your booking is held while we confirm.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Rental agreement" />
          <div className="space-y-4 p-5">
            <div className="max-h-56 overflow-y-auto whitespace-pre-line rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">{terms}</div>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-orange-600"
                checked={d.agreementAccepted}
                onChange={(e) => set("agreementAccepted", e.target.checked)}
                required
              />
              <span>
                I am 18 or older, and I have read and agree to the rental terms above and the{" "}
                <Link href="/refund-policy" target="_blank" className="font-medium text-orange-700">cancellation &amp; refund policy</Link>.
              </span>
            </label>
            <Field label="Type your full name to sign">
              <Input value={d.agreementName} onChange={(e) => set("agreementName", e.target.value)} required placeholder={user.name} />
            </Field>
          </div>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-slate-900">Order summary</h2>
          <p className="mt-1 text-sm text-slate-500">
            {cart.start} → {cart.end} · <Link href="/cart" className="font-medium text-orange-700">Edit</Link>
          </p>
          {quote ? (
            <ul className="mt-4 space-y-2 border-b border-slate-100 pb-4 text-sm">
              {quote.lines.map((l) => (
                <li key={(l.productId ?? l.serviceId)!} className="flex justify-between gap-3">
                  <span className="text-slate-700">
                    {l.quantity} × {l.name}
                    <span className="block text-xs text-slate-500">{l.pricingNote}</span>
                  </span>
                  <span className="font-medium text-slate-900">{formatINR(l.amount)}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-4 flex gap-2">
            <Input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Coupon code" aria-label="Coupon code" />
            <Button type="button" variant="outline" onClick={() => set("couponCode", couponInput.trim())}>Apply</Button>
          </div>
          {quote?.couponMessage && d.couponCode ? (
            <p className={cn("mt-2 text-xs", quote.couponCode ? "text-emerald-700" : "text-red-600")}>{quote.couponMessage}</p>
          ) : null}

          <div className={cn("mt-4", loading && "opacity-60")}>{quote ? <QuoteSummary quote={quote} showDelivery /> : null}</div>

          {quote && !quote.ok ? (
            <Alert tone="red" className="mt-4">
              <ul className="list-disc space-y-1 pl-4">
                {quote.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          {error ? <Alert tone="red" className="mt-4">{error}</Alert> : null}
          {message ? <Alert tone="blue" className="mt-4">{message}</Alert> : null}

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={pending || loading || !quote?.ok}>
            {pending ? "Placing booking…" : onlinePayments && d.paymentPlan !== "PAY_LATER" ? "Place booking & pay" : "Place booking request"}
          </Button>
          <p className="mt-3 text-center text-xs text-slate-500">The deposit is refunded after the equipment is returned and inspected.</p>
        </Card>
      </aside>
    </form>
  );
}

function OptionCard({
  checked,
  onSelect,
  title,
  body,
  disabled,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  body: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={checked}
      className={cn(
        "rounded-lg border p-4 text-left transition",
        checked ? "border-orange-500 bg-orange-50 ring-2 ring-orange-500/20" : "border-slate-200 bg-white hover:border-slate-300",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span className="block font-semibold text-slate-900">{title}</span>
      <span className="mt-1 block text-sm text-slate-600">{body}</span>
    </button>
  );
}
