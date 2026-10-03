import { BOOKING_STATUS, KYC_STATUS, UNIT_STATUS } from "@/lib/constants";
import { Badge } from "./ui";

export function BookingStatusBadge({ status }: { status: string }) {
  const s = BOOKING_STATUS[status] ?? { label: status, tone: "slate" as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function KycBadge({ status }: { status: string }) {
  const s = KYC_STATUS[status] ?? { label: status, tone: "slate" as const };
  return <Badge tone={s.tone}>KYC: {s.label}</Badge>;
}

export function UnitStatusBadge({ status }: { status: string }) {
  const s = UNIT_STATUS[status] ?? { label: status, tone: "slate" as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
