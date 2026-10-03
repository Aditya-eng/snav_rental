"use client";

import { useEffect, useState } from "react";
import { getQuote } from "@/app/(site)/actions";
import type { CartInput, Quote } from "@/lib/quote";

/** Re-prices the cart on the server whenever the input changes (debounced). */
export function useQuote(input: CartInput | null) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const key = input ? JSON.stringify(input) : "";

  useEffect(() => {
    if (!key) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const q = await getQuote(JSON.parse(key) as CartInput);
        if (!cancelled) setQuote(q);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [key]);

  return { quote, loading };
}
