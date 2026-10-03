import type { TicketMessage } from "@prisma/client";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** Conversation view. `staffSide` flips which side counts as "you". */
export function TicketThread({ messages, staffSide }: { messages: TicketMessage[]; staffSide: boolean }) {
  return (
    <ul className="space-y-3 p-5">
      {messages.map((m) => {
        const mine = m.fromStaff === staffSide;
        return (
          <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-xl px-4 py-3 text-sm", mine ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-900")}>
              <p className={cn("text-xs font-semibold", mine ? "text-navy-200" : "text-slate-500")}>
                {m.fromStaff ? `${m.authorName} · SNAV team` : m.authorName} · {formatDateTime(m.createdAt)}
              </p>
              <p className="mt-1 whitespace-pre-line">{m.body}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
