import type { Metadata } from "next";
import { resetPassword } from "../auth-actions";
import { AuthCard } from "@/components/auth-card";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Input } from "@/components/ui";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage(props: PageProps<"/reset-password">) {
  const sp = await props.searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  return (
    <AuthCard title="Choose a new password">
      <ActionForm action={resetPassword} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <Field label="New password" hint="At least 8 characters.">
          <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <SubmitButton className="w-full" size="lg" pendingText="Saving…">Save password</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
