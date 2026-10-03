import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { readUpload } from "@/lib/storage";

// KYC documents: visible to the customer who uploaded them and to staff with customer access.
export async function GET(_req: Request, ctx: RouteContext<"/api/files/kyc/[id]">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const doc = await db.kycDocument.findUnique({ where: { id } });
  if (!doc || (doc.userId !== user.id && !canAccess(user.role, "customers"))) return new Response("Not found", { status: 404 });
  const file = await readUpload(doc.fileRef);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(file.body, {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="${doc.fileName.replace(/[^\w.\- ]/g, "_")}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
