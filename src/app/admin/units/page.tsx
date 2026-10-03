import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { addDays, formatDate, todayIST } from "@/lib/dates";
import { Badge, Card, EmptyState, PageHeader, Table } from "@/components/ui";
import { UnitStatusBadge } from "@/components/status-badge";

export const metadata = { title: "Fleet & maintenance" };

export default async function UnitsPage() {
  await requireStaff("units");
  const today = todayIST();
  const units = await db.unit.findMany({
    include: {
      product: true,
      assignments: { where: { booking: { status: "DISPATCHED" } }, include: { booking: { select: { code: true, endDate: true } } } },
      maintenance: { orderBy: { date: "desc" }, take: 1 },
    },
    orderBy: [{ product: { sortOrder: "asc" } }, { serialNumber: "asc" }],
  });
  // A unit is due when its most recent log entry has a next-due date within 30 days.
  const soon = addDays(today, 30);
  const latestDue = units.filter((u) => u.maintenance[0]?.nextDue && u.maintenance[0].nextDue <= soon);

  return (
    <div className="space-y-6">
      <PageHeader title="Fleet & maintenance" subtitle="Every instrument by serial number. Add units from a product's page." />
      {latestDue.length ? (
        <Card className="border-amber-300">
          <div className="px-5 py-3 text-sm">
            <p className="font-semibold text-amber-800">Service / calibration due within 30 days</p>
            <ul className="mt-1 space-y-0.5">
              {latestDue.map((u) => (
                <li key={u.id}>
                  <Link href={`/admin/units/${u.id}`} className="font-mono text-orange-700">{u.serialNumber}</Link> ({u.product.name}) — {u.maintenance[0].kind.toLowerCase()} due {formatDate(u.maintenance[0].nextDue)}
                </li>
              ))}
            </ul>
          </div>
        </Card>
      ) : null}
      {units.length === 0 ? (
        <EmptyState title="No units yet" />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <th>Serial</th>
                <th>Product</th>
                <th>Status</th>
                <th>Right now</th>
                <th>Condition</th>
                <th>Firmware</th>
                <th>Last service</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => {
                const out = u.assignments[0]?.booking;
                return (
                  <tr key={u.id}>
                    <td><Link href={`/admin/units/${u.id}`} className="font-mono font-semibold text-orange-700">{u.serialNumber}</Link></td>
                    <td>{u.product.name}</td>
                    <td><UnitStatusBadge status={u.status} /></td>
                    <td>
                      {out ? (
                        <Link href={`/admin/bookings/${out.code}`}>
                          <Badge tone={out.endDate < today ? "red" : "violet"}>On rent · {out.code}</Badge>
                        </Link>
                      ) : u.status === "ACTIVE" ? (
                        <Badge tone="green">In warehouse</Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{u.condition}</td>
                    <td className="text-slate-600">{u.firmware ?? "—"}</td>
                    <td className="text-slate-600">{u.maintenance[0] ? `${u.maintenance[0].kind.toLowerCase()} · ${formatDate(u.maintenance[0].date)}` : "—"}</td>
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
