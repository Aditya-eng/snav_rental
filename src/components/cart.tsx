"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = { productId: string; quantity: number };
export type CartService = { serviceId: string; quantity: number; days: number };
export type Cart = { start: string; end: string; items: CartItem[]; services: CartService[] };

const KEY = "snav_cart_v1";
const EMPTY: Cart = { start: "", end: "", items: [], services: [] };

type CartApi = {
  cart: Cart;
  ready: boolean;
  count: number;
  setDates: (start: string, end: string) => void;
  setItem: (productId: string, quantity: number) => void;
  addItem: (productId: string, quantity: number) => void;
  setService: (serviceId: string, quantity: number, days: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartApi | null>(null);

function load(): Cart {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Cart>;
    return {
      start: typeof parsed.start === "string" ? parsed.start : "",
      end: typeof parsed.end === "string" ? parsed.end : "",
      items: Array.isArray(parsed.items) ? parsed.items.filter((i) => i && i.productId && i.quantity > 0) : [],
      services: Array.isArray(parsed.services) ? parsed.services.filter((s) => s && s.serviceId && s.quantity > 0) : [],
    };
  } catch {
    return EMPTY;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCart(load());
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setCart(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((fn: (c: Cart) => Cart) => {
    setCart((prev) => {
      const next = fn(prev);
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // storage unavailable (private mode) — cart still works for this page view
      }
      return next;
    });
  }, []);

  const api = useMemo<CartApi>(
    () => ({
      cart,
      ready,
      count: cart.items.reduce((s, i) => s + i.quantity, 0),
      setDates: (start, end) => update((c) => ({ ...c, start, end })),
      setItem: (productId, quantity) =>
        update((c) => {
          const items = c.items.filter((i) => i.productId !== productId);
          if (quantity > 0) items.push({ productId, quantity });
          return { ...c, items };
        }),
      addItem: (productId, quantity) =>
        update((c) => {
          const existing = c.items.find((i) => i.productId === productId);
          const items = existing
            ? c.items.map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i))
            : [...c.items, { productId, quantity }];
          return { ...c, items };
        }),
      setService: (serviceId, quantity, days) =>
        update((c) => {
          const services = c.services.filter((s) => s.serviceId !== serviceId);
          if (quantity > 0) services.push({ serviceId, quantity, days });
          return { ...c, services };
        }),
      clear: () => update(() => EMPTY),
    }),
    [cart, ready, update],
  );

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
