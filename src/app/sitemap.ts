import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://snavindia.com").replace(/\/$/, "");
  const products = await db.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } });
  const pages = ["", "/equipment", "/equipment?mode=buy", "/services", "/delivery", "/compare", "/quote", "/faq", "/contact", "/terms", "/refund-policy", "/privacy"];
  return [
    ...pages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...products.map((p) => ({ url: `${base}/equipment/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
