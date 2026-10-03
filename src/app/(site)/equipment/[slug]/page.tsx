import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronRight, Download, GraduationCap, HardHat } from "lucide-react";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { addDays, todayIST, toDateInput } from "@/lib/dates";
import { availabilityCalendar } from "@/lib/availability";
import { getSettings, num } from "@/lib/settings";
import { parseJson, tagsList, type Spec } from "@/lib/utils";
import { Badge, Card, Container, LinkButton } from "@/components/ui";
import { ProductImage } from "@/components/product-image";
import { ProductCard } from "@/components/product-card";
import { BookingWidget } from "@/components/booking-widget";
import { AvailabilityCalendar } from "@/components/availability-calendar";

async function getProduct(slug: string) {
  return db.product.findFirst({ where: { slug, active: true }, include: { category: true } });
}

export async function generateMetadata(props: PageProps<"/equipment/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) return { title: "Not found" };
  return {
    title: `${product.name} on Rent & for Sale`,
    description: `${product.name} — ${product.tagline ?? ""}. Rent daily, weekly or monthly with delivery across India, or buy.`,
  };
}

export default async function ProductPage(props: PageProps<"/equipment/[slug]">) {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const settings = await getSettings();
  const minStart = addDays(todayIST(), num(settings, "minLeadDays", 1));
  const [calendar, services, related] = await Promise.all([
    product.rentable ? availabilityCalendar(product.id, todayIST(), 42) : Promise.resolve([]),
    db.service.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.product.findMany({
      where: { active: true, categoryId: product.categoryId, id: { not: product.id } },
      include: { category: true },
      orderBy: { sortOrder: "asc" },
      take: 4,
    }),
  ]);

  const specs = parseJson<Spec[]>(product.specs, []);
  const features = parseJson<string[]>(product.features, []);
  const tags = tagsList(product.tags);
  const canRent = product.rentable && product.dailyRate > 0;

  return (
    <Container className="py-8">
      <nav className="flex items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/equipment" className="hover:text-slate-800">Equipment</Link>
        <ChevronRight className="size-4" aria-hidden />
        <Link href={`/equipment?category=${product.category.slug}`} className="hover:text-slate-800">{product.category.name}</Link>
        <ChevronRight className="size-4" aria-hidden />
        <span className="text-slate-800">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="min-w-0">
          <div className="grid gap-6 md:grid-cols-2">
            <ProductImage src={product.imageUrl} name={product.name} category={product.category.slug} className="aspect-square rounded-xl border border-slate-200" />
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-orange-700">{product.brand}</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{product.name}</h1>
              {product.tagline ? <p className="mt-2 text-lg text-slate-600">{product.tagline}</p> : null}
              {tags.length ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </div>
              ) : null}
              <p className="mt-5 leading-7 text-slate-700">{product.description}</p>
              {canRent || product.forSale ? (
                <div className="mt-5 flex flex-wrap gap-2 lg:hidden">
                  {canRent ? <LinkButton href="#rent">Check dates & book</LinkButton> : null}
                  {product.forSale ? <LinkButton href="#buy" variant="outline">Buy</LinkButton> : null}
                </div>
              ) : null}
              {product.datasheetUrl ? (
                <a href={product.datasheetUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-700 hover:text-orange-800">
                  <Download className="size-4" aria-hidden /> Download datasheet
                </a>
              ) : null}
            </div>
          </div>

          {canRent ? (
            <section className="mt-10">
              <h2 className="text-xl font-semibold text-slate-900">Rental rates</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Per day", product.dailyRate],
                  ["Per week", product.weeklyRate],
                  ["Per month", product.monthlyRate],
                  ["Refundable deposit", product.deposit],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{(value as number) > 0 ? formatINR(value as number) : "—"}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-sm text-slate-500">Rates exclude {settings.gstRate}% GST. We always bill the cheapest combination for your dates.</p>
            </section>
          ) : null}

          {features.length ? (
            <section className="mt-10">
              <h2 className="text-xl font-semibold text-slate-900">Highlights</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {features.map((f) => (
                  <li key={f} className="flex gap-2 text-slate-700">
                    <Check className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {specs.length ? (
            <section className="mt-10">
              <h2 className="text-xl font-semibold text-slate-900">Specifications</h2>
              <dl className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {specs.map((s) => (
                  <div key={s.label} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[200px_1fr]">
                    <dt className="font-medium text-slate-500">{s.label}</dt>
                    <dd className="text-slate-900">{s.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-xs text-slate-500">Specifications as published by the manufacturer. Confirm critical specs with us before booking.</p>
            </section>
          ) : null}

          {canRent ? (
            <section className="mt-10">
              <h2 className="text-xl font-semibold text-slate-900">Availability — next 6 weeks</h2>
              <div className="mt-4 max-w-md">
                <AvailabilityCalendar days={calendar} />
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {canRent ? (
            <Card className="scroll-mt-24 p-5" id="rent">
              <h2 className="text-lg font-semibold text-slate-900">Rent this instrument</h2>
              <p className="mb-4 mt-1 text-sm text-slate-500">From {formatINR(product.dailyRate)}/day</p>
              <BookingWidget
                product={{
                  id: product.id,
                  name: product.name,
                  dailyRate: product.dailyRate,
                  weeklyRate: product.weeklyRate,
                  monthlyRate: product.monthlyRate,
                  deposit: product.deposit,
                }}
                minStart={toDateInput(minStart)}
                gstRate={num(settings, "gstRate", 18)}
              />
            </Card>
          ) : null}

          {product.forSale ? (
            <Card className="scroll-mt-24 p-5" id="buy">
              <h2 className="text-lg font-semibold text-slate-900">Buy this instrument</h2>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {product.salePrice ? (
                  <>
                    {formatINR(product.salePrice)} <span className="text-sm font-normal text-slate-500">+ GST</span>
                  </>
                ) : (
                  "Price on request"
                )}
              </p>
              <p className="mt-1 text-sm text-slate-500">Ask us about setup support, training and demo units.</p>
              <LinkButton href={`/quote?type=purchase&product=${product.slug}`} variant="secondary" className="mt-4 w-full">
                Get purchase quote
              </LinkButton>
            </Card>
          ) : null}

          {services.length && canRent ? (
            <Card className="p-5">
              <h2 className="font-semibold text-slate-900">Add people to your rental</h2>
              <ul className="mt-3 space-y-3 text-sm">
                {services.map((s, i) => {
                  const Icon = i === 0 ? HardHat : GraduationCap;
                  return (
                    <li key={s.id} className="flex gap-3">
                      <Icon className="mt-0.5 size-5 shrink-0 text-navy-600" aria-hidden />
                      <span>
                        <span className="font-medium text-slate-900">{s.name}</span>
                        <span className="text-slate-500"> — {formatINR(s.dailyRate)}/day</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-slate-500">Add them in your booking cart.</p>
            </Card>
          ) : null}
        </aside>
      </div>

      {related.length ? (
        <section className="mt-16">
          <h2 className="text-xl font-semibold text-slate-900">More in {product.category.name}</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </Container>
  );
}
