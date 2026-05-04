"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FileBarChart,
  Download,
  Calendar,
  TrendingUp,
  Package,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/products";

type OrderRow = {
  id: string;
  total_cop: number;
  created_at: string;
  status: string;
  payment_provider: string | null;
};

type ItemRow = {
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price_cop: number;
};

type ProductMeta = {
  id: string;
  category: string;
};

type ChannelKey = "all" | "web" | "local";

export default function AdminReportesPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [productMeta, setProductMeta] = useState<Map<string, ProductMeta>>(new Map());
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [channel, setChannel] = useState<ChannelKey>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const [ordersRes, itemsRes, productsRes] = await Promise.all([
          supabase
            .from("orders")
            .select("id, total_cop, created_at, status, payment_provider"),
          supabase
            .from("order_items")
            .select("order_id, product_id, product_name, quantity, unit_price_cop"),
          supabase.from("products").select("id, category"),
        ]);
        if (ordersRes.error) throw ordersRes.error;
        if (itemsRes.error) throw itemsRes.error;
        if (productsRes.error) throw productsRes.error;
        if (cancelled) return;
        setOrders((ordersRes.data ?? []) as OrderRow[]);
        setItems((itemsRes.data ?? []) as ItemRow[]);
        const map = new Map<string, ProductMeta>();
        for (const p of productsRes.data ?? []) {
          map.set(p.id, { id: p.id, category: p.category });
        }
        setProductMeta(map);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (o.status === "cancelled") return false;
      if (channel === "web" && o.payment_provider === "local") return false;
      if (channel === "local" && o.payment_provider !== "local") return false;
      const d = new Date(o.created_at.replace(" ", "T"));
      return d.getFullYear() === year;
    });
  }, [orders, channel, year]);

  const filteredOrderIds = useMemo(
    () => new Set(filteredOrders.map((o) => o.id)),
    [filteredOrders]
  );

  const filteredItems = useMemo(
    () => items.filter((it) => filteredOrderIds.has(it.order_id)),
    [items, filteredOrderIds]
  );

  // Mensual (12 meses)
  const monthly = useMemo(() => {
    const data = Array.from({ length: 12 }, (_, m) => ({
      month: m,
      label: new Date(year, m, 1).toLocaleDateString("es-CO", { month: "short" }),
      revenue: 0,
      orders: 0,
    }));
    for (const o of filteredOrders) {
      const d = new Date(o.created_at.replace(" ", "T"));
      const m = d.getMonth();
      data[m].revenue += o.total_cop;
      data[m].orders += 1;
    }
    return data;
  }, [filteredOrders, year]);

  const yearTotals = useMemo(() => {
    const revenue = filteredOrders.reduce((s, o) => s + o.total_cop, 0);
    const count = filteredOrders.length;
    return {
      revenue,
      count,
      avg: count > 0 ? Math.round(revenue / count) : 0,
    };
  }, [filteredOrders]);

  // Por categoría
  const byCategory = useMemo(() => {
    const map = new Map<string, { revenue: number; qty: number }>();
    for (const it of filteredItems) {
      const cat = (it.product_id && productMeta.get(it.product_id)?.category) || "otros";
      const cur = map.get(cat) ?? { revenue: 0, qty: 0 };
      cur.revenue += it.unit_price_cop * it.quantity;
      cur.qty += it.quantity;
      map.set(cat, cur);
    }
    return Array.from(map.entries())
      .map(([cat, v]) => ({ cat, ...v }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredItems, productMeta]);

  // Top productos del año
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const it of filteredItems) {
      const cur = map.get(it.product_name) ?? {
        name: it.product_name,
        qty: 0,
        revenue: 0,
      };
      cur.qty += it.quantity;
      cur.revenue += it.unit_price_cop * it.quantity;
      map.set(it.product_name, cur);
    }
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredItems]);

  const availableYears = useMemo(() => {
    const set = new Set<number>();
    for (const o of orders) {
      set.add(new Date(o.created_at.replace(" ", "T")).getFullYear());
    }
    set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [orders]);

  const exportCsv = () => {
    const headers = ["Mes", "Ingresos", "Pedidos", "Ticket promedio"];
    const lines = [headers.join(",")];
    for (const m of monthly) {
      const avg = m.orders > 0 ? Math.round(m.revenue / m.orders) : 0;
      lines.push([m.label, m.revenue, m.orders, avg].join(","));
    }
    lines.push("");
    lines.push("Categoría,Ingresos,Unidades");
    for (const c of byCategory) {
      lines.push([c.cat, c.revenue, c.qty].join(","));
    }
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-${year}-${channel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
        Error: {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-neutral-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-neutral-200 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-72 bg-neutral-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const maxMonthly = Math.max(...monthly.map((m) => m.revenue), 1);

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <FileBarChart size={22} className="text-[#3B9DD8]" /> Reportes
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Vista anual con desglose mensual, por categoría y top productos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center bg-white border border-neutral-200 rounded-xl px-2.5 py-2 gap-2">
            <Calendar size={14} className="text-neutral-400" />
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="text-sm font-medium text-neutral-800 bg-transparent focus:outline-none cursor-pointer"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="inline-flex bg-white border border-neutral-200 rounded-xl p-0.5">
            {(
              [
                { k: "all", l: "Todo" },
                { k: "web", l: "Web" },
                { k: "local", l: "Local" },
              ] as { k: ChannelKey; l: string }[]
            ).map((c) => (
              <button
                key={c.k}
                onClick={() => setChannel(c.k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  channel === c.k
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {c.l}
              </button>
            ))}
          </div>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition"
          >
            <Download size={13} /> CSV
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Kpi
          label={`Ingresos ${year}`}
          value={formatPrice(yearTotals.revenue)}
          icon={<TrendingUp size={15} className="text-green-300" />}
          highlight
        />
        <Kpi label="Pedidos" value={String(yearTotals.count)} />
        <Kpi label="Ticket promedio" value={formatPrice(yearTotals.avg)} />
      </div>

      {/* Tabla mensual con barras */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-4">
          Desglose mensual {year}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-neutral-500 border-b border-neutral-200">
              <tr>
                <th className="text-left py-2 font-semibold">Mes</th>
                <th className="text-left py-2 font-semibold w-1/2">Ingresos</th>
                <th className="text-right py-2 font-semibold">Pedidos</th>
                <th className="text-right py-2 font-semibold">Ticket prom.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {monthly.map((m) => {
                const avg = m.orders > 0 ? Math.round(m.revenue / m.orders) : 0;
                const pct = (m.revenue / maxMonthly) * 100;
                return (
                  <tr key={m.month}>
                    <td className="py-2.5 capitalize font-medium">{m.label}</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden max-w-xs">
                          <div
                            className="h-full bg-[#3B9DD8] rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-neutral-900 shrink-0">
                          {formatPrice(m.revenue)}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-semibold">{m.orders}</td>
                    <td className="py-2.5 text-right text-neutral-600">
                      {m.orders > 0 ? formatPrice(avg) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Por categoría */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-4 flex items-center gap-1.5">
            <Package size={12} /> Ventas por categoría
          </p>
          {byCategory.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-4">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {byCategory.map((c) => {
                const max = byCategory[0].revenue;
                const pct = (c.revenue / max) * 100;
                return (
                  <div key={c.cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-neutral-700 capitalize font-medium">
                        {c.cat}
                      </span>
                      <span className="font-bold text-neutral-900">
                        {formatPrice(c.revenue)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-neutral-800 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-neutral-500 shrink-0">
                        {c.qty} ud.
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-4">
            Top productos {year}
          </p>
          {topProducts.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-4">Sin datos</p>
          ) : (
            <ol className="space-y-2.5">
              {topProducts.map((p, i) => (
                <li key={p.name} className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-neutral-400 w-4 shrink-0">
                    {i + 1}
                  </span>
                  <span className="font-medium text-neutral-800 flex-1 min-w-0 truncate">
                    {p.name}
                  </span>
                  <span className="text-neutral-500 shrink-0">{p.qty} ud.</span>
                  <span className="font-bold text-neutral-900 shrink-0">
                    {formatPrice(p.revenue)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 ${
        highlight
          ? "bg-neutral-900 border-neutral-900"
          : "bg-white border-neutral-200"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <p
          className={`text-[10px] uppercase tracking-wider font-semibold ${
            highlight ? "text-neutral-500" : "text-neutral-400"
          }`}
        >
          {label}
        </p>
        {icon}
      </div>
      <p
        className={`text-xl font-bold ${
          highlight ? "text-white" : "text-neutral-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
