import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Badge, Button, Card, EmptyState, Input, PageHeader, Table } from "@/components/ui";
import { KycBadge } from "@/components/status-badge";

export const metadata = { title: "Customers" };

export default async function CustomersPage(props: PageProps<"/admin/customers">) {
  await requireStaff("customers");
  const sp = await props.searchParams;
  const kyc = typeof sp.kyc === "string" ? sp.kyc : "";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    ...(kyc ? { kycStatus: kyc } : {}),
    ...(q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q.toLowerCase() } }, { phone: { contains: q, mode: "insensitive" } }, { companyName: { contains: q, mode: "insensitive" } }] }
      : {}),
  };
  const customers = await db.user.findMany({
    where,
    include: { _count: { select: { bookings: true } } },
    orderBy: kyc === "PENDING" ? { updatedAt: "asc" } : { createdAt: "desc" },
    take: 300,
  });

  const tabs: [string, string][] = [["", "All"], ["PENDING", "KYC to review"], ["VERIFIED", "Verified"], ["NOT_SUBMITTED", "No KYC"], ["REJECTED", "Rejected"]];

  return (
    <div>
      <PageHeader title="Customers & KYC" />
      <div className="mb-4 flex gap-1 overflow-x-auto">
        {tabs.map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/customers${key ? `?kyc=${key}` : ""}`}
            className={cn("whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium", kyc === key ? "bg-navy-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200")}
          >
            {label}
          </Link>
        ))}
      </div>
      <form className="mb-4 flex max-w-md gap-2">
        {kyc ? <input type="hidden" name="kyc" value={kyc} /> : null}
        <Input name="q" defaultValue={q} placeholder="Name, email, phone, company" aria-label="Search customers" />
        <Button type="submit" variant="secondary">Search</Button>
      </form>
      {customers.length === 0 ? (
        <EmptyState title="No customers found" />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr><th>Customer</th><th>Type</th><th>Contact</th><th>KYC</th><th>Bookings</th><th>Joined</th></tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/customers/${c.id}`} className="font-semibold text-orange-700">{c.name}</Link>
                    {c.blocked ? <Badge tone="red" className="ml-2">Blocked</Badge> : null}
                    {c.payLater ? <Badge tone="blue" className="ml-2">Pay later</Badge> : null}
                  </td>
                  <td className="text-slate-600">{c.accountType === "BUSINESS" ? c.companyName ?? "Business" : "Individual"}</td>
                  <td className="text-slate-600">{c.phone}<br />{c.email}</td>
                  <td><KycBadge status={c.kycStatus} /></td>
                  <td>{c._count.bookings}</td>
                  <td className="whitespace-nowrap text-slate-600">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
