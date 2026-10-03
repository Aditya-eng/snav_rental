import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordReset } from "../auth-actions";
import { AuthCard } from "@/components/auth-card";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Input } from "@/components/ui";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="We'll email you a link to choose a new one."
      footer={<Link className="font-semibold text-orange-700" href="/login">Back to log in</Link>}
    >
      <ActionForm action={requestPasswordReset} className="space-y-4">
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <SubmitButton className="w-full" size="lg" pendingText="Sending…">Send reset link</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
