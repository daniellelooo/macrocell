"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function VendedorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session?.user) { router.replace("/admin"); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_admin")
        .eq("id", session.user.id)
        .single();
      if (cancelled) return;
      const allowed = profile?.is_admin || ["admin", "vendedor", "gestor_inventario"].includes(profile?.role ?? "");
      if (!allowed) { router.replace("/admin"); return; }
      setChecked(true);
    })();
    return () => { cancelled = true; };
  }, [router]);

  if (!checked) {
    return (
      <div className="min-h-screen bg-[#0C1014] flex items-center justify-center text-neutral-500 text-sm">
        Verificando acceso…
      </div>
    );
  }

  return <>{children}</>;
}
