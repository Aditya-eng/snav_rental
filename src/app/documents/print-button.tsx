"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex h-10 items-center gap-2 rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white hover:bg-navy-800"
    >
      <Printer className="size-4" aria-hidden /> Print / Save as PDF
    </button>
  );
}
