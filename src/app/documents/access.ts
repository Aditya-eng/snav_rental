import "server-only";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";

/** Loads a booking for a document page: the customer who owns it, or staff with booking access. */
export async function bookingForDocument(code: string, path: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const booking = await db.booking.findUnique({
    where: { code },
    include: { items: true, user: true, city: true, payments: { where: { status: "PAID" }, orderBy: { createdAt: "asc" } } },
  });
  if (!booking || (booking.userId !== user.id && !canAccess(user.role, "bookings"))) notFound();
  return booking;
}
