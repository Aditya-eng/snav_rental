import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { addDays, formatDate, overlaps, rentalDays, todayIST } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { bookingMoney } from "@/lib/booking";
import { cn } from "@/lib/utils";
import { Card, CardHeader, PageHeader, Table } from "@/components/ui";

export const metadata = { title: "Reports" };

const EARNING = ["CONFIRMED", "DISPATCHED", "RETURNED", "COMPLETED"];
const monthFmt = new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" });

/** Single-series horizontal meter: one hue, value text in ink colors. */
function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.max(value > 0 ? 2 : 0, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2.5 w-full rounded-full bg-slate-100" title={label} role="img" aria-label={label}>
      <div className="h-2.5 rounded-full bg-navy-600" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default async function ReportsPage(props: PageProps<"/admin/reports">) {
  await requireStaff("reports");
  const sp = await props.searchParams;
  const period = [30, 90, 365].includes(Number(sp.days)) ? Number(sp.days) : 90;
  const today = todayIST();
  const from = addDays(today, -(period - 1));
  const yearAgo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11, 1));

  const [bookings, payments, units, openBookings] = await Promise.all([
    db.booking.findMany({
      where: { status: { in: EARNING }, startDate: { gte: yearAgo } },
      include: { items: true },
    }),
    db.payment.findMany({ where: { status: "PAID", createdAt: { gte: from } } }),
    db.unit.findMany({
      where: { status: { not: "RETIRED" } },
      include: {
        product: true,
        maintenance: true,
        assignments: { where: { booking: { status: { in: EARNING } } }, include: { booking: { include: { items: true } } } },
      },
      orderBy: [{ product: { sortOrder: "asc" } }, { serialNumber: "asc" }],
    }),
    db.booking.findMany({ where: { status: { notIn: ["CANCELLED", "COMPLETED"] } }, include: { user: true } }),
  ]);

  const inPeriod = bookings.filter((b) => b.startDate >= from);
  const revenue = inPeriod.reduce((s, b) => s + b.taxableAmount, 0);
  const received = payments.reduce((s, p) => s + (p.kind === "REFUND" ? -p.amount : p.amount), 0);
  const depositsHeld = openBookings.filter((b) => b.depositStatus === "HELD").reduce((s, b) => s + b.deposit, 0);
  const outstanding = openBookings
    .map((b) => ({ b, due: bookingMoney(b).due }))
    .filter((x) => x.due > 0 && !["PENDING_PAYMENT", "REQUESTED"].includes(x.b.status))
    .sort((a, z) => z.due - a.due);
  const outstandingTotal = outstanding.reduce((s, x) => s + x.due, 0);

  // Monthly revenue (by rental start month), last 12 months.
  const months = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(yearAgo.getUTCFullYear(), yearAgo.getUTCMonth() + i, 1)));
  const byMonth = months.map((m) => {
    const next = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1));
    return { m, value: bookings.filter((b) => b.startDate >= m && b.startDate < next).reduce((s, b) => s + b.taxableAmount, 0) };
  });
  const maxMonth = Math.max(0, ...byMonth.map((x) => x.value));

  // Revenue by product in the period.
  const productRev = new Map<string, { name: string; value: number; units: number }>();
  for (const b of inPeriod)
    for (const i of b.items) {
      const key = i.productId ?? i.serviceId ?? i.name;
      const cur = productRev.get(key) ?? { name: i.name, value: 0, units: 0 };
      cur.value += i.amount;
      cur.units += i.quantity;
      productRev.set(key, cur);
    }
  const productRows = [...productRev.values()].sort((a, z) => z.value - a.value);
  const maxProduct = Math.max(0, ...productRows.map((r) => r.value));

  // Utilisation per unit: booked days overlapping the period / period length.
  const unitRows = units.map((u) => {
    let days = 0;
    let lifetime = 0;
    for (const a of u.assignments) {
      const b = a.booking;
      const line = b.items.find((i) => i.productId === u.productId && i.kind === "RENTAL");
      if (line) lifetime += Math.round(line.amount / line.quantity);
      if (overlaps(b.startDate, b.endDate, from, today)) {
        const s = b.startDate > from ? b.startDate : from;
        const e = b.endDate < today ? b.endDate : today;
        days += rentalDays(s, e);
      }
    }
    const spend = u.maintenance.reduce((s, m) => s + m.cost, 0);
    return { u, days, pct: Math.round((days / period) * 100), lifetime, payback: u.purchaseCost ? Math.round(((lifetime - spend) / u.purchaseCost) * 100) : null };
  });
  const fleetUtil = unitRows.length ? Math.round(unitRows.reduce((s, r) => s + r.pct, 0) / unitRows.length) : 0;

  const tiles = [
    ["Rental revenue", formatINR(revenue), `excl. GST, rentals starting in the last ${period} days`],
    ["Money received", formatINR(received), "payments minus refunds, incl. deposits"],
    ["Deposits held", formatINR(depositsHeld), "on open bookings"],
    ["Outstanding", formatINR(outstandingTotal), `${outstanding.length} confirmed booking(s)`],
    ["Fleet utilisation", `${fleetUtil}%`, `average across ${unitRows.length} unit(s)`],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        action={
          <div className="flex gap-1">
            {[30, 90, 365].map((d) => (
              <Link key={d} href={`/admin/reports?days=${d}`} className={cn("rounded-md px-3 py-1.5 text-sm font-medium", period === d ? "bg-navy-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200")}>
                {d === 365 ? "12 months" : `${d} days`}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tiles.map(([label, value, sub]) => (
          <Card key={label} className="p-4">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500">{sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Rental revenue by month" subtitle="Excl. GST, by rental start date" />
          <Table>
            <tbody>
              {byMonth.map(({ m, value }) => (
                <tr key={m.toISOString()}>
                  <td className="w-20 whitespace-nowrap text-slate-600">{monthFmt.format(m)}</td>
                  <td className="w-full"><Meter value={value} max={maxMonth} label={`${monthFmt.format(m)}: ${formatINR(value)}`} /></td>
                  <td className="whitespace-nowrap text-right font-medium text-slate-900">{formatINR(value)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Revenue by product & service" subtitle={`Last ${period} days, excl. GST`} />
          {productRows.length ? (
            <Table>
              <tbody>
                {productRows.map((r) => (
                  <tr key={r.name}>
                    <td className="whitespace-nowrap text-slate-900">{r.name}</td>
                    <td className="w-1/2"><Meter value={r.value} max={maxProduct} label={`${r.name}: ${formatINR(r.value)}`} /></td>
                    <td className="whitespace-nowrap text-right font-medium text-slate-900">{formatINR(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="p-5 text-sm text-slate-500">No confirmed rentals in this period.</p>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Utilisation & payback per unit" subtitle={`Days on bookings in the last ${period} days. Payback = lifetime rental revenue minus maintenance, as % of purchase cost.`} />
        <Table>
          <thead>
            <tr><th>Unit</th><th>Product</th><th>Days booked</th><th className="w-1/4">Utilisation</th><th className="text-right">Lifetime revenue</th><th className="text-right">Payback</th></tr>
          </thead>
          <tbody>
            {unitRows.map((r) => (
              <tr key={r.u.id}>
                <td><Link href={`/admin/units/${r.u.id}`} className="font-mono text-orange-700">{r.u.serialNumber}</Link></td>
                <td className="text-slate-700">{r.u.product.name}</td>
                <td>{r.days}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <Meter value={r.pct} max={100} label={`${r.pct}% utilised`} />
                    <span className="w-10 text-right text-slate-700">{r.pct}%</span>
                  </div>
                </td>
                <td className="text-right">{formatINR(r.lifetime)}</td>
                <td className="text-right text-slate-700">{r.payback === null ? "add cost" : `${r.payback}%`}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader title="Outstanding balances" />
        {outstanding.length ? (
          <Table>
            <tbody>
              {outstanding.map(({ b, due }) => (
                <tr key={b.id}>
                  <td><Link href={`/admin/bookings/${b.code}`} className="font-semibold text-orange-700">{b.code}</Link></td>
                  <td>{b.user.name} · {b.user.phone}</td>
                  <td className="text-slate-600">{formatDate(b.startDate)} – {formatDate(b.endDate)}</td>
                  <td className="text-right font-semibold text-slate-900">{formatINR(due)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="p-5 text-sm text-slate-500">Nothing outstanding.</p>
        )}
      </Card>
    </div>
  );
}
