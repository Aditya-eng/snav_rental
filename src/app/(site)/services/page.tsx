import type { Metadata } from "next";
import { GraduationCap, HardHat } from "lucide-react";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { Card, Container, LinkButton } from "@/components/ui";

export const metadata: Metadata = {
  title: "Certified DGPS Operators & On-site Training",
  description: "Hire a certified DGPS operator / surveyor or an on-site trainer along with your GNSS equipment rental, charged per day.",
};

export default async function ServicesPage() {
  const services = await db.service.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  return (
    <Container className="py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Operators & on-site training</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Don&apos;t have a trained surveyor for the job, or want your team to learn the instrument properly? Add these to any rental from your booking cart.
      </p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {services.map((s, i) => {
          const Icon = i === 0 ? HardHat : GraduationCap;
          return (
            <Card key={s.id} className="p-6">
              <span className="inline-flex size-12 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                <Icon className="size-6" aria-hidden />
              </span>
              <h2 className="mt-4 text-xl font-semibold text-slate-900">{s.name}</h2>
              <p className="mt-2 leading-7 text-slate-600">{s.description}</p>
              <p className="mt-4">
                <span className="text-2xl font-bold text-slate-900">{formatINR(s.dailyRate)}</span>
                <span className="text-slate-500"> per person per day + GST</span>
              </p>
            </Card>
          );
        })}
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <LinkButton href="/equipment" size="lg">Start a booking</LinkButton>
        <LinkButton href="/quote" size="lg" variant="outline">Ask for a project quote</LinkButton>
      </div>
    </Container>
  );
}
