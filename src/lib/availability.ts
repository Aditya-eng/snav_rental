import { db } from "./db";
import { addDays, rentalDays, todayIST, toDateInput } from "./dates";
import { PAYMENT_HOLD_MINUTES } from "./constants";

/**
 * Stock is counted per product: units "in fleet" minus the quantity held by overlapping bookings.
 * Bookings hold stock while REQUESTED, CONFIRMED or DISPATCHED, and while awaiting online payment
 * for PAYMENT_HOLD_MINUTES after their last update. Overdue rentals (still DISPATCHED after the
 * end date) keep holding stock until they are marked returned.
 */
async function holdingBookings(productIds: string[], start: Date, end: Date, excludeBookingId?: string) {
  const holdCutoff = new Date(Date.now() - PAYMENT_HOLD_MINUTES * 60_000);
  const bookings = await db.booking.findMany({
    where: {
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      startDate: { lte: end },
      items: { some: { kind: "RENTAL", productId: { in: productIds } } },
      OR: [
        { status: { in: ["REQUESTED", "CONFIRMED"] }, endDate: { gte: start } },
        { status: "DISPATCHED" },
        { status: "PENDING_PAYMENT", updatedAt: { gte: holdCutoff }, endDate: { gte: start } },
      ],
    },
    select: {
      status: true,
      startDate: true,
      endDate: true,
      items: { where: { kind: "RENTAL" }, select: { productId: true, quantity: true } },
    },
  });
  const today = todayIST();
  return bookings
    .map((b) => ({
      ...b,
      effectiveEnd: b.status === "DISPATCHED" && b.endDate < today ? today : b.endDate,
    }))
    .filter((b) => b.effectiveEnd >= start);
}

export async function fleetCounts(productIds: string[]) {
  const groups = await db.unit.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds }, status: "ACTIVE" },
    _count: { _all: true },
  });
  const map = new Map<string, number>();
  for (const id of productIds) map.set(id, 0);
  for (const g of groups) map.set(g.productId, g._count._all);
  return map;
}

/** Booked quantity per product per day over [start, end]. */
export async function dailyDemand(productIds: string[], start: Date, end: Date, excludeBookingId?: string) {
  const days = rentalDays(start, end);
  const demand = new Map<string, number[]>();
  for (const id of productIds) demand.set(id, new Array(days).fill(0));
  const bookings = await holdingBookings(productIds, start, end, excludeBookingId);
  for (const b of bookings) {
    const from = Math.max(0, rentalDays(start, b.startDate) - 1);
    const to = Math.min(days - 1, rentalDays(start, b.effectiveEnd) - 1);
    for (const item of b.items) {
      const arr = item.productId ? demand.get(item.productId) : undefined;
      if (!arr) continue;
      for (let i = from; i <= to; i++) arr[i] += item.quantity;
    }
  }
  return demand;
}

/** Units of each product free for the whole period. */
export async function availableQuantities(productIds: string[], start: Date, end: Date, excludeBookingId?: string) {
  const unique = [...new Set(productIds)];
  const [fleet, demand] = await Promise.all([fleetCounts(unique), dailyDemand(unique, start, end, excludeBookingId)]);
  const result = new Map<string, number>();
  for (const id of unique) {
    const peak = Math.max(0, ...(demand.get(id) ?? [0]));
    result.set(id, Math.max(0, (fleet.get(id) ?? 0) - peak));
  }
  return result;
}

export type CalendarDay = { date: string; available: number; total: number };

export async function availabilityCalendar(productId: string, from: Date, days: number): Promise<CalendarDay[]> {
  const end = addDays(from, days - 1);
  const [fleet, demand] = await Promise.all([fleetCounts([productId]), dailyDemand([productId], from, end)]);
  const total = fleet.get(productId) ?? 0;
  const booked = demand.get(productId) ?? [];
  return Array.from({ length: days }, (_, i) => ({
    date: toDateInput(addDays(from, i)),
    total,
    available: Math.max(0, total - (booked[i] ?? 0)),
  }));
}
