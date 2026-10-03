import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { tagsList, cn } from "@/lib/utils";
import { Container, EmptyState, Input, Select, Button } from "@/components/ui";
import { ProductCard } from "@/components/product-card";

export const metadata: Metadata = {
  title: "DGPS & GNSS Equipment — Rent or Buy",
  description: "eSurvey GNSS RTK receivers, base stations and controllers available on daily, weekly and monthly rent across India, or to buy.",
};

export default async function EquipmentPage(props: PageProps<"/equipment">) {
  const sp = await props.searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const mode = one(sp.mode) === "buy" ? "buy" : "rent";
  const category = one(sp.category);
  const tag = one(sp.tag);
  const q = one(sp.q).trim();

  const where: Prisma.ProductWhereInput = {
    active: true,
    ...(mode === "buy" ? { forSale: true } : { rentable: true }),
    ...(category ? { category: { slug: category } } : {}),
    ...(tag ? { tags: { contains: tag } } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { tagline: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] } : {}),
  };

  const [products, categories, allTags] = await Promise.all([
    db.product.findMany({ where, include: { category: true }, orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }] }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.product.findMany({ where: { active: true }, select: { tags: true } }),
  ]);
  const tagOptions = [...new Set(allTags.flatMap((p) => tagsList(p.tags)))].sort();

  const modeHref = (m: string) => {
    const params = new URLSearchParams();
    if (m === "buy") params.set("mode", "buy");
    if (category) params.set("category", category);
    return `/equipment${params.size ? `?${params}` : ""}`;
  };

  return (
    <Container className="py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{mode === "buy" ? "Buy equipment" : "Rent equipment"}</h1>
          <p className="mt-2 text-slate-600">
            {mode === "buy"
              ? "Request a purchase quote for any instrument. Prices exclude GST."
              : "Prices exclude GST. The cheapest daily, weekly or monthly combination is applied automatically."}
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1" role="tablist" aria-label="Rent or buy">
          {(["rent", "buy"] as const).map((m) => (
            <Link
              key={m}
              href={modeHref(m)}
              role="tab"
              aria-selected={mode === m}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-semibold",
                mode === m ? "bg-navy-900 text-white" : "text-slate-700 hover:bg-slate-100",
              )}
            >
              {m === "rent" ? "Rent" : "Buy"}
            </Link>
          ))}
        </div>
      </div>

      <form className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1fr_220px_220px_auto]" action="/equipment">
        {mode === "buy" ? <input type="hidden" name="mode" value="buy" /> : null}
        <label className="relative">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" aria-hidden />
          <Input name="q" defaultValue={q} placeholder="Search models, e.g. E600" className="pl-9" />
        </label>
        <label>
          <span className="sr-only">Category</span>
          <Select name="category" defaultValue={category}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </Select>
        </label>
        <label>
          <span className="sr-only">Feature</span>
          <Select name="tag" defaultValue={tag}>
            <option value="">Any feature</option>
            {tagOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </label>
        <Button type="submit" variant="secondary">Filter</Button>
      </form>

      <div className="mt-8">
        {products.length === 0 ? (
          <EmptyState title="No equipment matches these filters">
            <Link className="font-semibold text-orange-700" href={modeHref(mode)}>Clear filters</Link>
          </EmptyState>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} mode={mode} />
            ))}
          </div>
        )}
      </div>

      <p className="mt-10 text-sm text-slate-500">
        Not sure which model fits your job? <Link href="/compare" className="font-semibold text-orange-700">Compare models side by side</Link> or{" "}
        <Link href="/contact" className="font-semibold text-orange-700">ask us</Link>.
      </p>
    </Container>
  );
}
