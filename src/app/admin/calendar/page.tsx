import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { addDays, parseDateOnly, rentalDays, todayIST, toDateInput } from "@/lib/dates";
import { dailyDemand, fleetCounts } from "@/lib/availability";
import { cn } from "@/lib/utils";
import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Calendar" };

const DAYS = 28;
const dayFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", timeZone: "UTC" });
const wkFmt = new Intl.DateTimeFormat("en-IN", { weekday: "narrow", timeZone: "UTC" });
const monthFmt = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });

export default async function CalendarPage(props: PageProps<"/admin/calendar">) {
  await requireStaff("calendar");
  const sp = await props.searchParams;
  const from = parseDateOnly(typeof sp.from === "string" ? sp.from : "") ?? todayIST();
  const to = addDays(from, DAYS - 1);
  const days = Array.from({ length: DAYS }, (_, i) => addDays(from, i));

  const products = await db.product.findMany({
    where: { rentable: true, units: { some: {} } },
    orderBy: { sortOrder: "asc" },
    include: {
      units: {
        where: { status: { not: "RETIRED" } },
        orderBy: { serialNumber: "asc" },
        include: {
          assignments: {
            where: { booking: { status: { in: ["REQUESTED", "CONFIRMED", "DISPATCHED", "RETURNED"] }, startDate: { lte: to }, endDate: { gte: from } } },
            include: { booking: { select: { code: true, startDate: true, endDate: true, status: true } } },
          },
        },
      },
    },
  });
  const ids = products.map((p) => p.id);
  const [fleet, demand] = await Promise.all([fleetCounts(ids), dailyDemand(ids, from, to)]);
  const today = todayIST();

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle={`${monthFmt.format(from)} · booked / in-fleet per product, and which unit is on which booking`}
        action={
          <div className="flex gap-2 text-sm">
            <Link className="rounded-md bg-white px-3 py-1.5 ring-1 ring-slate-200" href={`/admin/calendar?from=${toDateInput(addDays(from, -DAYS))}`}>← Earlier</Link>
            <Link className="rounded-md bg-white px-3 py-1.5 ring-1 ring-slate-200" href="/admin/calendar">Today</Link>
            <Link className="rounded-md bg-white px-3 py-1.5 ring-1 ring-slate-200" href={`/admin/calendar?from=${toDateInput(addDays(from, DAYS))}`}>Later →</Link>
          </div>
        }
      />
      <Card className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-48 bg-white px-3 py-2 text-left font-medium text-slate-500">Product / unit</th>
              {days.map((d) => (
                <th key={d.toISOString()} className={cn("w-8 min-w-8 px-0 py-2 text-center font-medium", d.getTime() === today.getTime() ? "text-orange-700" : "text-slate-500")}>
                  <div>{wkFmt.format(d)}</div>
                  <div>{dayFmt.format(d)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const total = fleet.get(p.id) ?? 0;
              const booked = demand.get(p.id) ?? [];
              return [
                <tr key={p.id} className="border-t border-slate-200 bg-slate-50">
                  <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-900">
                    <Link href={`/admin/products/${p.id}`}>{p.name}</Link>
                  </th>
                  {days.map((d, i) => {
                    const b = booked[i] ?? 0;
                    return (
                      <td
                        key={i}
                        title={`${b} booked of ${total}`}
                        className={cn(
                          "border-l border-white text-center font-semibold",
                          b === 0 ? "bg-emerald-50 text-emerald-700" : b < total ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800",
                        )}
                      >
                        {b}/{total}
                      </td>
                    );
                  })}
                </tr>,
                ...p.units.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <th className="sticky left-0 z-10 bg-white px-3 py-1.5 pl-6 text-left font-mono font-normal text-slate-600">
                      <Link href={`/admin/units/${u.id}`}>{u.serialNumber}</Link>
                      {u.status === "MAINTENANCE" ? <span className="ml-1 font-sans text-amber-700">(maint.)</span> : null}
                    </th>
                    {days.map((d, i) => {
                      const a = u.assignments.find((x) => x.booking.startDate <= d && x.booking.endDate >= d);
                      const first = a && (rentalDays(a.booking.startDate, d) === 1 || i === 0);
                      return (
                        <td key={i} className={cn("h-7 border-l border-white p-0", a ? (a.booking.status === "DISPATCHED" ? "bg-violet-200" : "bg-blue-100") : u.status === "MAINTENANCE" ? "bg-amber-50" : "")}>
                          {a && first ? (
                            <Link href={`/admin/bookings/${a.booking.code}`} className="block truncate whitespace-nowrap px-0.5 text-[10px] font-semibold text-navy-900" title={a.booking.code}>
                              {a.booking.code.slice(-4)}
                            </Link>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>
      </Card>
      <p className="mt-3 text-xs text-slate-500">
        Product rows count all bookings that hold stock. Unit rows show bookings once units are assigned (blue = confirmed, violet = on rent).
      </p>
    </div>
  );
}
