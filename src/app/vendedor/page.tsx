"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Minus,
  Plus,
  CheckCircle,
  AlertCircle,
  LogOut,
  ExternalLink,
  RotateCcw,
  TrendingUp,
  Package,
  Zap,
  CreditCard,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCatalogStore } from "@/lib/catalog-store";
import { formatPrice, conditionLabels } from "@/lib/products";
import { logout } from "@/lib/admin-auth";

type SaleResult = {
  ok: boolean;
  sku: string;
  productName: string;
  qty: number;
  totalCop?: number;
  paymentMethod?: string;
  orderId?: string;
  undone?: boolean;
  error?: string;
  createdAt?: string;
};

type DbSale = {
  id: string;
  total_cop: number;
  created_at: string;
  status: string;
  payment_method_type: string | null;
  order_items: { product_name: string; variant_sku: string; quantity: number }[];
};

const LOW_STOCK = 2;

const PAYMENT_METHODS = [
  "Efectivo",
  "Tarjeta débito",
  "Tarjeta crédito",
  "Nequi",
  "Daviplata",
  "Transferencia",
  "Otro",
] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

function safeDate(s: string): Date {
  return new Date(s.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"));
}

function isToday(d: Date): boolean {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function VendedorPage() {
  const products = useCatalogStore((s) => s.products);
  const [sellerName, setSellerName] = useState<string>("");
  const [query, setQuery] = useState("");
  const [qty, setQty] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Efectivo");
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [results, setResults] = useState<SaleResult[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Cargar identidad del vendedor + historial reciente desde DB
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (!cancelled) setSellerName(profile?.full_name ?? "");

      const { data: orders } = await supabase
        .from("orders")
        .select("id, total_cop, created_at, status, payment_method_type, order_items(product_name, variant_sku, quantity)")
        .eq("seller_id", user.id)
        .eq("payment_provider", "local")
        .order("created_at", { ascending: false })
        .limit(20);

      if (cancelled) return;

      const rows: SaleResult[] = ((orders ?? []) as unknown as DbSale[]).map((o) => {
        const item = o.order_items?.[0];
        return {
          ok: true,
          undone: o.status === "cancelled",
          orderId: o.id,
          sku: item?.variant_sku ?? "",
          productName: item?.product_name ?? "Venta",
          qty: item?.quantity ?? 1,
          totalCop: o.total_cop,
          paymentMethod: o.payment_method_type ?? undefined,
          createdAt: o.created_at,
        };
      });
      setResults(rows);
      setHistoryLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

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

  // Top SKUs personales (más vendidos por este vendedor en su historial cargado)
  const quickPicks = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of results) {
      if (!r.ok || r.undone || !r.sku) continue;
      counts.set(r.sku, (counts.get(r.sku) ?? 0) + r.qty);
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    return top
      .map(([sku]) => {
        for (const p of products) {
          const v = p.variants.find((vv) => vv.sku === sku);
          if (v) return { product: p, variant: v };
        }
        return null;
      })
      .filter((x): x is { product: typeof products[0]; variant: typeof products[0]["variants"][0] } => !!x);
  }, [results, products]);

  // Resumen del día
  const todayStats = useMemo(() => {
    const todays = results.filter((r) => r.ok && !r.undone && r.createdAt && isToday(safeDate(r.createdAt)));
    return {
      sales: todays.length,
      revenue: todays.reduce((s, r) => s + (r.totalCop ?? 0), 0),
      units: todays.reduce((s, r) => s + r.qty, 0),
    };
  }, [results]);

  const stockOk = (selectedVariant?.variant.stockQuantity ?? 1) >= qty;
  const noStock = (selectedVariant?.variant.stockQuantity ?? 1) <= 0;

  const handleSale = useCallback(async () => {
    if (!selectedVariant || !stockOk || noStock) return;
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data: orderId, error } = await supabase.rpc("register_local_sale", {
      p_sku: selectedSku!,
      p_qty: qty,
      p_notes: "Venta local",
      p_payment_method_type: paymentMethod,
    });
    const result: SaleResult = {
      ok: !error,
      sku: selectedSku!,
      productName: selectedVariant.product.name,
      qty,
      totalCop: selectedVariant.variant.price * qty,
      paymentMethod,
      orderId: orderId ?? undefined,
      error: error?.message,
      createdAt: new Date().toISOString(),
    };
    setResults((prev) => [result, ...prev].slice(0, 50));
    if (!error) {
      setSelectedSku(null);
      setQuery("");
      setQty(1);
      // Mantenemos el método de pago seleccionado — típicamente el siguiente
      // cliente paga igual, así el vendedor no tiene que volver a tocarlo.
    }
    setLoading(false);
  }, [selectedVariant, selectedSku, qty, paymentMethod, stockOk, noStock]);

  const handleUndo = async (orderId: string) => {
    setUndoingId(orderId);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.rpc("undo_local_sale", { p_order_id: orderId });
    if (!error) {
      setResults((prev) =>
        prev.map((r) => (r.orderId === orderId ? { ...r, undone: true } : r))
      );
    } else {
      setResults((prev) =>
        prev.map((r) => (r.orderId === orderId ? { ...r, error: error.message } : r))
      );
    }
    setUndoingId(null);
  };

  const pickQuick = (sku: string, productName: string) => {
    setSelectedSku(sku);
    setQuery(productName);
    setQty(1);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Header */}
      <header className="bg-[#0C1014] text-white px-6 py-4 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Portal Vendedor</p>
          <h1 className="text-lg font-bold truncate">
            {sellerName ? sellerName : "Macrocell"}
          </h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
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

      <main className="max-w-xl mx-auto px-5 py-6 space-y-5">
        {/* Resumen del día */}
        <div className="bg-gradient-to-br from-[#0C1014] to-[#1a2230] text-white rounded-2xl p-5">
          <div className="flex items-center gap-1.5 mb-3">
            <TrendingUp size={13} className="text-[#3B9DD8]" />
            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Tu día</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-2xl font-bold">{todayStats.sales}</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">venta{todayStats.sales === 1 ? "" : "s"}</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{todayStats.units}</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">unidad{todayStats.units === 1 ? "" : "es"}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#3B9DD8] truncate">
                {todayStats.revenue >= 1_000_000
                  ? `$${(todayStats.revenue / 1_000_000).toFixed(1)}M`
                  : todayStats.revenue >= 1_000
                    ? `$${Math.round(todayStats.revenue / 1_000)}k`
                    : `$${todayStats.revenue}`}
              </p>
              <p className="text-[10px] text-neutral-400 mt-0.5">vendido</p>
            </div>
          </div>
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

          {/* Quick picks (tus más vendidos) */}
          {!selectedSku && !query && quickPicks.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1">
                <Zap size={10} className="text-amber-500" /> Tus más vendidos
              </p>
              <div className="flex flex-wrap gap-1.5">
                {quickPicks.map(({ product, variant }) => {
                  const stock = variant.stockQuantity ?? null;
                  const out = stock !== null && stock <= 0;
                  return (
                    <button
                      key={variant.sku}
                      onClick={() => pickQuick(variant.sku, product.name)}
                      disabled={out}
                      className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition ${
                        out
                          ? "border-neutral-200 bg-neutral-50 text-neutral-400 cursor-not-allowed"
                          : "border-neutral-200 bg-white text-neutral-700 hover:border-[#3B9DD8] hover:text-[#3B9DD8]"
                      }`}
                      title={out ? "Sin stock" : `Stock: ${stock ?? "—"}`}
                    >
                      {product.name.replace(/iPhone /i, "")} {variant.storage ?? ""}
                      {stock !== null && stock <= LOW_STOCK && !out && (
                        <span className="ml-1 text-amber-600">·{stock}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resultados de búsqueda */}
          {filtered.length > 0 && !selectedSku && (
            <div className="space-y-1">
              {filtered.map((p) =>
                p.variants.map((v) => {
                  const stock = v.stockQuantity ?? null;
                  const out = stock !== null && stock <= 0;
                  const low = stock !== null && stock > 0 && stock <= LOW_STOCK;
                  return (
                    <button
                      key={v.sku}
                      onClick={() => { if (!out) { setSelectedSku(v.sku); setQuery(p.name); } }}
                      disabled={out}
                      className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-xl border transition ${
                        out
                          ? "border-red-100 bg-red-50/30 cursor-not-allowed opacity-60"
                          : "border-neutral-100 hover:bg-neutral-50"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-neutral-900 truncate">{p.name}</p>
                        <p className="text-xs text-neutral-500 truncate">
                          {[v.storage, v.ram, conditionLabels[v.condition], v.notes].filter(Boolean).join(" · ")}
                        </p>
                        <p className="text-[10px] font-mono text-neutral-400 mt-0.5">{v.sku}</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-bold text-neutral-900">{formatPrice(v.price)}</p>
                        <p className={`text-[11px] font-semibold ${
                          out ? "text-red-600" : low ? "text-amber-600" : "text-green-600"
                        }`}>
                          {out ? "Sin stock" : low ? `¡Solo ${stock}!` : `Stock: ${stock ?? "—"}`}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Variante seleccionada */}
          {selectedVariant && (
            <div className={`border rounded-xl p-4 space-y-4 ${
              noStock ? "border-red-200 bg-red-50/40" : "border-[#3B9DD8]/20 bg-blue-50/30"
            }`}>
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
                    Stock: {selectedVariant.variant.stockQuantity ?? "—"}
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
                    disabled={(selectedVariant.variant.stockQuantity ?? Infinity) <= qty}
                    className="w-10 h-10 rounded-xl border border-neutral-200 bg-white flex items-center justify-center hover:bg-neutral-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {!stockOk && !noStock && (
                  <p className="text-[11px] text-amber-700 mt-2">
                    Sólo quedan {selectedVariant.variant.stockQuantity} unidades.
                  </p>
                )}
              </div>

              {/* Selector de método de pago */}
              <div>
                <p className="text-xs font-bold text-neutral-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <CreditCard size={11} className="text-neutral-400" /> Método de pago
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {PAYMENT_METHODS.map((m) => {
                    const active = paymentMethod === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`text-[11px] font-semibold px-2 py-2 rounded-lg border transition ${
                          active
                            ? "border-[#3B9DD8] bg-[#3B9DD8] text-white"
                            : "border-neutral-200 bg-white text-neutral-700 hover:border-[#3B9DD8] hover:text-[#3B9DD8]"
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSale}
                  disabled={loading || noStock || !stockOk}
                  className="flex-1 py-3 bg-[#3B9DD8] text-white font-semibold rounded-xl text-sm hover:bg-[#2A84BE] transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  {noStock
                    ? "Sin stock"
                    : loading
                      ? "Registrando…"
                      : `Registrar venta — ${formatPrice(selectedVariant.variant.price * qty)}`}
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

        {/* Historial */}
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-800">Tus ventas recientes</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                {historyLoaded ? `${results.length} en total · puedes deshacer si te equivocaste` : "Cargando historial…"}
              </p>
            </div>
            <a
              href="/admin/mis-ventas"
              className="text-[11px] text-[#3B9DD8] font-semibold hover:underline"
            >
              Ver todas
            </a>
          </div>
          {results.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Package size={28} className="text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">
                {historyLoaded ? "Aún no has registrado ventas." : "Cargando…"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 max-h-[480px] overflow-y-auto">
              {results.map((r, i) => {
                const date = r.createdAt ? safeDate(r.createdAt) : null;
                return (
                  <div key={r.orderId ?? i} className={`px-5 py-3 flex items-center gap-3 ${r.undone ? "opacity-50" : ""}`}>
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
                      <p className="text-xs text-neutral-500 font-mono truncate">
                        {r.sku} · −{r.qty} ud{r.qty > 1 ? "s" : ""}
                        {r.totalCop !== undefined && ` · ${formatPrice(r.totalCop)}`}
                        {r.paymentMethod && ` · ${r.paymentMethod}`}
                        {date && ` · ${date.toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`}
                      </p>
                      {r.error && !r.undone && <p className="text-xs text-red-600 mt-0.5">{r.error}</p>}
                    </div>
                    {r.ok && !r.undone && r.orderId && (
                      <button
                        onClick={() => handleUndo(r.orderId!)}
                        disabled={undoingId === r.orderId}
                        className="text-[11px] font-semibold text-neutral-500 hover:text-red-600 border border-neutral-200 hover:border-red-200 px-2.5 py-1 rounded-lg transition disabled:opacity-40 flex items-center gap-1 shrink-0"
                        title="Deshacer esta venta"
                      >
                        <RotateCcw size={11} />
                        {undoingId === r.orderId ? "…" : "Deshacer"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
