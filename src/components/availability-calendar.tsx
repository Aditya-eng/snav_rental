import type { CalendarDay } from "@/lib/availability";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const monthFmt = new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" });

/** Read-only availability grid for the next few weeks, Monday-first. */
export function AvailabilityCalendar({ days }: { days: CalendarDay[] }) {
  if (!days.length) return null;
  const total = days[0].total;
  if (total === 0) {
    return <p className="text-sm text-slate-600">Availability on request — contact us to check dates.</p>;
  }
  const first = new Date(`${days[0].date}T00:00:00Z`);
  const lead = (first.getUTCDay() + 6) % 7; // Monday = 0
  const cells: (CalendarDay | null)[] = [...Array(lead).fill(null), ...days];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} />;
          const d = new Date(`${day.date}T00:00:00Z`);
          const state = day.available === 0 ? "none" : day.available < day.total ? "some" : "all";
          return (
            <div
              key={day.date}
              title={`${day.date}: ${day.available} of ${day.total} available`}
              className={cn(
                "flex h-11 flex-col items-center justify-center rounded-md text-xs",
                state === "all" && "bg-emerald-50 text-emerald-900",
                state === "some" && "bg-amber-50 text-amber-900",
                state === "none" && "bg-red-50 text-red-800 line-through",
              )}
            >
              <span className="font-semibold">{d.getUTCDate()}</span>
              {d.getUTCDate() === 1 || i === lead ? <span className="text-[10px] leading-none opacity-70">{monthFmt.format(d)}</span> : null}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-emerald-100 ring-1 ring-emerald-300" />Available</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-amber-100 ring-1 ring-amber-300" />Limited</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-red-100 ring-1 ring-red-300" />Booked</span>
      </div>
    </div>
  );
}
