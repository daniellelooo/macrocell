"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, Variant } from "./products";
import { getDefaultVariant } from "./products";

export type CartItem = {
  product: Product;
  variant: Variant;
  quantity: number;
  selectedColor?: string;
};

type AddItemResult =
  | { ok: true; quantity: number }
  | { ok: false; reason: "out_of_stock" | "max_reached"; max: number };

type CartStore = {
  items: CartItem[];
  isOpen: boolean;
  /** Devuelve `ok: false` si la variante está agotada o ya alcanzó el tope de stock. */
  addItem: (
    product: Product,
    options?: { variant?: Variant; color?: string }
  ) => AddItemResult;
  removeItem: (sku: string) => void;
  updateQuantity: (sku: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  total: () => number;
  itemCount: () => number;
};

/** Stock disponible de una variante (cap superior para añadir al carrito). */
function maxStockOf(v: Variant): number {
  if (typeof v.stockQuantity === "number") return Math.max(0, v.stockQuantity);
  return v.inStock ? 1 : 0;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, options) => {
        const variant = options?.variant ?? getDefaultVariant(product);
        if (!variant) return { ok: false, reason: "out_of_stock", max: 0 };

        const max = maxStockOf(variant);
        if (max <= 0) {
          return { ok: false, reason: "out_of_stock", max: 0 };
        }

        const existing = get().items.find(
          (item) => item.variant.sku === variant.sku
        );
        const currentQty = existing?.quantity ?? 0;

        // Ya tope: no sumamos pero abrimos el cart para que el usuario lo vea
        if (currentQty >= max) {
          set({ isOpen: true });
          return { ok: false, reason: "max_reached", max };
        }

        const nextQty = currentQty + 1;

        set((state) => {
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.variant.sku === variant.sku
                  ? { ...item, quantity: nextQty }
                  : item
              ),
              isOpen: true,
            };
          }
          return {
            items: [
              ...state.items,
              {
                product,
                variant,
                quantity: 1,
                selectedColor: options?.color,
              },
            ],
            isOpen: true,
          };
        });

        return { ok: true, quantity: nextQty };
      },

      removeItem: (sku) => {
        set((state) => ({
          items: state.items.filter((item) => item.variant.sku !== sku),
        }));
      },

      updateQuantity: (sku, quantity) => {
        if (quantity <= 0) {
          get().removeItem(sku);
          return;
        }
        set((state) => ({
          items: state.items.map((item) => {
            if (item.variant.sku !== sku) return item;
            const max = maxStockOf(item.variant);
            const capped = max > 0 ? Math.min(quantity, max) : 0;
            return { ...item, quantity: capped };
          }),
        }));
      },

      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      total: () =>
        get().items.reduce(
          (sum, item) => sum + item.variant.price * item.quantity,
          0
        ),

      itemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    { name: "macrocell-cart-v2" }
  )
);
