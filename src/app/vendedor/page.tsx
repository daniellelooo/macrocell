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
  ShoppingCart,
  X,
  User,
  Target,
  Award,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCatalogStore } from "@/lib/catalog-store";
import { formatPrice, conditionLabels, type Variant, type Product } from "@/lib/products";
import { logout } from "@/lib/admin-auth";

type CartItem = {
  sku: string;
  productName: string;
  variantLabel: string;
  unitPrice: number;
  qty: number;
  commissionPct: number;
  stockAvailable: number;
};

type SaleResult = {
  ok: boolean;
  orderId?: string;
  itemsCount: number;
  totalCop: number;
  commissionCop: number;
  paymentMethod: string;
  customerName?: string;
  undone?: boolean;
  error?: string;
  createdAt: string;
};

type DbSale = {
  id: string;
  total_cop: number;
  created_at: string;
  status: string;
  payment_method_type: string | null;
  customer_name: string | null;
  order_items: {
    product_name: string;
    variant_sku: string;
    quantity: number;
    unit_price_cop: number;
  }[];
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

function isCurrentMonth(d: Date): boolean {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function variantLabel(v: Variant): string {
  return [v.storage, v.ram, conditionLabels[v.condition], v.notes]
    .filter(Boolean)
    .join(" · ");
}

export default function VendedorPage() {
  const products = useCatalogStore((s) => s.products);
  const [sellerName, setSellerName] = useState<string>("");
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Efectivo");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [showCustomer, setShowCustomer] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [results, setResults] = useState<SaleResult[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [monthlyTarget, setMonthlyTarget] = useState<number>(0);

  // Cargar identidad, meta del mes e historial
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      setSellerId(user.id);

      const now = new Date();
      const [profileRes, ordersRes, targetRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
        supabase
          .from("orders")
          .select("id, total_cop, created_at, status, payment_method_type, customer_name, order_items(product_name, variant_sku, quantity, unit_price_cop)")
          .eq("seller_id", user.id)
          .eq("payment_provider", "local")
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("seller_targets")
          .select("target_cop")
          .eq("seller_id", user.id)
          .eq("period_year", now.getFullYear())
          .eq("period_month", now.getMonth() + 1)
          .maybeSingle(),
      ]);

      if (cancelled) return;
      setSellerName(profileRes.data?.full_name ?? "");
      setMonthlyTarget(targetRes.data?.target_cop ?? 0);

      const rows: SaleResult[] = ((ordersRes.data ?? []) as unknown as DbSale[]).map((o) => {
        // Calculamos comisión histórica multiplicando precio*qty*comisión actual
        // (nota: esto refleja la comisión actual de cada SKU, no la histórica)
        let commission = 0;
        for (const it of o.order_items ?? []) {
          const variant = findVariantBySku(products, it.variant_sku);
          if (variant) {
            commission += Math.round(
              (variant.commissionPct ?? 0) * it.unit_price_cop * it.quantity / 100
            );
          }
        }
        return {
          ok: true,
          undone: o.status === "cancelled",
          orderId: o.id,
          itemsCount: o.order_items?.length ?? 0,
          totalCop: o.total_cop,
          commissionCop: commission,
          paymentMethod: o.payment_method_type ?? "Efectivo",
          customerName: o.customer_name && o.customer_name !== "Venta local" ? o.customer_name : undefined,
          createdAt: o.created_at,
        };
      });
      setResults(rows);
      setHistoryLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [products]);

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

  // Stock disponible considerando lo que ya está en el carrito
  const stockAvailableFor = useCallback(
    (sku: string, baseStock: number): number => {
      const inCart = cart.find((c) => c.sku === sku)?.qty ?? 0;
      return Math.max(0, baseStock - inCart);
    },
    [cart]
  );

  const addToCart = useCallback((product: Product, variant: Variant) => {
    const baseStock = variant.stockQuantity ?? 0;
    setCart((prev) => {
      const existing = prev.find((c) => c.sku === variant.sku);
      if (existing) {
        if (existing.qty + 1 > baseStock) return prev;
        return prev.map((c) =>
          c.sku === variant.sku ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [
        ...prev,
        {
          sku: variant.sku,
          productName: product.name,
          variantLabel: variantLabel(variant),
          unitPrice: variant.price,
          qty: 1,
          commissionPct: variant.commissionPct ?? 0,
          stockAvailable: baseStock,
        },
      ];
    });
    setQuery("");
  }, []);

  const updateQty = (sku: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.sku !== sku) return c;
          const next = c.qty + delta;
          if (next < 1) return null;
          if (next > c.stockAvailable) return c;
          return { ...c, qty: next };
        })
        .filter((c): c is CartItem => c !== null)
    );
  };

  const removeFromCart = (sku: string) => {
    setCart((prev) => prev.filter((c) => c.sku !== sku));
  };

  const cartTotals = useMemo(() => {
    let total = 0;
    let units = 0;
    let commission = 0;
    for (const c of cart) {
      total += c.unitPrice * c.qty;
      units += c.qty;
      commission += Math.round((c.commissionPct * c.unitPrice * c.qty) / 100);
    }
    return { total, units, commission };
  }, [cart]);

  // Quick picks (top SKUs vendidos por este vendedor)
  const quickPicks = useMemo(() => {
    const counts = new Map<string, number>();
    // No tenemos acceso a items per-SKU del histórico en results, así que
    // sacamos los productos top usando el último año de ventas.
    // (Simplificación: usar SKUs en cart history sería complicado;
    //  en su lugar mostramos los más comunes del catálogo activo)
    for (const r of results) {
      // skip por ahora — los recientes serán el quick pick
      if (!r.ok || r.undone) continue;
    }
    counts.clear();
    return [];
  }, [results]);
  void quickPicks;

  // Resumen del día y mes
  const stats = useMemo(() => {
    const today = results.filter((r) => r.ok && !r.undone && isToday(safeDate(r.createdAt)));
    const month = results.filter((r) => r.ok && !r.undone && isCurrentMonth(safeDate(r.createdAt)));
    return {
      todaySales: today.length,
      todayRevenue: today.reduce((s, r) => s + r.totalCop, 0),
      todayUnits: today.reduce((s, r) => s + r.itemsCount, 0),
      monthRevenue: month.reduce((s, r) => s + r.totalCop, 0),
      monthCommission: month.reduce((s, r) => s + r.commissionCop, 0),
    };
  }, [results]);

  const targetProgress = monthlyTarget > 0 ? Math.min(100, (stats.monthRevenue / monthlyTarget) * 100) : 0;

  const handleRegisterSale = useCallback(async () => {
    if (cart.length === 0 || loading) return;
    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.rpc("register_local_sale_v2", {
      p_items: cart.map((c) => ({ sku: c.sku, qty: c.qty })),
      p_payment_method_type: paymentMethod,
      p_customer_name: customerName.trim() || undefined,
      p_customer_phone: customerPhone.trim() || undefined,
      p_notes: "Venta local",
    });

    const payload = data as {
      id: string;
      order_number: string;
      total_cop: number;
      items_count: number;
      commission_cop: number;
    } | null;

    const result: SaleResult = {
      ok: !error && !!payload,
      orderId: payload?.id,
      itemsCount: payload?.items_count ?? cart.reduce((s, c) => s + c.qty, 0),
      totalCop: payload?.total_cop ?? cartTotals.total,
      commissionCop: payload?.commission_cop ?? cartTotals.commission,
      paymentMethod,
      customerName: customerName.trim() || undefined,
      error: error?.message,
      createdAt: new Date().toISOString(),
    };

    setResults((prev) => [result, ...prev].slice(0, 50));
    if (!error) {
      setCart([]);
      setQuery("");
      setCustomerName("");
      setCustomerPhone("");
      setShowCustomer(false);
      // Mantenemos el método de pago seleccionado.
    }
    setLoading(false);
  }, [cart, paymentMethod, customerName, customerPhone, loading, cartTotals]);

  const handleUndo = async (orderId: string) => {
    setUndoingId(orderId);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.rpc("undo_local_sale", { p_order_id: orderId });
    if (!error) {
      setResults((prev) =>
        prev.map((r) => (r.orderId === orderId ? { ...r, undone: true } : r))
      );
    }
    setUndoingId(null);
  };

  void sellerId;

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
        {/* Card: Resumen del día */}
        <div className="bg-gradient-to-br from-[#0C1014] to-[#1a2230] text-white rounded-2xl p-5">
          <div className="flex items-center gap-1.5 mb-3">
            <TrendingUp size={13} className="text-[#3B9DD8]" />
            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Tu día</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-2xl font-bold">{stats.todaySales}</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">venta{stats.todaySales === 1 ? "" : "s"}</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.todayUnits}</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">unidad{stats.todayUnits === 1 ? "" : "es"}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#3B9DD8] truncate">
                {compactPrice(stats.todayRevenue)}
              </p>
              <p className="text-[10px] text-neutral-400 mt-0.5">vendido</p>
            </div>
          </div>
        </div>

        {/* Card: Meta del mes + comisión */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Meta */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Target size={12} className="text-[#3B9DD8]" />
              <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Meta del mes</p>
            </div>
            {monthlyTarget > 0 ? (
              <>
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-lg font-bold text-neutral-900">
                    {compactPrice(stats.monthRevenue)}
                  </p>
                  <p className="text-xs text-neutral-500">
                    de {compactPrice(monthlyTarget)}
                  </p>
                </div>
                <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      targetProgress >= 100
                        ? "bg-green-500"
                        : targetProgress >= 75
                          ? "bg-[#3B9DD8]"
                          : targetProgress >= 40
                            ? "bg-amber-400"
                            : "bg-red-400"
                    }`}
                    style={{ width: `${targetProgress}%` }}
                  />
                </div>
                <p className="text-[11px] text-neutral-500 mt-1.5">
                  {targetProgress >= 100
                    ? "🎉 ¡Meta alcanzada!"
                    : `${Math.round(targetProgress)}% de tu meta`}
                </p>
              </>
            ) : (
              <p className="text-xs text-neutral-400 mt-1">
                Sin meta definida para este mes.
              </p>
            )}
          </div>
          {/* Comisión */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Award size={12} className="text-[#3B9DD8]" />
              <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Comisión del mes</p>
            </div>
            <p className="text-lg font-bold text-neutral-900">
              {formatPrice(stats.monthCommission)}
            </p>
            <p className="text-[11px] text-neutral-500 mt-1.5">
              Acumulado por tus ventas confirmadas.
            </p>
          </div>
        </div>

        {/* Buscador */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto o SKU para añadir…"
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
            />
          </div>

          {/* Resultados de búsqueda */}
          {filtered.length > 0 && (
            <div className="space-y-1">
              {filtered.map((p) =>
                p.variants.map((v) => {
                  const baseStock = v.stockQuantity ?? 0;
                  const available = stockAvailableFor(v.sku, baseStock);
                  const out = available <= 0;
                  const low = available > 0 && available <= LOW_STOCK;
                  return (
                    <button
                      key={v.sku}
                      onClick={() => { if (!out) addToCart(p, v); }}
                      disabled={out}
                      className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-xl border transition ${
                        out
                          ? "border-red-100 bg-red-50/30 cursor-not-allowed opacity-60"
                          : "border-neutral-100 hover:bg-neutral-50 hover:border-[#3B9DD8]/30"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-neutral-900 truncate">{p.name}</p>
                        <p className="text-xs text-neutral-500 truncate">
                          {variantLabel(v)}
                        </p>
                        <p className="text-[10px] font-mono text-neutral-400 mt-0.5">{v.sku}</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-bold text-neutral-900">{formatPrice(v.price)}</p>
                        <p className={`text-[11px] font-semibold ${
                          out ? "text-red-600" : low ? "text-amber-600" : "text-green-600"
                        }`}>
                          {out ? "Sin stock" : low ? `¡Solo ${available}!` : `Stock: ${available}`}
                        </p>
                        {(v.commissionPct ?? 0) > 0 && (
                          <p className="text-[10px] text-[#3B9DD8] font-semibold">
                            +{v.commissionPct}% comisión
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {filtered.length === 0 && !query && cart.length === 0 && (
            <div className="text-center py-6">
              <Zap size={20} className="text-neutral-300 mx-auto mb-1" />
              <p className="text-xs text-neutral-400">
                Escribe arriba para buscar y agregar productos a la venta.
              </p>
            </div>
          )}
        </div>

        {/* Carrito */}
        {cart.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#3B9DD8]/30 overflow-hidden shadow-md">
            <div className="bg-[#3B9DD8]/5 px-5 py-3 border-b border-[#3B9DD8]/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart size={14} className="text-[#3B9DD8]" />
                <p className="text-sm font-bold text-neutral-900">
                  Carrito ({cart.length} {cart.length === 1 ? "producto" : "productos"})
                </p>
              </div>
              <button
                onClick={() => setCart([])}
                className="text-[11px] text-neutral-500 hover:text-red-600 transition"
              >
                Vaciar
              </button>
            </div>

            {/* Items */}
            <div className="divide-y divide-neutral-100">
              {cart.map((c) => (
                <div key={c.sku} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{c.productName}</p>
                      <p className="text-[11px] text-neutral-500 truncate">{c.variantLabel}</p>
                      <p className="text-[10px] font-mono text-neutral-400">{c.sku}</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(c.sku)}
                      className="p-1 text-neutral-400 hover:text-red-600 transition"
                      aria-label="Quitar"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(c.sku, -1)}
                        className="w-7 h-7 rounded-lg border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 transition"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-bold w-6 text-center">{c.qty}</span>
                      <button
                        onClick={() => updateQty(c.sku, 1)}
                        disabled={c.qty >= c.stockAvailable}
                        className="w-7 h-7 rounded-lg border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-neutral-900">
                        {formatPrice(c.unitPrice * c.qty)}
                      </p>
                      {c.commissionPct > 0 && (
                        <p className="text-[10px] text-[#3B9DD8] font-semibold">
                          +{formatPrice(Math.round((c.commissionPct * c.unitPrice * c.qty) / 100))} comisión
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cliente opcional */}
            <div className="px-5 py-3 border-t border-neutral-100 bg-neutral-50/50">
              {!showCustomer ? (
                <button
                  type="button"
                  onClick={() => setShowCustomer(true)}
                  className="w-full text-left flex items-center gap-2 text-xs text-[#3B9DD8] font-semibold hover:underline"
                >
                  <User size={11} /> + Agregar datos del cliente (opcional)
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
                      <User size={10} /> Datos del cliente
                    </p>
                    <button
                      type="button"
                      onClick={() => { setShowCustomer(false); setCustomerName(""); setCustomerPhone(""); }}
                      className="text-[10px] text-neutral-400 hover:text-neutral-700"
                    >
                      Quitar
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nombre"
                      className="px-3 py-2 rounded-lg border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
                    />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Teléfono"
                      className="px-3 py-2 rounded-lg border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Método de pago */}
            <div className="px-5 py-3 border-t border-neutral-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1">
                <CreditCard size={10} /> Método de pago
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {PAYMENT_METHODS.map((m) => {
                  const active = paymentMethod === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`text-[10px] font-semibold px-2 py-1.5 rounded-lg border transition ${
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

            {/* Totales + botón */}
            <div className="px-5 py-4 border-t border-neutral-100 bg-neutral-50">
              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-xs text-neutral-600">
                  <span>{cartTotals.units} unidad{cartTotals.units === 1 ? "" : "es"}</span>
                  <span className="font-semibold">{formatPrice(cartTotals.total)}</span>
                </div>
                {cartTotals.commission > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[#3B9DD8] font-semibold flex items-center gap-1">
                      <Award size={10} /> Tu comisión
                    </span>
                    <span className="text-[#3B9DD8] font-bold">{formatPrice(cartTotals.commission)}</span>
                  </div>
                )}
              </div>
              <button
                onClick={handleRegisterSale}
                disabled={loading || cart.length === 0}
                className="w-full py-3 bg-[#3B9DD8] text-white font-bold rounded-xl text-sm hover:bg-[#2A84BE] transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {loading ? "Registrando…" : `Registrar venta — ${formatPrice(cartTotals.total)}`}
              </button>
            </div>
          </div>
        )}

        {/* Historial */}
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-800">Tus ventas recientes</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                {historyLoaded ? `${results.length} en total` : "Cargando historial…"}
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
                const date = safeDate(r.createdAt);
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
                      <p className="text-sm font-semibold text-neutral-900">
                        {r.itemsCount} ítem{r.itemsCount === 1 ? "" : "s"} · {formatPrice(r.totalCop)}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">
                        {r.paymentMethod}
                        {r.customerName && ` · ${r.customerName}`}
                        {` · ${date.toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`}
                      </p>
                      {r.commissionCop > 0 && !r.undone && (
                        <p className="text-[10px] text-[#3B9DD8] font-semibold">
                          +{formatPrice(r.commissionCop)} comisión
                        </p>
                      )}
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

function findVariantBySku(products: Product[], sku: string): Variant | null {
  for (const p of products) {
    const v = p.variants.find((vv) => vv.sku === sku);
    if (v) return v;
  }
  return null;
}

function compactPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${v}`;
}
