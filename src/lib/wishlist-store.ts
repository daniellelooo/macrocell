"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getSupabaseBrowserClient } from "./supabase/client";

/**
 * Wishlist con sincronización opcional a Supabase.
 *
 * - Guests: se persiste en localStorage (zustand persist).
 * - Usuarios autenticados: además de localStorage, se replica en la tabla
 *   `wishlists` (RLS por user_id). Al login, se hace `merge` (union) entre
 *   lo que estaba local y lo que estaba en la BD.
 *
 * El store no toca Supabase si no hay sesión — la sincronización se dispara
 * desde `WishlistSync` (componente cliente montado en el layout) que escucha
 * `onAuthStateChange`.
 */

type WishlistStore = {
  slugs: string[];
  /** Toggle: si el usuario está autenticado, también persiste en Supabase. */
  toggle: (slug: string) => Promise<void>;
  has: (slug: string) => boolean;
  clear: () => void;
  /** Reemplaza el set local con el provisto (usado al hidratar desde Supabase). */
  setAll: (slugs: string[]) => void;
};

async function persistRemote(slug: string, op: "add" | "remove"): Promise<void> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (op === "add") {
      await supabase.from("wishlists").upsert(
        { user_id: user.id, product_slug: slug },
        { onConflict: "user_id,product_slug" }
      );
    } else {
      await supabase
        .from("wishlists")
        .delete()
        .eq("user_id", user.id)
        .eq("product_slug", slug);
    }
  } catch (err) {
    // Sin sesión / error de red: el cambio queda en local.
    console.warn("[wishlist] sync remoto falló", err);
  }
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      slugs: [],

      toggle: async (slug) => {
        const had = get().slugs.includes(slug);
        set((state) => ({
          slugs: had
            ? state.slugs.filter((s) => s !== slug)
            : [...state.slugs, slug],
        }));
        await persistRemote(slug, had ? "remove" : "add");
      },

      has: (slug) => get().slugs.includes(slug),

      clear: () => set({ slugs: [] }),

      setAll: (slugs) => set({ slugs }),
    }),
    { name: "macrocell-wishlist-v1" }
  )
);
