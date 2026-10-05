"use client";

import Link from "next/link";
import { useState } from "react";
import { register } from "../auth-actions";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Checkbox, Field, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

export function RegisterForm({ next }: { next: string }) {
  const [type, setType] = useState<"INDIVIDUAL" | "BUSINESS">("INDIVIDUAL");
  return (
    <ActionForm action={register} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="accountType" value={type} />
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1" role="radiogroup" aria-label="Account type">
        {(["INDIVIDUAL", "BUSINESS"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => setType(t)}
            className={cn("rounded-md py-2 text-sm font-semibold", type === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-600")}
          >
            {t === "INDIVIDUAL" ? "Individual" : "Business"}
          </button>
        ))}
      </div>
      <Field label="Full name">
        <Input name="name" autoComplete="name" required />
      </Field>
      {type === "BUSINESS" ? (
        <>
          <Field label="Company name">
            <Input name="companyName" autoComplete="organization" required />
          </Field>
          <Field label="GSTIN (optional)" hint="Add it now to get GST invoices with input tax credit.">
            <Input name="gstin" maxLength={15} className="uppercase" />
          </Field>
        </>
      ) : null}
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Mobile number">
        <Input name="phone" type="tel" autoComplete="tel" inputMode="numeric" placeholder="10-digit mobile" required />
      </Field>
      <Field label="Password" hint="At least 8 characters.">
        <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Checkbox
        name="consent"
        required
        label={
          <>
            I am 18 or older and agree to the{" "}
            <Link href="/terms" target="_blank" className="font-medium text-orange-700">rental terms</Link> and{" "}
            <Link href="/privacy" target="_blank" className="font-medium text-orange-700">privacy policy</Link>, including the use of my
            details and KYC documents to process rentals.
          </>
        }
      />
      <SubmitButton className="w-full" size="lg" pendingText="Creating account…">Create account</SubmitButton>
    </ActionForm>
  );
}
