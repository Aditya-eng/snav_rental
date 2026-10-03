"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { bestRentalPrice } from "@/lib/pricing";
import { formatINR } from "@/lib/money";
import { checkAvailability } from "@/app/(site)/actions";
import { useCart } from "./cart";
import { Alert, Button } from "./ui";

type Props = {
  product: { id: string; name: string; dailyRate: number; weeklyRate: number; monthlyRate: number; deposit: number };
  minStart: string;
  gstRate: number;
};

function rentalDayCount(start: string, end: string) {
  if (!start || !end) return 0;
  const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Number.isFinite(ms) ? Math.round(ms / 86_400_000) + 1 : 0;
}

export function BookingWidget({ product, minStart, gstRate }: Props) {
  const { cart, setDates, addItem, ready } = useCart();
  const router = useRouter();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [qty, setQty] = useState(1);
  const [available, setAvailable] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);

  // Default to the dates already in the cart so all items share one rental period.
  useEffect(() => {
    if (ready && cart.start && cart.end && !start && !end) {
      setStart(cart.start >= minStart ? cart.start : "");
      setEnd(cart.start >= minStart ? cart.end : "");
    }
  }, [ready, cart.start, cart.end, minStart, start, end]);

  const days = rentalDayCount(start, end);
  const validRange = days >= 1 && start >= minStart;
  const price = useMemo(() => (validRange ? bestRentalPrice(days, product) : null), [validRange, days, product]);

  useEffect(() => {
    if (!validRange) {
      setAvailable(null);
      return;
    }
    let cancelled = false;
    setChecking(true);
    const t = setTimeout(async () => {
      const res = await checkAvailability(product.id, start, end);
      if (!cancelled) {
        setAvailable(res.available);
        setChecking(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [validRange, start, end, product.id]);

  const datesDiffer = ready && cart.items.length > 0 && cart.start && (cart.start !== start || cart.end !== end);
  const tooMany = available !== null && qty > available;

  function add() {
    if (!validRange) return;
    setDates(start, end);
    addItem(product.id, qty);
    router.push("/cart");
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Start date</span>
          <input
            type="date"
            min={minStart}
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              if (end && e.target.value > end) setEnd(e.target.value);
            }}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">End date</span>
          <input
            type="date"
            min={start || minStart}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </label>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Quantity</span>
        <div className="inline-flex items-center rounded-lg border border-slate-300">
          <button type="button" className="inline-flex size-9 items-center justify-center text-slate-700 disabled:opacity-40" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease quantity">
            <Minus className="size-4" />
          </button>
          <span className="w-10 text-center text-sm font-semibold" aria-live="polite">{qty}</span>
          <button type="button" className="inline-flex size-9 items-center justify-center text-slate-700" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="Increase quantity">
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      {price ? (
        <div className="rounded-lg bg-slate-50 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">{days} day{days > 1 ? "s" : ""} · billed as {price.note}</span>
            <span className="font-semibold text-slate-900">{formatINR(price.amount * qty)}</span>
          </div>
          <div className="mt-1 flex justify-between text-slate-500">
            <span>GST ({gstRate}%)</span>
            <span>{formatINR(Math.round((price.amount * qty * gstRate) / 100))}</span>
          </div>
          <div className="mt-1 flex justify-between text-slate-500">
            <span>Refundable deposit</span>
            <span>{formatINR(product.deposit * qty)}</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Delivery fee, if any, is added at checkout.</p>
        </div>
      ) : (
        <p className="text-sm text-slate-500">Choose dates to see the price for your rental.</p>
      )}

      {validRange ? (
        checking ? (
          <p className="text-sm text-slate-500">Checking availability…</p>
        ) : available !== null ? (
          available === 0 ? (
            <Alert tone="red">Fully booked for these dates. Try other dates or <a className="font-semibold underline" href="/contact">contact us</a>.</Alert>
          ) : tooMany ? (
            <Alert tone="amber">Only {available} available for these dates.</Alert>
          ) : (
            <p className="text-sm font-medium text-emerald-700">✓ Available for your dates</p>
          )
        ) : null
      ) : start && start < minStart ? (
        <Alert tone="amber">The earliest start date is {minStart}.</Alert>
      ) : null}

      {datesDiffer && validRange ? (
        <p className="text-xs text-amber-700">Your booking cart already has items for {cart.start} → {cart.end}. Adding this will move the whole booking to the new dates.</p>
      ) : null}

      <Button type="button" size="lg" className="w-full" onClick={add} disabled={!validRange || checking || available === 0 || tooMany}>
        Add to booking
      </Button>
    </div>
  );
}
