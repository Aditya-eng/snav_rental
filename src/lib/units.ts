import "server-only";
import { db } from "./db";

/** Units of a product in the fleet, flagged if already assigned to another overlapping active booking. */
export async function candidateUnits(productId: string, start: Date, end: Date, bookingId: string) {
  const units = await db.unit.findMany({
    where: { productId, status: "ACTIVE" },
    include: {
      assignments: {
        where: {
          bookingId: { not: bookingId },
          booking: { status: { in: ["REQUESTED", "CONFIRMED", "DISPATCHED"] }, startDate: { lte: end }, endDate: { gte: start } },
        },
        include: { booking: { select: { code: true } } },
      },
    },
    orderBy: { serialNumber: "asc" },
  });
  return units.map((u) => ({ id: u.id, serialNumber: u.serialNumber, condition: u.condition, busyWith: u.assignments[0]?.booking.code ?? null }));
}
