"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_COMPARE = 4;

type CompareStore = {
  slugs: string[];
  add: (slug: string) => boolean;
  remove: (slug: string) => void;
  toggle: (slug: string) => boolean;
  has: (slug: string) => boolean;
  clear: () => void;
};

/**
 * Store del comparador de productos. Persiste hasta 4 slugs en localStorage
 * para que el usuario pueda navegar el catálogo y luego ir a /comparar.
 *
 * `add` retorna `false` si ya está al límite (la UI muestra un toast).
 */
export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      slugs: [],

      add: (slug) => {
        const { slugs } = get();
        if (slugs.includes(slug)) return true;
        if (slugs.length >= MAX_COMPARE) return false;
        set({ slugs: [...slugs, slug] });
        return true;
      },

      remove: (slug) =>
        set((state) => ({ slugs: state.slugs.filter((s) => s !== slug) })),

      toggle: (slug) => {
        const has = get().slugs.includes(slug);
        if (has) {
          get().remove(slug);
          return false;
        }
        return get().add(slug);
      },

      has: (slug) => get().slugs.includes(slug),

      clear: () => set({ slugs: [] }),
    }),
    { name: "macrocell-compare-v1" }
  )
);

export const COMPARE_LIMIT = MAX_COMPARE;
