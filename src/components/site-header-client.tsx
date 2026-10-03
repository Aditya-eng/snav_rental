"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, ShoppingCart, X } from "lucide-react";
import { useCart } from "./cart";

export function CartLink() {
  const { count, ready } = useCart();
  return (
    <Link
      href="/cart"
      className="relative inline-flex h-10 items-center gap-2 rounded-lg bg-orange-600 px-3 text-sm font-semibold text-white hover:bg-orange-700"
      aria-label={`Booking cart${ready && count ? `, ${count} item${count > 1 ? "s" : ""}` : ""}`}
    >
      <ShoppingCart className="size-4" aria-hidden />
      <span className="hidden sm:inline">Booking</span>
      {ready && count > 0 ? (
        <span className="ml-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-orange-700">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

export function MobileNav({
  items,
  accountHref,
  accountLabel,
}: {
  items: { href: string; label: string }[];
  accountHref: string;
  accountLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-300 text-slate-700"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open ? (
        <div className="absolute inset-x-0 top-16 border-b border-slate-200 bg-white shadow-lg">
          <nav className="flex flex-col px-4 py-3" aria-label="Mobile">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-base font-medium text-slate-800 hover:bg-slate-100"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={accountHref}
              onClick={() => setOpen(false)}
              className="mt-2 rounded-md bg-navy-900 px-3 py-3 text-center text-base font-semibold text-white"
            >
              {accountLabel}
            </Link>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
