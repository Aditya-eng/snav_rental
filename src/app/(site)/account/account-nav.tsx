"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/account", label: "Bookings" },
  { href: "/account/kyc", label: "KYC documents" },
  { href: "/account/tickets", label: "Support" },
  { href: "/account/profile", label: "Profile" },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Account">
      {LINKS.map((l) => {
        const active = l.href === "/account" ? pathname === "/account" || pathname.startsWith("/account/bookings") : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium",
              active ? "bg-navy-900 text-white" : "text-slate-700 hover:bg-slate-100",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
