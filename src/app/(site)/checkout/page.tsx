import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSettings, num } from "@/lib/settings";
import { razorpayEnabled } from "@/lib/razorpay";
import { Container } from "@/components/ui";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const settings = await getSettings();
  const cities = await db.city.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });

  return (
    <Container className="py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Checkout</h1>
      <CheckoutForm
        user={{
          name: user.name,
          phone: user.phone,
          companyName: user.companyName,
          gstin: user.gstin,
          addressLine: user.addressLine,
          city: user.city,
          state: user.state,
          pincode: user.pincode,
          kycStatus: user.kycStatus,
          payLater: user.payLater,
        }}
        cities={cities.map((c) => ({
          id: c.id,
          name: c.name,
          state: c.state,
          deliveryFee: c.deliveryFee,
          pickupAvailable: c.pickupAvailable,
          officeAddress: c.officeAddress,
        }))}
        terms={settings.rentalTerms}
        onlinePayments={razorpayEnabled()}
        advancePercent={num(settings, "advancePercent", 50)}
      />
    </Container>
  );
}
