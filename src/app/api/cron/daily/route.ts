import { db } from "@/lib/db";
import { addDays, formatDate, todayIST } from "@/lib/dates";
import { emailLayout, notifyAdmin, sendEmail, siteUrl } from "@/lib/notify";

// Runs once a day (see vercel.json): return reminders for rentals ending tomorrow and an
// overdue summary for the team.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });

  const today = todayIST();
  const tomorrow = addDays(today, 1);

  const endingTomorrow = await db.booking.findMany({
    where: { status: "DISPATCHED", endDate: tomorrow },
    include: { user: true },
  });
  for (const b of endingTomorrow) {
    await sendEmail(
      b.user.email,
      `Reminder: ${b.code} ends tomorrow`,
      emailLayout({
        heading: "Your rental ends tomorrow",
        paragraphs: [
          `Booking ${b.code} ends on ${formatDate(b.endDate)}. Please keep all equipment and accessories ready for collection/return.`,
          "Need more time? Request an extension from your booking page so we can check availability.",
        ],
        cta: { label: "Extend or view booking", url: siteUrl(`/account/bookings/${b.code}`) },
      }),
    );
  }

  const overdue = await db.booking.findMany({
    where: { status: "DISPATCHED", endDate: { lt: today } },
    include: { user: true },
    orderBy: { endDate: "asc" },
  });
  if (overdue.length) {
    await notifyAdmin(
      `${overdue.length} overdue rental${overdue.length > 1 ? "s" : ""}`,
      overdue.map((b) => `${b.code} — ${b.user.name} (${b.user.phone}), due ${formatDate(b.endDate)}`),
      "/admin/bookings?status=OVERDUE",
    );
  }

  return Response.json({ reminders: endingTomorrow.length, overdue: overdue.length });
}
