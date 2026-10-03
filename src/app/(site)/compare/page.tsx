import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { parseJson, tagsList, type Spec } from "@/lib/utils";
import { Button, Card, Container, Select } from "@/components/ui";
import { ProductImage } from "@/components/product-image";

export const metadata: Metadata = { title: "Compare GNSS Receivers" };

export default async function ComparePage(props: PageProps<"/compare">) {
  const sp = await props.searchParams;
  const all = await db.product.findMany({
    where: { active: true },
    include: { category: true },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });
  const picked = [sp.a, sp.b, sp.c].map((v) => (typeof v === "string" ? v : ""));
  const defaults = all.filter((p) => p.category.slug === "gnss-receivers").slice(0, 3).map((p) => p.slug);
  const slugs = picked.some(Boolean) ? picked : defaults;
  const products = slugs.map((s) => all.find((p) => p.slug === s)).filter((p): p is (typeof all)[number] => !!p);

  const specMaps = products.map((p) => new Map(parseJson<Spec[]>(p.specs, []).map((s) => [s.label, s.value])));
  const labels = [...new Set(specMaps.flatMap((m) => [...m.keys()]))];

  const rows: [string, (p: (typeof products)[number], i: number) => string][] = [
    ["Per day", (p) => (p.rentable && p.dailyRate ? formatINR(p.dailyRate) : "—")],
    ["Per week", (p) => (p.rentable && p.weeklyRate ? formatINR(p.weeklyRate) : "—")],
    ["Per month", (p) => (p.rentable && p.monthlyRate ? formatINR(p.monthlyRate) : "—")],
    ["Deposit", (p) => (p.rentable ? formatINR(p.deposit) : "—")],
    ["Buy", (p) => (!p.forSale ? "—" : p.salePrice ? formatINR(p.salePrice) : "On request")],
    ["Features", (p) => tagsList(p.tags).join(", ") || "—"],
    ...labels.map((label) => [label, (_p: (typeof products)[number], i: number) => specMaps[i].get(label) ?? "—"] as [string, (p: (typeof products)[number], i: number) => string]),
  ];

  return (
    <Container className="py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Compare models</h1>
      <form action="/compare" className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
        {(["a", "b", "c"] as const).map((key, i) => (
          <label key={key}>
            <span className="sr-only">Model {i + 1}</span>
            <Select name={key} defaultValue={slugs[i] ?? ""}>
              <option value="">— Select —</option>
              {all.map((p) => (
                <option key={p.id} value={p.slug}>{p.name}</option>
              ))}
            </Select>
          </label>
        ))}
        <Button type="submit" variant="secondary">Compare</Button>
      </form>

      {products.length ? (
        <Card className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr>
                <th className="w-44" />
                {products.map((p) => (
                  <th key={p.id} className="p-4 text-left align-top">
                    <ProductImage src={p.imageUrl} name={p.name} category={p.category.slug} className="mb-3 h-28 rounded-lg" />
                    <Link href={`/equipment/${p.slug}`} className="font-semibold text-slate-900 hover:text-orange-700">{p.name}</Link>
                    <p className="font-normal text-slate-500">{p.tagline}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, get]) => (
                <tr key={label} className="border-t border-slate-100">
                  <th scope="row" className="bg-slate-50 px-4 py-3 text-left font-medium text-slate-600">{label}</th>
                  {products.map((p, i) => (
                    <td key={p.id} className="px-4 py-3 text-slate-900">{get(p, i)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
    </Container>
  );
}
