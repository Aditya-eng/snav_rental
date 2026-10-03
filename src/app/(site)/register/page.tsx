import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthCard } from "@/components/auth-card";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage(props: PageProps<"/register">) {
  const sp = await props.searchParams;
  const raw = typeof sp.next === "string" ? sp.next : "";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "";
  if (await getCurrentUser()) redirect(next || "/account");
  return (
    <AuthCard
      title="Create your account"
      subtitle="For individuals and businesses. Takes a minute."
      footer={
        <>
          Already have an account? <Link className="font-semibold text-orange-700" href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Log in</Link>
        </>
      }
    >
      <RegisterForm next={next} />
    </AuthCard>
  );
}
