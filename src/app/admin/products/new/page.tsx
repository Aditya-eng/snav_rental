import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ProductForm } from "../product-form";

export const metadata = { title: "Add product" };

export default async function NewProductPage() {
  await requireStaff("products");
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div className="max-w-4xl">
      <Link href="/admin/products" className="text-sm text-slate-500 hover:text-slate-800">← Products</Link>
      <PageHeader title="Add product" />
      <ProductForm categories={categories} />
    </div>
  );
}
