import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { addDays, formatDate, todayIST } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { PAYMENT_HOLD_MINUTES } from "@/lib/constants";
import { Alert, Card, CardHeader, PageHeader, Table } from "@/components/ui";
import { BookingStatusBadge } from "@/components/status-badge";

export default async function AdminDashboard(props: PageProps<"/admin">) {
  const sp = await props.searchParams;
  await requireStaff("dashboard");
  const today = todayIST();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const holdCutoff = new Date(Date.now() - PAYMENT_HOLD_MINUTES * 60_000);

  const [requested, awaitingPay, dispatchesDue, returnsDue, overdue, onRent, fleet, kycPending, newEnquiries, openTickets, monthBookings, pendingExt, recent] =
    await Promise.all([
      db.booking.count({ where: { status: "REQUESTED" } }),
      db.booking.count({ where: { status: "PENDING_PAYMENT", updatedAt: { gte: holdCutoff } } }),
      db.booking.findMany({
        where: { status: "CONFIRMED", startDate: { lte: addDays(today, 2) } },
        include: { user: true, city: true },
        orderBy: { startDate: "asc" },
        take: 8,
      }),
      db.booking.findMany({
        where: { status: "DISPATCHED", endDate: { gte: today, lte: addDays(today, 2) } },
        include: { user: true, city: true },
        orderBy: { endDate: "asc" },
        take: 8,
      }),
      db.booking.findMany({ where: { status: "DISPATCHED", endDate: { lt: today } }, include: { user: true }, orderBy: { endDate: "asc" } }),
      db.bookingUnit.count({ where: { booking: { status: "DISPATCHED" } } }),
      db.unit.count({ where: { status: "ACTIVE" } }),
      db.user.count({ where: { kycStatus: "PENDING" } }),
      db.enquiry.count({ where: { status: "NEW" } }),
      db.ticket.count({ where: { status: "OPEN" } }),
      db.booking.findMany({
        where: { createdAt: { gte: monthStart }, status: { notIn: ["CANCELLED", "PENDING_PAYMENT"] } },
        select: { taxableAmount: true },
      }),
      db.extensionRequest.count({ where: { status: "PENDING" } }),
      db.booking.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 8 }),
    ]);

  const monthValue = monthBookings.reduce((s, b) => s + b.taxableAmount, 0);
  const utilisation = fleet ? Math.round((onRent / fleet) * 100) : 0;

  const tiles = [
    { label: "New requests", value: requested, href: "/admin/bookings?status=REQUESTED", warn: requested > 0 },
    { label: "Awaiting payment", value: awaitingPay, href: "/admin/bookings?status=PENDING_PAYMENT" },
    { label: "Overdue returns", value: overdue.length, href: "/admin/bookings?status=OVERDUE", warn: overdue.length > 0 },
    { label: "Extension requests", value: pendingExt, href: "/admin/bookings?status=EXTENSION", warn: pendingExt > 0 },
    { label: "KYC to review", value: kycPending, href: "/admin/customers?kyc=PENDING", warn: kycPending > 0 },
    { label: "New enquiries", value: newEnquiries, href: "/admin/enquiries", warn: newEnquiries > 0 },
    { label: "Open support", value: openTickets, href: "/admin/tickets" },
    { label: "Units on rent", value: `${onRent} / ${fleet}`, sub: `${utilisation}% utilisation`, href: "/admin/calendar" },
    { label: "Booked this month", value: formatINR(monthValue), sub: "excl. GST & deposits", href: "/admin/reports" },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={formatDate(today)} />
      {sp.denied ? <Alert tone="amber" className="mb-6">You don&apos;t have access to that section.</Alert> : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-orange-300">
            <p className="text-xs font-medium text-slate-500">{t.label}</p>
            <p className={`mt-1 text-2xl font-bold ${t.warn ? "text-orange-700" : "text-slate-900"}`}>{t.value}</p>
            {t.sub ? <p className="text-xs text-slate-500">{t.sub}</p> : null}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Dispatch in the next 2 days" />
          {dispatchesDue.length ? (
            <Table>
              <tbody>
                {dispatchesDue.map((b) => (
                  <tr key={b.id}>
                    <td><Link href={`/admin/bookings/${b.code}`} className="font-semibold text-orange-700">{b.code}</Link></td>
                    <td>{b.user.name}</td>
                    <td className="text-slate-600">{b.fulfillment === "PICKUP" ? "Pickup" : "Delivery"} · {b.city.name}</td>
                    <td className="whitespace-nowrap">{formatDate(b.startDate)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="p-5 text-sm text-slate-500">Nothing to dispatch.</p>
          )}
        </Card>
        <Card>
          <CardHeader title="Returns due in the next 2 days" />
          {returnsDue.length ? (
            <Table>
              <tbody>
                {returnsDue.map((b) => (
                  <tr key={b.id}>
                    <td><Link href={`/admin/bookings/${b.code}`} className="font-semibold text-orange-700">{b.code}</Link></td>
                    <td>{b.user.name}</td>
                    <td className="text-slate-600">{b.city.name}</td>
                    <td className="whitespace-nowrap">{formatDate(b.endDate)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="p-5 text-sm text-slate-500">No returns due.</p>
          )}
        </Card>
        {overdue.length ? (
          <Card className="border-red-200">
            <CardHeader title="Overdue" />
            <Table>
              <tbody>
                {overdue.map((b) => (
                  <tr key={b.id}>
                    <td><Link href={`/admin/bookings/${b.code}`} className="font-semibold text-red-700">{b.code}</Link></td>
                    <td>{b.user.name} · {b.user.phone}</td>
                    <td className="whitespace-nowrap">due {formatDate(b.endDate)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        ) : null}
        <Card>
          <CardHeader title="Latest bookings" action={<Link href="/admin/bookings" className="text-sm font-semibold text-orange-700">All</Link>} />
          <Table>
            <tbody>
              {recent.map((b) => (
                <tr key={b.id}>
                  <td><Link href={`/admin/bookings/${b.code}`} className="font-semibold text-orange-700">{b.code}</Link></td>
                  <td>{b.user.name}</td>
                  <td><BookingStatusBadge status={b.status} /></td>
                  <td className="whitespace-nowrap text-slate-600">{formatDate(b.startDate)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
