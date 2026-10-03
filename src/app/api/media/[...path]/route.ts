import { readUpload } from "@/lib/storage";

// Public product images. Only keys under media/ are served here.
export async function GET(_req: Request, ctx: RouteContext<"/api/media/[...path]">) {
  const { path } = await ctx.params;
  const key = path.join("/");
  if (!key.startsWith("media/")) return new Response("Not found", { status: 404 });
  const file = await readUpload(key);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(file.body, {
    headers: { "Content-Type": file.contentType, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
