import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { readUpload } from "@/lib/storage";
import { parseJson } from "@/lib/utils";

// Dispatch/return inspection photos: visible to staff and to the booking's customer.
export async function GET(_req: Request, ctx: RouteContext<"/api/files/inspection/[id]/[index]">) {
  const { id, index } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const inspection = await db.inspection.findUnique({ where: { id }, include: { booking: { select: { userId: true } } } });
  if (!inspection || (inspection.booking.userId !== user.id && !canAccess(user.role, "bookings")))
    return new Response("Not found", { status: 404 });
  const key = parseJson<string[]>(inspection.photos, [])[Number(index)];
  const file = key ? await readUpload(key) : null;
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(file.body, {
    headers: { "Content-Type": file.contentType, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
