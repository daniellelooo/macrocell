"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GitCompare, X } from "lucide-react";
import { useCompareStore } from "@/lib/compare-store";

/**
 * Barra flotante inferior que aparece cuando hay 1+ productos seleccionados
 * para comparar. Se posiciona arriba del BottomNav en mobile y al fondo en
 * desktop. Click en "Comparar" lleva a /comparar.
 */
export default function CompareBar() {
  const slugs = useCompareStore((s) => s.slugs);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted || slugs.length === 0) return null;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-30 bg-neutral-900 text-white rounded-full shadow-2xl px-3 py-2 flex items-center gap-2 max-w-[95vw]"
      style={{ bottom: "calc(76px + env(safe-area-inset-bottom))" }}
    >
      <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold pl-2">
        <GitCompare size={13} />
        {slugs.length}/4
      </span>
      <span className="sm:hidden flex items-center gap-1 text-xs font-semibold pl-1.5">
        <GitCompare size={12} />
        {slugs.length}
      </span>
      <div className="flex gap-1">
        {slugs.map((s) => (
          <button
            key={s}
            onClick={() => remove(s)}
            title={`Quitar ${s}`}
            aria-label={`Quitar ${s} del comparador`}
            className="bg-white/10 hover:bg-white/20 rounded-full px-2 py-1 text-[10px] font-medium flex items-center gap-1 transition"
          >
            <span className="max-w-[80px] truncate">{s}</span>
            <X size={10} />
          </button>
        ))}
      </div>
      <Link
        href="/comparar"
        className="bg-[#3B9DD8] hover:bg-[#2A84BE] text-white text-xs font-bold px-4 py-2 rounded-full transition active:scale-95 ml-1"
      >
        Comparar
      </Link>
      <button
        onClick={clear}
        title="Limpiar comparador"
        aria-label="Limpiar comparador"
        className="text-neutral-400 hover:text-white p-1"
      >
        <X size={14} />
      </button>
    </div>
  );
}
