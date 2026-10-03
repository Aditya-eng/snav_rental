import { requireUser } from "@/lib/auth";
import { INDIAN_STATES } from "@/lib/constants";
import { Card, CardHeader, Field, Input, Select } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { updateProfile } from "../actions";
import { changePassword } from "../../auth-actions";

export default async function ProfilePage() {
  const user = await requireUser("/account/profile");
  const business = user.accountType === "BUSINESS";
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Profile" subtitle={business ? "Business account" : "Individual account"} />
        <ActionForm action={updateProfile} className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Full name">
            <Input name="name" defaultValue={user.name} required />
          </Field>
          <Field label="Mobile number">
            <Input name="phone" defaultValue={user.phone} type="tel" required />
          </Field>
          {business ? (
            <>
              <Field label="Company name">
                <Input name="companyName" defaultValue={user.companyName ?? ""} />
              </Field>
              <Field label="GSTIN">
                <Input name="gstin" defaultValue={user.gstin ?? ""} maxLength={15} className="uppercase" />
              </Field>
            </>
          ) : null}
          <Field label="Address" className="sm:col-span-2">
            <Input name="addressLine" defaultValue={user.addressLine ?? ""} />
          </Field>
          <Field label="City">
            <Input name="city" defaultValue={user.city ?? ""} />
          </Field>
          <Field label="State">
            <Select name="state" defaultValue={user.state ?? ""}>
              <option value="">Select state</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="PIN code">
            <Input name="pincode" defaultValue={user.pincode ?? ""} inputMode="numeric" maxLength={6} />
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton>Save profile</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <Card>
        <CardHeader title="Change password" />
        <ActionForm action={changePassword} resetOnSuccess className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Current password">
            <Input name="current" type="password" autoComplete="current-password" required />
          </Field>
          <Field label="New password" hint="At least 8 characters.">
            <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton variant="secondary">Update password</SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
