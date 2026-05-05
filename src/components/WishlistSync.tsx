"use client";

import { useEffect } from "react";
import { useWishlistStore } from "@/lib/wishlist-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Sincroniza la wishlist local con la tabla `wishlists` de Supabase cuando
 * hay sesión activa. Estrategia:
 *
 *  1. Al montar / al login: lee la wishlist remota y hace UNION con la local.
 *     - Items locales que no estaban remotos → upsert en BD.
 *     - El estado final del store es la unión.
 *  2. Al logout: vacía el store local (los favoritos eran del usuario, no
 *     deberían quedar en el navegador del siguiente que use el equipo).
 *
 * Se monta una sola vez en el layout.
 */
export default function WishlistSync() {
  const setAll = useWishlistStore((s) => s.setAll);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    async function syncFromRemote() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Local actual al momento del sync (no se subscribe al store; un solo
      // snapshot es suficiente porque el sync corre solo al login/montaje).
      const localSlugs = useWishlistStore.getState().slugs;

      const { data: remoteRows, error } = await supabase
        .from("wishlists")
        .select("product_slug")
        .eq("user_id", user.id);

      if (error) {
        console.warn("[wishlist-sync] read remoto falló", error);
        return;
      }

      const remoteSlugs = new Set((remoteRows ?? []).map((r) => r.product_slug));
      const localSet = new Set(localSlugs);
      const merged = Array.from(new Set([...localSet, ...remoteSlugs]));

      // Items locales que no están en remoto → push.
      const toPush = localSlugs.filter((s) => !remoteSlugs.has(s));
      if (toPush.length > 0) {
        await supabase.from("wishlists").upsert(
          toPush.map((slug) => ({ user_id: user.id, product_slug: slug })),
          { onConflict: "user_id,product_slug" }
        );
      }

      setAll(merged);
    }

    void syncFromRemote();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void syncFromRemote();
      }
      if (event === "SIGNED_OUT") {
        setAll([]);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [setAll]);

  return null;
}
