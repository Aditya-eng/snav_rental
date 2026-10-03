import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { login } from "../auth-actions";
import { AuthCard } from "@/components/auth-card";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Input } from "@/components/ui";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const raw = typeof sp.next === "string" ? sp.next : "";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "";
  const user = await getCurrentUser();
  if (user) redirect(next || (isStaff(user) ? "/admin" : "/account"));

  return (
    <AuthCard
      title="Log in"
      subtitle="Manage bookings, KYC and invoices."
      footer={
        <>
          New to SNAV? <Link className="font-semibold text-orange-700" href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link>
        </>
      }
    >
      <ActionForm action={login} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password">
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <div className="flex items-center justify-between">
          <Link href="/forgot-password" className="text-sm text-slate-600 hover:text-slate-900">Forgot password?</Link>
        </div>
        <SubmitButton className="w-full" size="lg" pendingText="Logging in…">Log in</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
