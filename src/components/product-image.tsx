import { cn } from "@/lib/utils";

/**
 * Shows the uploaded product photo, or a clean line illustration matched to the category
 * until a photo is uploaded in the admin panel.
 */
export function ProductImage({
  src,
  name,
  category,
  className,
}: {
  src?: string | null;
  name: string;
  category?: string | null;
  className?: string;
}) {
  if (src) {
    return (
      <div className={cn("relative overflow-hidden bg-white", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} className="h-full w-full object-contain p-4" loading="lazy" />
      </div>
    );
  }
  return (
    <div
      className={cn("relative flex items-center justify-center overflow-hidden bg-gradient-to-b from-navy-50 to-white", className)}
      role="img"
      aria-label={name}
    >
      <svg viewBox="0 0 200 160" className="h-full max-h-56 w-auto" aria-hidden>
        {category === "controllers" ? <Controller /> : category === "accessories" ? <Tripod /> : <Receiver base={category === "base-stations"} />}
      </svg>
    </div>
  );
}

function Receiver({ base }: { base?: boolean }) {
  return (
    <g>
      <ellipse cx="100" cy="148" rx="46" ry="5" fill="#0b1f3a" opacity="0.08" />
      {base ? (
        <>
          <line x1="100" y1="92" x2="62" y2="146" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
          <line x1="100" y1="92" x2="138" y2="146" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
          <line x1="100" y1="92" x2="100" y2="148" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
        </>
      ) : (
        <rect x="96" y="92" width="8" height="56" rx="3" fill="#f97316" />
      )}
      <path d="M58 78 Q58 30 100 30 Q142 30 142 78 Z" fill="#e2e8f0" stroke="#0b1f3a" strokeWidth="3" />
      <rect x="54" y="76" width="92" height="18" rx="6" fill="#0b1f3a" />
      <circle cx="74" cy="85" r="3" fill="#22c55e" />
      <circle cx="86" cy="85" r="3" fill="#f97316" />
      <circle cx="98" cy="85" r="3" fill="#38bdf8" />
      <path d="M82 46 Q100 38 118 46" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  );
}

function Controller() {
  return (
    <g>
      <ellipse cx="100" cy="150" rx="34" ry="4" fill="#0b1f3a" opacity="0.08" />
      <rect x="70" y="16" width="60" height="128" rx="10" fill="#0b1f3a" />
      <rect x="76" y="26" width="48" height="62" rx="4" fill="#38bdf8" opacity="0.85" />
      <path d="M82 70 L94 54 L104 64 L118 44" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={80 + c * 15} y={98 + r * 13} width="11" height="8" rx="2" fill="#334155" />),
      )}
      <rect x="92" y="18" width="16" height="3" rx="1.5" fill="#f97316" />
    </g>
  );
}

function Tripod() {
  return (
    <g>
      <ellipse cx="100" cy="150" rx="50" ry="4" fill="#0b1f3a" opacity="0.08" />
      <rect x="80" y="30" width="40" height="10" rx="3" fill="#0b1f3a" />
      <line x1="88" y1="40" x2="56" y2="148" stroke="#f97316" strokeWidth="5" strokeLinecap="round" />
      <line x1="112" y1="40" x2="144" y2="148" stroke="#f97316" strokeWidth="5" strokeLinecap="round" />
      <line x1="100" y1="40" x2="100" y2="148" stroke="#ea580c" strokeWidth="5" strokeLinecap="round" />
      <rect x="92" y="20" width="16" height="10" rx="2" fill="#64748b" />
    </g>
  );
}
