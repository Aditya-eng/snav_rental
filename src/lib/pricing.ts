// Picks the cheapest combination of monthly (30 days), weekly (7 days) and daily rates
// that covers the rental. Rounding up is allowed: 6 days can be billed as 1 week when
// that is cheaper than 6 daily rates.

export type Rates = { dailyRate: number; weeklyRate: number; monthlyRate: number };
export type PlanBreakdown = { months: number; weeks: number; days: number };
export type PriceResult = { amount: number; plan: PlanBreakdown; note: string };

const MONTH_DAYS = 30;
const WEEK_DAYS = 7;

export function bestRentalPrice(days: number, rates: Rates): PriceResult {
  const n = Math.max(1, Math.floor(days));
  const daily = rates.dailyRate > 0 ? rates.dailyRate : Infinity;
  const weekly = rates.weeklyRate > 0 ? rates.weeklyRate : Infinity;
  const monthly = rates.monthlyRate > 0 ? rates.monthlyRate : Infinity;

  const cost = new Array<number>(n + 1).fill(Infinity);
  const choice = new Array<"d" | "w" | "m" | null>(n + 1).fill(null);
  cost[0] = 0;
  for (let i = 1; i <= n; i++) {
    const viaDay = cost[i - 1] + daily;
    const viaWeek = cost[Math.max(0, i - WEEK_DAYS)] + weekly;
    const viaMonth = cost[Math.max(0, i - MONTH_DAYS)] + monthly;
    if (viaDay <= viaWeek && viaDay <= viaMonth) {
      cost[i] = viaDay;
      choice[i] = "d";
    } else if (viaWeek <= viaMonth) {
      cost[i] = viaWeek;
      choice[i] = "w";
    } else {
      cost[i] = viaMonth;
      choice[i] = "m";
    }
  }

  const plan: PlanBreakdown = { months: 0, weeks: 0, days: 0 };
  let i = n;
  while (i > 0 && choice[i]) {
    const c = choice[i];
    if (c === "d") {
      plan.days++;
      i -= 1;
    } else if (c === "w") {
      plan.weeks++;
      i = Math.max(0, i - WEEK_DAYS);
    } else {
      plan.months++;
      i = Math.max(0, i - MONTH_DAYS);
    }
  }

  const amount = Number.isFinite(cost[n]) ? cost[n] : 0;
  return { amount, plan, note: describePlan(plan) };
}

export function describePlan(plan: PlanBreakdown): string {
  const parts: string[] = [];
  if (plan.months) parts.push(`${plan.months} month${plan.months > 1 ? "s" : ""}`);
  if (plan.weeks) parts.push(`${plan.weeks} week${plan.weeks > 1 ? "s" : ""}`);
  if (plan.days) parts.push(`${plan.days} day${plan.days > 1 ? "s" : ""}`);
  return parts.join(" + ") || "—";
}

/** Price for a per-day service (operator, trainer). */
export function servicePrice(days: number, dailyRate: number): number {
  return Math.max(0, Math.floor(days)) * dailyRate;
}
