import { cn } from "@/lib/utils";

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-extrabold tracking-tight", className)}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <circle cx="16" cy="16" r="15" fill={light ? "#fff" : "#0b1f3a"} />
        <circle cx="16" cy="16" r="9" fill="none" stroke="#f97316" strokeWidth="2.5" />
        <path d="M16 3v6M16 23v6M3 16h6M23 16h6" stroke={light ? "#0b1f3a" : "#fff"} strokeWidth="2" strokeLinecap="round" />
        <circle cx="16" cy="16" r="2.5" fill="#f97316" />
      </svg>
      <span className={cn("text-xl", light ? "text-white" : "text-navy-900")}>
        SNAV<span className="text-orange-500">.</span>
      </span>
    </span>
  );
}
