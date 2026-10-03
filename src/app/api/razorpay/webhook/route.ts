import { settleRazorpayOrder } from "@/lib/booking";
import { verifyWebhookSignature } from "@/lib/razorpay";

// Backup confirmation path: Razorpay calls this even if the customer closes the browser after paying.
// Configure in Razorpay Dashboard → Webhooks with events payment.captured and order.paid.
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature)) return new Response("Invalid signature", { status: 400 });

  const event = JSON.parse(raw) as {
    event: string;
    payload?: { payment?: { entity?: { id: string; order_id: string; status: string } } };
  };
  const payment = event.payload?.payment?.entity;
  if ((event.event === "payment.captured" || event.event === "order.paid") && payment?.order_id) {
    await settleRazorpayOrder(payment.order_id, payment.id, "Razorpay");
  }
  return Response.json({ ok: true });
}
