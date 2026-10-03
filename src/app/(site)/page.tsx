import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarDays, FileText, GraduationCap, HardHat, MapPin, ShieldCheck, Star, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { Container, LinkButton } from "@/components/ui";
import { ProductCard } from "@/components/product-card";
import { ProductImage } from "@/components/product-image";

export default async function HomePage() {
  const [featured, cities, services, testimonials, faqs, cheapest] = await Promise.all([
    db.product.findMany({
      where: { active: true, featured: true },
      include: { category: true },
      orderBy: { sortOrder: "asc" },
      take: 4,
    }),
    db.city.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.service.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.testimonial.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, take: 3 }),
    db.faq.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, take: 4 }),
    db.product.findFirst({
      where: { active: true, rentable: true, dailyRate: { gt: 0 }, category: { slug: "gnss-receivers" } },
      orderBy: { dailyRate: "asc" },
    }),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] [background-size:24px_24px]" aria-hidden />
        <Container className="relative grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-orange-200 ring-1 ring-white/15">
              <BadgeCheck className="size-4" aria-hidden /> eSurvey RTK receivers · Rent or buy
            </p>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">
              DGPS & GNSS receivers on rent — <span className="text-orange-400">daily, weekly or monthly</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-300">
              Book survey-grade RTK rovers, base stations and controllers online. We deliver across India, or you can pick
              up from our office. Need hands on site? Add a certified operator or an on-site trainer.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/equipment" size="lg">
                Browse equipment <ArrowRight className="size-4" aria-hidden />
              </LinkButton>
              <Link
                href="/quote"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-white/40 px-6 font-semibold text-white hover:bg-white/10"
              >
                Bulk / long-term quote
              </Link>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-slate-400">Delivery cities</dt>
                <dd className="text-2xl font-bold">{cities.length}</dd>
              </div>
              {cheapest ? (
                <div>
                  <dt className="text-slate-400">Receivers from</dt>
                  <dd className="text-2xl font-bold">{formatINR(cheapest.dailyRate)}<span className="text-sm font-normal text-slate-400">/day</span></dd>
                </div>
              ) : null}
              <div>
                <dt className="text-slate-400">Invoices</dt>
                <dd className="text-2xl font-bold">GST</dd>
              </div>
            </dl>
          </div>
          <div className="relative hidden lg:block">
            <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
              <ProductImage name="GNSS receiver" category="gnss-receivers" className="h-80 rounded-xl" />
              <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                {["Daily", "Weekly", "Monthly"].map((p) => (
                  <div key={p} className="rounded-lg bg-white/10 px-3 py-2 font-semibold">{p}</div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section className="py-16">
        <Container>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">How renting works</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: CalendarDays, title: "Pick dates & kit", body: "Choose instruments and dates. We automatically apply the cheapest daily, weekly or monthly rate." },
              { icon: ShieldCheck, title: "Verify & pay", body: "Upload your KYC once, accept the rental agreement and pay online or as agreed." },
              { icon: Truck, title: "Delivery or pickup", body: "We deliver to your site in our service cities, or you collect from our office." },
              { icon: FileText, title: "Return & refund", body: "Return the kit, we inspect it and refund your deposit. GST invoice included." },
            ].map((step, i) => (
              <li key={step.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                    <step.icon className="size-5" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold text-slate-400">Step {i + 1}</span>
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Featured */}
      {featured.length ? (
        <section className="bg-white py-16">
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Popular instruments</h2>
                <p className="mt-2 text-slate-600">Survey-grade eSurvey GNSS receivers, ready to dispatch.</p>
              </div>
              <Link href="/equipment" className="inline-flex items-center gap-1 text-sm font-semibold text-orange-700 hover:text-orange-800">
                View all equipment <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      {/* Services */}
      {services.length ? (
        <section className="py-16">
          <Container>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Need people on site too?</h2>
            <p className="mt-2 max-w-2xl text-slate-600">Add these to any rental from your booking cart. Charged per day.</p>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {services.map((s, i) => {
                const Icon = i === 0 ? HardHat : GraduationCap;
                return (
                  <div key={s.id} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                      <Icon className="size-6" aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-semibold text-slate-900">{s.name}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{s.description}</p>
                      <p className="mt-3 text-sm">
                        <span className="text-lg font-bold text-slate-900">{formatINR(s.dailyRate)}</span>
                        <span className="text-slate-500">/day + GST</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Container>
        </section>
      ) : null}

      {/* Rent or buy */}
      <section className="bg-white py-16">
        <Container className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-orange-600 p-8 text-white">
            <h2 className="text-2xl font-bold">Rent for a project</h2>
            <p className="mt-2 text-orange-50">Short jobs, peak season or trying a model before you buy — rent by the day, week or month.</p>
            <LinkButton href="/equipment" variant="secondary" className="mt-6">Start a booking</LinkButton>
          </div>
          <div className="rounded-2xl bg-navy-900 p-8 text-white">
            <h2 className="text-2xl font-bold">Buy your own</h2>
            <p className="mt-2 text-slate-300">Every receiver we rent is also available to buy. Ask us about setup and training.</p>
            <LinkButton href="/equipment?mode=buy" className="mt-6">See purchase options</LinkButton>
          </div>
        </Container>
      </section>

      {/* Cities */}
      {cities.length ? (
        <section className="py-16">
          <Container>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Delivery across India</h2>
            <p className="mt-2 text-slate-600">
              Delivery to site in these cities{cities.some((c) => c.pickupAvailable) ? ", and office pickup where marked" : ""}.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {cities.map((c) => (
                <li key={c.id} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
                  <MapPin className="size-3.5 text-orange-600" aria-hidden />
                  {c.name}
                  {c.pickupAvailable ? <span className="text-xs font-semibold text-emerald-700">· pickup</span> : null}
                </li>
              ))}
            </ul>
            <Link href="/delivery" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-orange-700 hover:text-orange-800">
              Delivery fees and pickup offices <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Container>
        </section>
      ) : null}

      {/* Testimonials */}
      {testimonials.length ? (
        <section className="bg-white py-16">
          <Container>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">What our customers say</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {testimonials.map((t) => (
                <figure key={t.id} className="rounded-xl border border-slate-200 p-6">
                  <div className="flex gap-0.5 text-amber-500" aria-label={`${t.rating} out of 5`}>
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="size-4 fill-current" aria-hidden />
                    ))}
                  </div>
                  <blockquote className="mt-3 text-slate-700">“{t.quote}”</blockquote>
                  <figcaption className="mt-4 text-sm font-semibold text-slate-900">
                    {t.name}
                    {t.company ? <span className="font-normal text-slate-500"> · {t.company}</span> : null}
                  </figcaption>
                </figure>
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      {/* FAQ */}
      {faqs.length ? (
        <section className="py-16">
          <Container className="max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Common questions</h2>
            <div className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
              {faqs.map((f) => (
                <details key={f.id} className="group px-5 py-4">
                  <summary className="cursor-pointer list-none font-medium text-slate-900 marker:hidden">
                    <span className="flex items-center justify-between gap-4">
                      {f.question}
                      <span className="text-orange-600 transition group-open:rotate-45" aria-hidden>+</span>
                    </span>
                  </summary>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{f.answer}</p>
                </details>
              ))}
            </div>
            <Link href="/faq" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-orange-700 hover:text-orange-800">
              All questions <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Container>
        </section>
      ) : null}
    </>
  );
}
