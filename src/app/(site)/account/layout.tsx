import { requireUser } from "@/lib/auth";
import { logout } from "../auth-actions";
import { Container } from "@/components/ui";
import { KycBadge } from "@/components/status-badge";
import { AccountNav } from "./account-nav";

export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const user = await requireUser("/account");
  return (
    <Container className="py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hi, {user.name.split(" ")[0]}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>{user.email}</span>
            <KycBadge status={user.kycStatus} />
          </div>
        </div>
        <form action={logout}>
          <button className="text-sm font-medium text-slate-600 hover:text-slate-900">Log out</button>
        </form>
      </div>
      <div className="mt-6 grid gap-8 lg:grid-cols-[200px_1fr]">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
