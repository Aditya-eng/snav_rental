import Link from "next/link";
import type { Category, Product } from "@prisma/client";
import { formatINR } from "@/lib/money";
import { tagsList } from "@/lib/utils";
import { ProductImage } from "./product-image";
import { Badge } from "./ui";

export function ProductCard({ product, mode = "rent" }: { product: Product & { category: Category }; mode?: "rent" | "buy" }) {
  const tags = tagsList(product.tags).slice(0, 3);
  return (
    <Link
      href={`/equipment/${product.slug}${mode === "buy" ? "#buy" : ""}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
    >
      <ProductImage src={product.imageUrl} name={product.name} category={product.category.slug} className="aspect-[4/3] border-b border-slate-100" />
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{product.category.name}</p>
        <h3 className="mt-1 font-semibold text-slate-900 group-hover:text-orange-700">{product.name}</h3>
        {product.tagline ? <p className="mt-1 text-sm text-slate-600 line-clamp-2">{product.tagline}</p> : null}
        {tags.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Badge key={t} tone="slate">{t}</Badge>
            ))}
          </div>
        ) : null}
        <div className="mt-auto pt-4">
          {mode === "buy" ? (
            <p className="text-sm text-slate-700">
              {product.salePrice ? (
                <>
                  <span className="text-lg font-bold text-slate-900">{formatINR(product.salePrice)}</span> + GST
                </>
              ) : (
                <span className="font-semibold text-slate-900">Price on request</span>
              )}
            </p>
          ) : product.rentable && product.dailyRate > 0 ? (
            <p className="text-sm text-slate-600">
              <span className="text-lg font-bold text-slate-900">{formatINR(product.dailyRate)}</span>/day
              {product.monthlyRate > 0 ? <span className="ml-2 text-slate-500">· {formatINR(product.monthlyRate)}/month</span> : null}
            </p>
          ) : (
            <p className="text-sm font-semibold text-slate-900">Available to buy</p>
          )}
        </div>
      </div>
    </Link>
  );
}
