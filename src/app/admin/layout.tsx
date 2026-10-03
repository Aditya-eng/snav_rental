import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { STAFF_ROLES, type StaffRole } from "@/lib/constants";
import { Logo } from "@/components/logo";
import { logout } from "../(site)/auth-actions";
import { AdminNav } from "./admin-nav";
import { canAccess, type Section } from "@/lib/permissions";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | SNAV Admin" }, robots: { index: false } };

const NAV: { href: string; label: string; section: Section }[] = [
  { href: "/admin", label: "Dashboard", section: "dashboard" },
  { href: "/admin/bookings", label: "Bookings", section: "bookings" },
  { href: "/admin/calendar", label: "Calendar", section: "calendar" },
  { href: "/admin/products", label: "Products & pricing", section: "products" },
  { href: "/admin/units", label: "Fleet & maintenance", section: "units" },
  { href: "/admin/customers", label: "Customers & KYC", section: "customers" },
  { href: "/admin/enquiries", label: "Enquiries", section: "enquiries" },
  { href: "/admin/tickets", label: "Support", section: "tickets" },
  { href: "/admin/reports", label: "Reports", section: "reports" },
  { href: "/admin/services", label: "Services", section: "services" },
  { href: "/admin/cities", label: "Cities & delivery", section: "cities" },
  { href: "/admin/coupons", label: "Coupons", section: "coupons" },
  { href: "/admin/content", label: "FAQ & testimonials", section: "content" },
  { href: "/admin/staff", label: "Staff", section: "staff" },
  { href: "/admin/settings", label: "Settings", section: "settings" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireStaff("dashboard");
  const items = NAV.filter((n) => canAccess(user.role, n.section)).map(({ href, label }) => ({ href, label }));

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
      <aside className="border-b border-slate-200 bg-navy-950 text-slate-300 lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:overflow-y-auto lg:border-b-0">
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/admin" aria-label="Admin home">
            <Logo light />
          </Link>
          <Link href="/" className="text-xs text-slate-400 hover:text-white lg:hidden">View site ↗</Link>
        </div>
        <AdminNav items={items} />
        <div className="hidden border-t border-white/10 px-4 py-4 text-xs lg:block">
          <p className="font-medium text-white">{user.name}</p>
          <p className="text-slate-400">{STAFF_ROLES[user.role as StaffRole] ?? user.role}</p>
          <div className="mt-3 flex gap-4">
            <Link href="/" className="hover:text-white">View site ↗</Link>
            <Link href="/account/profile" className="hover:text-white">My profile</Link>
            <form action={logout}>
              <button className="hover:text-white">Log out</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
