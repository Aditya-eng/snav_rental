import type { ReactNode } from "react";
import { Card, Container } from "./ui";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <Container className="flex justify-center py-12 sm:py-16">
      <div className="w-full max-w-md">
        <Card className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
        </Card>
        {footer ? <div className="mt-4 text-center text-sm text-slate-600">{footer}</div> : null}
      </div>
    </Container>
  );
}
