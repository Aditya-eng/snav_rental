"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/components/cart";
import { useQuote } from "@/components/use-quote";
import { QuoteSummary } from "@/components/quote-summary";
import { ProductImage } from "@/components/product-image";
import { Alert, Card, CardHeader, LinkButton } from "@/components/ui";
import { formatINR } from "@/lib/money";

type CatalogItem = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  tagline: string | null;
  dailyRate: number;
  category: string;
  categorySlug: string;
};
type ServiceItem = { id: string; name: string; description: string; dailyRate: number };

function dayCount(start: string, end: string) {
  if (!start || !end) return 0;
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
}

const dateInput =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20";

export function CartBuilder({ minStart, catalog, services }: { minStart: string; catalog: CatalogItem[]; services: ServiceItem[] }) {
  const { cart, ready, setDates, setItem, addItem, setService, clear } = useCart();
  const days = dayCount(cart.start, cart.end);

  // Drop items that are no longer in the rentable catalog.
  const items = cart.items.filter((i) => catalog.some((c) => c.id === i.productId));
  const input = useMemo(
    () =>
      ready && items.length && cart.start && cart.end
        ? { start: cart.start, end: cart.end, items, services: cart.services }
        : null,
    [ready, items, cart.start, cart.end, cart.services],
  );
  const { quote, loading } = useQuote(input);

  const grouped = useMemo(() => {
    const map = new Map<string, CatalogItem[]>();
    for (const c of catalog) map.set(c.category, [...(map.get(c.category) ?? []), c]);
    return [...map.entries()];
  }, [catalog]);

  if (!ready) return <div className="mt-8 h-64 animate-pulse rounded-xl bg-slate-100" />;

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0 space-y-6">
        <Card>
          <CardHeader title="1. Rental dates" subtitle="One date range applies to every item in this booking. Both days are included." />
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Start date</span>
              <input
                type="date"
                className={dateInput}
                min={minStart}
                value={cart.start}
                onChange={(e) => setDates(e.target.value, cart.end && cart.end >= e.target.value ? cart.end : e.target.value)}
              />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">End date</span>
              <input type="date" className={dateInput} min={cart.start || minStart} value={cart.end} onChange={(e) => setDates(cart.start, e.target.value)} />
            </label>
            <div className="flex items-end">
              <p className="text-sm text-slate-600">
                {days > 0 ? (
                  <>
                    <span className="text-2xl font-bold text-slate-900">{days}</span> rental day{days > 1 ? "s" : ""}
                  </>
                ) : (
                  "Choose your dates"
                )}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="2. Your kit"
            action={items.length ? <button type="button" onClick={clear} className="text-sm text-slate-500 hover:text-red-600">Clear all</button> : null}
          />
          {items.length === 0 ? (
            <p className="p-5 text-sm text-slate-600">No instruments yet. Add a receiver below or <Link href="/equipment" className="font-semibold text-orange-700">browse equipment</Link>.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((item) => {
                const product = catalog.find((c) => c.id === item.productId)!;
                const line = quote?.lines.find((l) => l.productId === item.productId);
                return (
                  <li key={item.productId} className="flex flex-wrap items-center gap-4 p-5">
                    <ProductImage src={product.imageUrl} name={product.name} category={product.categorySlug} className="size-16 shrink-0 rounded-lg border border-slate-200" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/equipment/${product.slug}`} className="font-semibold text-slate-900 hover:text-orange-700">{product.name}</Link>
                      <p className="text-sm text-slate-500">{line ? `Billed as ${line.pricingNote}` : `${formatINR(product.dailyRate)}/day`}</p>
                      {line && line.available !== undefined && item.quantity > line.available ? (
                        <p className="text-sm font-medium text-red-600">{line.available === 0 ? "Fully booked for these dates" : `Only ${line.available} available`}</p>
                      ) : null}
                    </div>
                    <Stepper value={item.quantity} onChange={(q) => setItem(item.productId, q)} label={product.name} />
                    <p className="w-24 text-right font-semibold text-slate-900">{line ? formatINR(line.amount) : "—"}</p>
                    <button type="button" onClick={() => setItem(item.productId, 0)} className="text-slate-400 hover:text-red-600" aria-label={`Remove ${product.name}`}>
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <details className="border-t border-slate-100 p-5" open={items.length === 0}>
            <summary className="cursor-pointer text-sm font-semibold text-orange-700">+ Add more equipment (base station, controller, accessories)</summary>
            <div className="mt-4 space-y-5">
              {grouped.map(([category, list]) => (
                <div key={category}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{category}</h3>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {list.map((p) => {
                      const inCart = items.find((i) => i.productId === p.id);
                      return (
                        <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{p.name}</p>
                            <p className="text-xs text-slate-500">{formatINR(p.dailyRate)}/day</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addItem(p.id, 1)}
                            className="shrink-0 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-orange-400 hover:text-orange-700"
                          >
                            {inCart ? `Add another (${inCart.quantity})` : "Add"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        </Card>

        {services.length ? (
          <Card>
            <CardHeader title="3. Operators & training (optional)" subtitle="Charged per person per day, up to the length of your rental." />
            <ul className="divide-y divide-slate-100">
              {services.map((s) => {
                const sel = cart.services.find((x) => x.serviceId === s.id);
                const maxDays = Math.max(1, days);
                return (
                  <li key={s.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">{s.name}</p>
                        <p className="mt-1 text-sm text-slate-600">{s.description}</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">{formatINR(s.dailyRate)}/day</p>
                      </div>
                      {sel ? (
                        <button type="button" onClick={() => setService(s.id, 0, 0)} className="text-sm text-slate-500 hover:text-red-600">Remove</button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setService(s.id, 1, maxDays)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-orange-400 hover:text-orange-700"
                        >
                          Add
                        </button>
                      )}
                    </div>
                    {sel ? (
                      <div className="mt-3 flex flex-wrap items-center gap-6 text-sm">
                        <span className="flex items-center gap-2">
                          People <Stepper value={sel.quantity} onChange={(q) => setService(s.id, q, sel.days)} label={`${s.name} people`} min={1} />
                        </span>
                        <span className="flex items-center gap-2">
                          Days <Stepper value={Math.min(sel.days, maxDays)} onChange={(d) => setService(s.id, sel.quantity, d)} label={`${s.name} days`} min={1} max={maxDays} />
                        </span>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : null}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-slate-900">Summary</h2>
          <div className="mt-4">
            {quote && input ? (
              <div className={loading ? "opacity-60" : undefined}>
                <QuoteSummary quote={quote} />
                <p className="mt-3 text-xs text-slate-500">Delivery fee and final GST (CGST/SGST or IGST) are calculated at checkout from your city and billing state.</p>
              </div>
            ) : (
              <p className="text-sm text-slate-600">{items.length ? "Choose dates to see your total." : "Add an instrument to get started."}</p>
            )}
          </div>
          {quote && quote.errors.length ? (
            <Alert tone="red" className="mt-4">
              <ul className="list-disc space-y-1 pl-4">
                {quote.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          {quote?.ok && !loading ? (
            <LinkButton href="/checkout" size="lg" className="mt-5 w-full">Continue to checkout</LinkButton>
          ) : (
            <button type="button" disabled className="mt-5 h-12 w-full rounded-lg bg-slate-200 font-semibold text-slate-500">
              Continue to checkout
            </button>
          )}
          <p className="mt-3 text-center text-xs text-slate-500">
            Renting several units or for 3+ months? <Link className="font-semibold text-orange-700" href="/quote">Get a custom quote</Link>
          </p>
        </Card>
      </aside>
    </div>
  );
}

function Stepper({ value, onChange, label, min = 0, max = 50 }: { value: number; onChange: (v: number) => void; label: string; min?: number; max?: number }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white">
      <button type="button" className="inline-flex size-8 items-center justify-center text-slate-700 disabled:opacity-40" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Decrease ${label}`}>
        <Minus className="size-3.5" />
      </button>
      <span className="w-8 text-center text-sm font-semibold">{value}</span>
      <button type="button" className="inline-flex size-8 items-center justify-center text-slate-700 disabled:opacity-40" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Increase ${label}`}>
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
