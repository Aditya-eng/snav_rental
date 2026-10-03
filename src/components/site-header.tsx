import Link from "next/link";
import { User } from "lucide-react";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { Container } from "./ui";
import { Logo } from "./logo";
import { CartLink, MobileNav } from "./site-header-client";

export const NAV = [
  { href: "/equipment", label: "Rent" },
  { href: "/equipment?mode=buy", label: "Buy" },
  { href: "/services", label: "Operators & Training" },
  { href: "/delivery", label: "Delivery" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  const accountHref = user ? (isStaff(user) ? "/admin" : "/account") : "/login";
  const accountLabel = user ? (isStaff(user) ? "Admin" : "My account") : "Log in";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="SNAV home">
          <Logo />
        </Link>
        <nav className="hidden lg:flex items-center gap-1" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <CartLink />
          <Link
            href={accountHref}
            className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 h-10 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <User className="size-4" aria-hidden />
            {accountLabel}
          </Link>
          <MobileNav items={NAV} accountHref={accountHref} accountLabel={accountLabel} />
        </div>
      </Container>
    </header>
  );
}
