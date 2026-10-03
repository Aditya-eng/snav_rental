"use client";

import type { RazorpayCheckout } from "@/app/(site)/payment-actions";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, cb: () => void) => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

function loadScript(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/** Opens Razorpay Checkout. Resolves with the signed response, or null if the person closed it. */
export async function openRazorpay(p: RazorpayCheckout): Promise<RazorpayResponse | null> {
  const ok = await loadScript();
  if (!ok || !window.Razorpay) throw new Error("Could not load the payment window. Check your connection and try again.");
  return new Promise((resolve) => {
    const rzp = new window.Razorpay!({
      key: p.keyId,
      order_id: p.orderId,
      amount: p.amount,
      currency: "INR",
      name: "SNAV",
      description: `Booking ${p.bookingCode}`,
      prefill: { name: p.name, email: p.email, contact: p.phone },
      theme: { color: "#ea580c" },
      handler: (res: RazorpayResponse) => resolve(res),
      modal: { ondismiss: () => resolve(null) },
    });
    rzp.open();
  });
}
