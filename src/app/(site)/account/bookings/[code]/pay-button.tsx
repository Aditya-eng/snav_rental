"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@/components/ui";
import { openRazorpay } from "@/components/razorpay";
import { startPayment, verifyPayment } from "../../../payment-actions";

export function PayButton({ code, label }: { code: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={() => {
          setError(null);
          start(async () => {
            const res = await startPayment(code);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            try {
              const rz = await openRazorpay(res.payment);
              if (!rz) return;
              const v = await verifyPayment({ orderId: rz.razorpay_order_id, paymentId: rz.razorpay_payment_id, signature: rz.razorpay_signature });
              if (!v.ok) setError(v.error ?? "Payment could not be verified.");
              router.replace(`/account/bookings/${code}${v.ok ? "?paid=1" : ""}`);
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Payment failed.");
            }
          });
        }}
      >
        {pending ? "Opening payment…" : label}
      </Button>
      {error ? <Alert tone="red" className="mt-3">{error}</Alert> : null}
    </div>
  );
}
