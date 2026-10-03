import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "PLACED", label: "Placed" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "DISPATCHED", label: "On rent" },
  { key: "RETURNED", label: "Returned" },
  { key: "COMPLETED", label: "Deposit settled" },
];

const ORDER: Record<string, number> = { PENDING_PAYMENT: 0, REQUESTED: 0, CONFIRMED: 1, DISPATCHED: 2, RETURNED: 3, COMPLETED: 4 };

export function BookingProgress({ status }: { status: string }) {
  if (status === "CANCELLED") return null;
  const current = ORDER[status] ?? 0;
  return (
    <ol className="flex items-center gap-2 overflow-x-auto text-xs sm:text-sm">
      {STEPS.map((step, i) => (
        <li key={step.key} className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              i < current || (i === current && status === "COMPLETED") ? "bg-emerald-600 text-white" : i === current ? "bg-orange-600 text-white" : "bg-slate-200 text-slate-500",
            )}
          >
            {i < current || (i === current && status === "COMPLETED") ? <Check className="size-3.5" /> : i + 1}
          </span>
          <span className={cn("whitespace-nowrap", i <= current ? "font-medium text-slate-900" : "text-slate-500")}>{step.label}</span>
          {i < STEPS.length - 1 ? <span className="h-px w-6 bg-slate-300 sm:w-10" aria-hidden /> : null}
        </li>
      ))}
    </ol>
  );
}
