"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type WishlistStore = {
  slugs: string[];
  toggle: (slug: string) => void;
  has: (slug: string) => boolean;
  clear: () => void;
};

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      slugs: [],

      toggle: (slug) =>
        set((state) => ({
          slugs: state.slugs.includes(slug)
            ? state.slugs.filter((s) => s !== slug)
            : [...state.slugs, slug],
        })),

      has: (slug) => get().slugs.includes(slug),

      clear: () => set({ slugs: [] }),
    }),
    { name: "macrocell-wishlist-v1" }
  )
);
