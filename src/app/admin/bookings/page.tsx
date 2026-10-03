import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatDate, todayIST } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { bookingMoney } from "@/lib/booking";
import { cn } from "@/lib/utils";
import { Button, Card, EmptyState, Input, PageHeader, Table } from "@/components/ui";
import { BookingStatusBadge, KycBadge } from "@/components/status-badge";

export const metadata = { title: "Bookings" };

const TABS = [
  ["", "All"],
  ["REQUESTED", "Requested"],
  ["PENDING_PAYMENT", "Awaiting payment"],
  ["CONFIRMED", "Confirmed"],
  ["DISPATCHED", "On rent"],
  ["OVERDUE", "Overdue"],
  ["EXTENSION", "Extension requests"],
  ["RETURNED", "Returned"],
  ["COMPLETED", "Completed"],
  ["CANCELLED", "Cancelled"],
] as const;

export default async function AdminBookings(props: PageProps<"/admin/bookings">) {
  await requireStaff("bookings");
  const sp = await props.searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const where: Prisma.BookingWhereInput = {
    ...(status === "OVERDUE"
      ? { status: "DISPATCHED", endDate: { lt: todayIST() } }
      : status === "EXTENSION"
        ? { extensions: { some: { status: "PENDING" } } }
        : status
          ? { status }
          : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q.toUpperCase() } },
            { user: { name: { contains: q } } },
            { user: { phone: { contains: q } } },
            { user: { email: { contains: q.toLowerCase() } } },
            { billingName: { contains: q } },
          ],
        }
      : {}),
  };

  const bookings = await db.booking.findMany({
    where,
    include: { user: true, city: true, items: true },
    orderBy: status === "DISPATCHED" || status === "OVERDUE" ? { endDate: "asc" } : { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader title="Bookings" />
      <div className="mb-4 flex gap-1 overflow-x-auto">
        {TABS.map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/bookings${key ? `?status=${key}` : ""}`}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium",
              status === key ? "bg-navy-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
            )}
          >
            {label}
          </Link>
        ))}
      </div>
      <form className="mb-4 flex max-w-md gap-2">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <Input name="q" defaultValue={q} placeholder="Code, name, phone or email" aria-label="Search bookings" />
        <Button type="submit" variant="secondary">Search</Button>
      </form>

      {bookings.length === 0 ? (
        <EmptyState title="No bookings found" />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <th>Booking</th>
                <th>Customer</th>
                <th>Dates</th>
                <th>Equipment</th>
                <th>City</th>
                <th>Status</th>
                <th className="text-right">Due</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const due = bookingMoney(b).due;
                return (
                  <tr key={b.id}>
                    <td><Link href={`/admin/bookings/${b.code}`} className="font-semibold text-orange-700 hover:text-orange-800">{b.code}</Link></td>
                    <td>
                      <p className="font-medium text-slate-900">{b.user.name}</p>
                      <div className="mt-0.5"><KycBadge status={b.user.kycStatus} /></div>
                    </td>
                    <td className="whitespace-nowrap text-slate-600">{formatDate(b.startDate)} – {formatDate(b.endDate)}</td>
                    <td className="max-w-xs text-slate-700">{b.items.filter((i) => i.kind === "RENTAL").map((i) => `${i.quantity}× ${i.name.replace("eSurvey ", "")}`).join(", ")}</td>
                    <td className="text-slate-600">{b.city.name}{b.fulfillment === "PICKUP" ? " (pickup)" : ""}</td>
                    <td><BookingStatusBadge status={b.status} /></td>
                    <td className={cn("text-right font-medium", due > 0 && b.status !== "CANCELLED" ? "text-orange-700" : "text-slate-500")}>
                      {b.status !== "CANCELLED" && due !== 0 ? formatINR(due) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
