import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { bookingMoney } from "@/lib/booking";
import { Alert, Card, EmptyState, LinkButton, Table } from "@/components/ui";
import { BookingStatusBadge } from "@/components/status-badge";

export default async function AccountPage() {
  const user = await requireUser("/account");
  const bookings = await db.booking.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      {user.kycStatus !== "VERIFIED" ? (
        <Alert tone={user.kycStatus === "REJECTED" ? "red" : "amber"}>
          {user.kycStatus === "PENDING"
            ? "Your KYC documents are under review."
            : user.kycStatus === "REJECTED"
              ? `Your KYC was not accepted${user.kycNote ? `: ${user.kycNote}` : ""}. Please upload new documents.`
              : "Upload your KYC documents so we can dispatch your rentals without delay."}{" "}
          {user.kycStatus !== "PENDING" ? <Link href="/account/kyc" className="font-semibold underline">Upload KYC</Link> : null}
        </Alert>
      ) : null}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Your bookings</h2>
        <LinkButton href="/equipment" size="sm">New booking</LinkButton>
      </div>

      {bookings.length === 0 ? (
        <EmptyState title="No bookings yet">
          <Link href="/equipment" className="font-semibold text-orange-700">Browse equipment</Link> to make your first booking.
        </EmptyState>
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <th>Booking</th>
                <th>Dates</th>
                <th>Equipment</th>
                <th>Status</th>
                <th className="text-right">Balance due</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const due = bookingMoney(b).due;
                return (
                  <tr key={b.id}>
                    <td>
                      <Link href={`/account/bookings/${b.code}`} className="font-semibold text-orange-700 hover:text-orange-800">{b.code}</Link>
                    </td>
                    <td className="whitespace-nowrap text-slate-600">
                      {formatDate(b.startDate)} – {formatDate(b.endDate)}
                    </td>
                    <td className="text-slate-700">
                      {b.items
                        .filter((i) => i.kind === "RENTAL")
                        .map((i) => `${i.quantity} × ${i.name}`)
                        .join(", ")}
                    </td>
                    <td><BookingStatusBadge status={b.status} /></td>
                    <td className="text-right font-medium">{b.status !== "CANCELLED" && due > 0 ? formatINR(due) : "—"}</td>
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
