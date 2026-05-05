"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Package, RotateCcw, CheckCircle, AlertCircle } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/products";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/lib/orders";

type SaleRow = {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  totalCop: number;
  paymentMethod: string | null;
  items: { productName: string; variantLabel: string | null; quantity: number; unitPriceCop: number }[];
};

export default function MisVentasPage() {
  const [sales, setSales] = useState<SaleRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const supabase = getSupabaseBrowserClient();

  const load = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [ordersRes, itemsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, order_number, created_at, status, total_cop, payment_method_type")
          .eq("seller_id", user.id)
          .eq("payment_provider", "local")
          .order("created_at", { ascending: false }),
        supabase
          .from("order_items")
          .select("order_id, product_name, variant_label, quantity, unit_price_cop"),
      ]);

      if (ordersRes.error) throw ordersRes.error;

      const orders = ordersRes.data ?? [];
      const items = itemsRes.data ?? [];
      const orderIds = new Set(orders.map((o) => o.id));
      const myItems = items.filter((it) => orderIds.has(it.order_id));

      setSales(
        orders.map((o) => ({
          id: o.id,
          orderNumber: o.order_number,
          createdAt: o.created_at,
          status: o.status,
          totalCop: o.total_cop,
          paymentMethod: o.payment_method_type,
          items: myItems
            .filter((it) => it.order_id === o.id)
            .map((it) => ({
              productName: it.product_name,
              variantLabel: it.variant_label,
              quantity: it.quantity,
              unitPriceCop: it.unit_price_cop,
            })),
        }))
      );
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUndo = async (saleId: string) => {
    setUndoingId(saleId);
    const { error: e } = await supabase.rpc("undo_local_sale", { p_order_id: saleId });
    if (!e) {
      setSales((prev) =>
        prev
          ? prev.map((s) => (s.id === saleId ? { ...s, status: "cancelled" } : s))
          : prev
      );
    } else {
      setError(e.message);
    }
    setUndoingId(null);
  };

  const stats = useMemo(() => {
    if (!sales) return null;
    const active = sales.filter((s) => s.status !== "cancelled");
    return {
      totalSales: active.length,
      totalRevenue: active.reduce((s, o) => s + o.totalCop, 0),
    };
  }, [sales]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
          <TrendingUp size={22} className="text-[#3B9DD8]" /> Mis ventas
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Ventas físicas que registraste en el local.
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-neutral-200 px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold mb-1">
              Ventas registradas
            </p>
            <p className="text-xl font-bold text-neutral-900">{stats.totalSales}</p>
          </div>
          <div className="bg-neutral-900 rounded-2xl border border-neutral-900 px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">
              Total vendido
            </p>
            <p className="text-xl font-bold text-white">{formatPrice(stats.totalRevenue)}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {!sales && !error && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center text-sm text-neutral-400">
          Cargando…
        </div>
      )}

      {sales && sales.length === 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center">
          <Package size={28} className="text-neutral-300 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">Todavía no has registrado ninguna venta.</p>
          <a
            href="/vendedor"
            className="mt-3 inline-block text-sm font-semibold text-[#3B9DD8] hover:underline"
          >
            Ir al portal de ventas →
          </a>
        </div>
      )}

      {sales && sales.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-100">
            <h2 className="text-sm font-bold text-neutral-800">Historial completo</h2>
          </div>
          <div className="divide-y divide-neutral-100">
            {sales.map((s) => {
              const statusLabel = ORDER_STATUS_LABEL[s.status] ?? s.status;
              const statusColor = ORDER_STATUS_COLOR[s.status] ?? "bg-neutral-100 text-neutral-700";
              const cancelled = s.status === "cancelled";
              const date = new Date(s.createdAt.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"));

              return (
                <div key={s.id} className={cancelled ? "opacity-50" : ""}>
                  <button
                    onClick={() => setOpenId((cur) => (cur === s.id ? null : s.id))}
                    className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-neutral-50 transition"
                  >
                    <div className="shrink-0">
                      {cancelled ? (
                        <RotateCcw size={15} className="text-neutral-400" />
                      ) : (
                        <CheckCircle size={15} className="text-green-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-neutral-900">
                          {s.orderNumber}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {date.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}{" "}
                        {date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                        {" · "}
                        {s.items.length} ítem{s.items.length !== 1 ? "s" : ""}
                        {s.paymentMethod && ` · ${s.paymentMethod}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-neutral-900">
                        {formatPrice(s.totalCop)}
                      </p>
                    </div>
                  </button>

                  {openId === s.id && (
                    <div className="px-5 pb-4 bg-neutral-50/50 border-t border-neutral-100">
                      <ul className="space-y-2 py-3">
                        {s.items.map((it, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm bg-white rounded-lg border border-neutral-100 p-2.5">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-neutral-900">{it.productName}</p>
                              {it.variantLabel && (
                                <p className="text-[11px] text-neutral-500">{it.variantLabel}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0 text-xs">
                              <p className="font-semibold">×{it.quantity}</p>
                              <p className="text-neutral-500">{formatPrice(it.unitPriceCop)}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                      {!cancelled && (
                        <button
                          onClick={() => handleUndo(s.id)}
                          disabled={undoingId === s.id}
                          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-red-600 border border-neutral-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition disabled:opacity-40"
                        >
                          {undoingId === s.id ? (
                            "Deshaciendo…"
                          ) : (
                            <>
                              <RotateCcw size={12} /> Deshacer esta venta
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
