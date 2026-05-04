"use client";

import { useState, useMemo } from "react";
import { Search, Minus, Plus, CheckCircle, AlertCircle, LogOut, ExternalLink, RotateCcw } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCatalogStore } from "@/lib/catalog-store";
import { formatPrice, conditionLabels } from "@/lib/products";
import { logout } from "@/lib/admin-auth";

type SaleResult = {
  ok: boolean;
  sku: string;
  productName: string;
  qty: number;
  orderId?: string;
  undone?: boolean;
  error?: string;
};

export default function VendedorPage() {
  const products = useCatalogStore((s) => s.products);
  const [query, setQuery] = useState("");
  const [qty, setQty] = useState(1);
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [results, setResults] = useState<SaleResult[]>([]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return products
      .filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.variants.some((v) => v.sku.toLowerCase().includes(q) || (v.storage ?? "").toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [products, query]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const selectedVariant = useMemo(() => {
    if (!selectedSku) return null;
    for (const p of products) {
      const v = p.variants.find((v) => v.sku === selectedSku);
      if (v) return { product: p, variant: v };
    }
    return null;
  }, [products, selectedSku]);

  const handleSale = async () => {
    if (!selectedVariant) return;
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data: orderId, error } = await supabase.rpc("register_local_sale", {
      p_sku: selectedSku!,
      p_qty: qty,
      p_notes: "Venta local",
    });
    const result: SaleResult = {
      ok: !error,
      sku: selectedSku!,
      productName: selectedVariant.product.name,
      qty,
      orderId: orderId ?? undefined,
      error: error?.message,
    };
    setResults((prev) => [result, ...prev].slice(0, 20));
    if (!error) {
      setSelectedSku(null);
      setQuery("");
      setQty(1);
    }
    setLoading(false);
  };

  const handleUndo = async (orderId: string) => {
    setUndoingId(orderId);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.rpc("undo_local_sale", { p_order_id: orderId });
    if (!error) {
      setResults((prev) =>
        prev.map((r) =>
          r.orderId === orderId ? { ...r, undone: true } : r
        )
      );
    } else {
      setResults((prev) =>
        prev.map((r) =>
          r.orderId === orderId ? { ...r, error: error.message } : r
        )
      );
    }
    setUndoingId(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Header */}
      <header className="bg-[#0C1014] text-white px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Portal</p>
          <h1 className="text-lg font-bold">Vendedor — Macrocell</h1>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/admin"
            className="text-xs text-neutral-400 hover:text-white transition flex items-center gap-1"
          >
            <ExternalLink size={13} /> Admin
          </a>
          <button
            onClick={() => { logout().then(() => { window.location.href = "/admin"; }); }}
            className="text-xs text-neutral-400 hover:text-white transition flex items-center gap-1"
          >
            <LogOut size={13} /> Salir
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-5 py-8 space-y-6">
        {/* Instrucción */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">¿Hiciste una venta en el local?</p>
          <p className="text-blue-600">
            Busca el producto, selecciona la variante, ajusta la cantidad y registra la venta para descontar el stock.
          </p>
        </div>

        {/* Buscador */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedSku(null); }}
              placeholder="Buscar producto o SKU…"
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
            />
          </div>

          {/* Resultados de búsqueda */}
          {filtered.length > 0 && !selectedSku && (
            <div className="space-y-1">
              {filtered.map((p) =>
                p.variants.map((v) => (
                  <button
                    key={v.sku}
                    onClick={() => { setSelectedSku(v.sku); setQuery(p.name); }}
                    className="w-full text-left flex items-center justify-between px-4 py-3 rounded-xl hover:bg-neutral-50 border border-neutral-100 transition"
                  >
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{p.name}</p>
                      <p className="text-xs text-neutral-500">
                        {[v.storage, v.ram, conditionLabels[v.condition], v.notes].filter(Boolean).join(" · ")}
                      </p>
                      <p className="text-[10px] font-mono text-neutral-400 mt-0.5">{v.sku}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-bold text-neutral-900">{formatPrice(v.price)}</p>
                      <p className={`text-[11px] font-semibold ${(v.stockQuantity ?? 1) > 0 ? "text-green-600" : "text-red-600"}`}>
                        Stock: {v.stockQuantity ?? "—"}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Variante seleccionada */}
          {selectedVariant && (
            <div className="border border-[#3B9DD8]/20 bg-red-50/40 rounded-xl p-4 space-y-4">
              <div>
                <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wide mb-1">Producto seleccionado</p>
                <p className="text-base font-bold text-neutral-900">{selectedVariant.product.name}</p>
                <p className="text-sm text-neutral-600">
                  {[selectedVariant.variant.storage, selectedVariant.variant.ram, conditionLabels[selectedVariant.variant.condition], selectedVariant.variant.notes]
                    .filter(Boolean).join(" · ")}
                </p>
                <p className="text-xs font-mono text-neutral-400 mt-1">{selectedSku}</p>
                <p className="text-sm font-semibold text-neutral-700 mt-1">
                  {formatPrice(selectedVariant.variant.price)} ·{" "}
                  <span className={(selectedVariant.variant.stockQuantity ?? 1) > 0 ? "text-green-600" : "text-red-600"}>
                    Stock actual: {selectedVariant.variant.stockQuantity ?? "—"}
                  </span>
                </p>
              </div>

              {/* Selector de cantidad */}
              <div>
                <p className="text-xs font-bold text-neutral-600 uppercase tracking-wide mb-2">Unidades vendidas</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 rounded-xl border border-neutral-200 bg-white flex items-center justify-center hover:bg-neutral-50 transition"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="text-2xl font-bold w-12 text-center">{qty}</span>
                  <button
                    onClick={() => setQty((q) => q + 1)}
                    className="w-10 h-10 rounded-xl border border-neutral-200 bg-white flex items-center justify-center hover:bg-neutral-50 transition"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSale}
                  disabled={loading}
                  className="flex-1 py-3 bg-[#3B9DD8] text-white font-semibold rounded-xl text-sm hover:bg-[#2A84BE] transition disabled:opacity-50 active:scale-95"
                >
                  {loading ? "Registrando…" : `Registrar venta (−${qty} ud${qty > 1 ? "s" : ""})`}
                </button>
                <button
                  onClick={() => { setSelectedSku(null); setQuery(""); setQty(1); }}
                  className="px-4 py-3 border border-neutral-200 rounded-xl text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Historial de ventas de la sesión */}
        {results.length > 0 && (
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-100">
              <h2 className="text-sm font-bold text-neutral-800">Ventas registradas (sesión actual)</h2>
              <p className="text-xs text-neutral-400 mt-0.5">Puedes deshacer una venta si te equivocaste.</p>
            </div>
            <div className="divide-y divide-neutral-100">
              {results.map((r, i) => (
                <div key={i} className={`px-5 py-3 flex items-center gap-3 ${r.undone ? "opacity-50" : ""}`}>
                  {r.ok && !r.undone ? (
                    <CheckCircle size={16} className="text-green-500 shrink-0" />
                  ) : r.undone ? (
                    <RotateCcw size={16} className="text-neutral-400 shrink-0" />
                  ) : (
                    <AlertCircle size={16} className="text-red-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate">
                      {r.undone ? <s>{r.productName}</s> : r.productName}
                    </p>
                    <p className="text-xs text-neutral-500 font-mono">{r.sku} · −{r.qty} ud{r.qty > 1 ? "s" : ""}</p>
                    {r.error && !r.undone && <p className="text-xs text-red-600 mt-0.5">{r.error}</p>}
                    {r.undone && <p className="text-xs text-neutral-400 mt-0.5">Venta deshecha · stock restaurado</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.ok && !r.undone && r.orderId && (
                      <button
                        onClick={() => handleUndo(r.orderId!)}
                        disabled={undoingId === r.orderId}
                        className="text-[11px] font-semibold text-neutral-500 hover:text-red-600 border border-neutral-200 hover:border-red-200 px-2.5 py-1 rounded-lg transition disabled:opacity-40 flex items-center gap-1"
                        title="Deshacer esta venta"
                      >
                        <RotateCcw size={11} />
                        {undoingId === r.orderId ? "…" : "Deshacer"}
                      </button>
                    )}
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      r.undone
                        ? "bg-neutral-100 text-neutral-500"
                        : r.ok
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                    }`}>
                      {r.undone ? "Deshecha" : r.ok ? "OK" : "Error"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
