"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Store,
  Calendar,
  TrendingUp,
  TrendingDown,
  UserCheck,
  CreditCard,
  Trophy,
  ArrowRight,
  ShoppingBag,
  Clock,
  Star,
  CalendarDays,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/products";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/lib/orders";

type LocalOrder = {
  id: string;
  order_number: string;
  total_cop: number;
  created_at: string;
  status: string;
  seller_id: string | null;
  customer_name: string;
  payment_method_type: string | null;
};

type OrderItemData = {
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price_cop: number;
};

type SellerInfo = { id: string; name: string };

type PeriodKey =
  | "today"
  | "7d"
  | "30d"
  | "thisMonth"
  | "lastMonth"
  | "ytd"
  | "all"
  | "custom";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "7d", label: "Últimos 7 días" },
  { key: "30d", label: "Últimos 30 días" },
  { key: "thisMonth", label: "Este mes" },
  { key: "lastMonth", label: "Mes pasado" },
  { key: "ytd", label: "Año en curso" },
  { key: "all", label: "Todo el tiempo" },
  { key: "custom", label: "Mes específico…" },
];

function safeDate(s: string): Date {
  return new Date(s.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"));
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
}

function resolvePeriod(
  key: PeriodKey,
  customMonth?: { year: number; month: number }
): { start: Date | null; end: Date | null; label: string; previous?: { start: Date; end: Date } } {
  const now = new Date();
  const today = startOfDay(now);
  if (key === "today") {
    const end = new Date(today.getTime() + 86400000 - 1);
    const prevStart = new Date(today.getTime() - 86400000);
    const prevEnd = new Date(today.getTime() - 1);
    return { start: today, end, label: "Hoy", previous: { start: prevStart, end: prevEnd } };
  }
  if (key === "7d") {
    const start = new Date(today.getTime() - 6 * 86400000);
    const prevStart = new Date(start.getTime() - 7 * 86400000);
    const prevEnd = new Date(start.getTime() - 1);
    return { start, end: now, label: "Últimos 7 días", previous: { start: prevStart, end: prevEnd } };
  }
  if (key === "30d") {
    const start = new Date(today.getTime() - 29 * 86400000);
    const prevStart = new Date(start.getTime() - 30 * 86400000);
    const prevEnd = new Date(start.getTime() - 1);
    return { start, end: now, label: "Últimos 30 días", previous: { start: prevStart, end: prevEnd } };
  }
  if (key === "thisMonth") {
    const start = startOfMonth(now);
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { start, end: now, label: monthLabel(now), previous: { start: prev, end: endOfMonth(prev) } };
  }
  if (key === "lastMonth") {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prev = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return { start: lm, end: endOfMonth(lm), label: monthLabel(lm), previous: { start: prev, end: endOfMonth(prev) } };
  }
  if (key === "ytd") {
    const start = new Date(now.getFullYear(), 0, 1);
    const prevStart = new Date(now.getFullYear() - 1, 0, 1);
    const prevEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 23, 59, 59);
    return { start, end: now, label: `${now.getFullYear()}`, previous: { start: prevStart, end: prevEnd } };
  }
  if (key === "custom" && customMonth) {
    const start = new Date(customMonth.year, customMonth.month, 1);
    const end = endOfMonth(start);
    const prev = new Date(customMonth.year, customMonth.month - 1, 1);
    return { start, end, label: monthLabel(start), previous: { start: prev, end: endOfMonth(prev) } };
  }
  return { start: null, end: null, label: "Todo el tiempo" };
}

export default function VentasLocalPage() {
  const [orders, setOrders] = useState<LocalOrder[] | null>(null);
  const [items, setItems] = useState<OrderItemData[]>([]);
  const [sellers, setSellers] = useState<SellerInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [customMonth, setCustomMonth] = useState<{ year: number; month: number }>({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const [chartMetric, setChartMetric] = useState<"revenue" | "orders">("revenue");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const [ordersRes, itemsRes, sellersRes] = await Promise.all([
          supabase
            .from("orders")
            .select(
              "id, order_number, total_cop, created_at, status, seller_id, customer_name, payment_method_type"
            )
            .eq("payment_provider", "local")
            .order("created_at", { ascending: false }),
          supabase
            .from("order_items")
            .select("order_id, product_name, quantity, unit_price_cop"),
          supabase
            .from("profiles")
            .select("id, full_name")
            .in("role", ["vendedor", "admin"]),
        ]);

        if (ordersRes.error) throw ordersRes.error;
        if (cancelled) return;

        setOrders((ordersRes.data ?? []) as LocalOrder[]);
        setItems(itemsRes.data ?? []);
        setSellers(
          (sellersRes.data ?? []).map((s) => ({
            id: s.id,
            name: s.full_name || "Sin nombre",
          }))
        );
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const periodInfo = useMemo(() => resolvePeriod(period, customMonth), [period, customMonth]);

  // Aplicar filtros: vendedor + período
  const filteredOrders = useMemo(() => {
    let list = orders ?? [];
    if (sellerFilter !== "all") list = list.filter((o) => o.seller_id === sellerFilter);
    return list;
  }, [orders, sellerFilter]);

  const inPeriod = useMemo(() => {
    if (!periodInfo.start || !periodInfo.end) return filteredOrders;
    return filteredOrders.filter((o) => {
      const d = safeDate(o.created_at);
      return d >= periodInfo.start! && d <= periodInfo.end!;
    });
  }, [filteredOrders, periodInfo]);

  const inPrevious = useMemo(() => {
    if (!periodInfo.previous) return [];
    return filteredOrders.filter((o) => {
      const d = safeDate(o.created_at);
      return d >= periodInfo.previous!.start && d <= periodInfo.previous!.end;
    });
  }, [filteredOrders, periodInfo]);

  const metrics = useMemo(() => {
    if (!orders) return null;

    const valid = inPeriod.filter((o) => o.status !== "cancelled");
    const prevValid = inPrevious.filter((o) => o.status !== "cancelled");

    const revenue = valid.reduce((s, o) => s + o.total_cop, 0);
    const prevRevenue = prevValid.reduce((s, o) => s + o.total_cop, 0);
    const avgTicket = valid.length > 0 ? Math.round(revenue / valid.length) : 0;

    // Unidades totales
    const validIds = new Set(valid.map((o) => o.id));
    const validItems = items.filter((it) => validIds.has(it.order_id));
    const totalUnits = validItems.reduce((s, it) => s + it.quantity, 0);

    // Días activos
    const days = new Set<string>();
    for (const o of valid) days.add(dayKey(safeDate(o.created_at)));

    const series = buildSeries(periodInfo, valid);

    const paymentMethods: Record<string, { count: number; revenue: number }> = {};
    for (const o of valid) {
      const method = o.payment_method_type ?? "Efectivo";
      const cur = paymentMethods[method] ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += o.total_cop;
      paymentMethods[method] = cur;
    }

    return {
      revenue,
      prevRevenue,
      avgTicket,
      totalSales: valid.length,
      prevTotalSales: prevValid.length,
      totalUnits,
      activeDays: days.size,
      cancelledCount: inPeriod.length - valid.length,
      series,
      paymentMethods,
      recent: valid.slice(0, 8),
      validItems,
    };
  }, [orders, items, inPeriod, inPrevious, periodInfo]);

  // Ranking de vendedores en el período (no se afecta por sellerFilter — siempre muestra el ranking completo)
  const sellerRanking = useMemo(() => {
    const baseOrders = orders ?? [];
    const inP = baseOrders.filter((o) => {
      if (o.status === "cancelled") return false;
      if (!periodInfo.start || !periodInfo.end) return true;
      const d = safeDate(o.created_at);
      return d >= periodInfo.start && d <= periodInfo.end;
    });
    const map = new Map<string, { id: string; name: string; revenue: number; count: number }>();
    const nameById = new Map(sellers.map((s) => [s.id, s.name]));
    for (const o of inP) {
      if (!o.seller_id) continue;
      const cur = map.get(o.seller_id) ?? {
        id: o.seller_id,
        name: nameById.get(o.seller_id) ?? "Vendedor",
        revenue: 0,
        count: 0,
      };
      cur.revenue += o.total_cop;
      cur.count += 1;
      map.set(o.seller_id, cur);
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue);
  }, [orders, periodInfo, sellers]);

  // Top productos vendidos en el período
  const topProducts = useMemo(() => {
    if (!metrics) return [];
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const it of metrics.validItems) {
      const cur = map.get(it.product_name) ?? { name: it.product_name, qty: 0, revenue: 0 };
      cur.qty += it.quantity;
      cur.revenue += it.quantity * it.unit_price_cop;
      map.set(it.product_name, cur);
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [metrics]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
        Error: {error}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-neutral-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-20 bg-neutral-200 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-72 bg-neutral-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const revenueGrowth =
    metrics.prevRevenue > 0
      ? ((metrics.revenue - metrics.prevRevenue) / metrics.prevRevenue) * 100
      : null;

  const salesGrowth =
    metrics.prevTotalSales > 0
      ? ((metrics.totalSales - metrics.prevTotalSales) / metrics.prevTotalSales) * 100
      : null;

  const monthOptions = buildMonthOptions(orders ?? []);
  const selectedSellerName = sellers.find((s) => s.id === sellerFilter)?.name;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <Store size={22} className="text-[#3B9DD8]" /> Ventas del local
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Ventas físicas registradas por los vendedores
            {selectedSellerName && (
              <> · <span className="text-[#3B9DD8] font-semibold">{selectedSellerName}</span></>
            )}
            {" · "}{periodInfo.label}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {sellers.length > 0 && (
            <div className="inline-flex items-center bg-white border border-neutral-200 rounded-xl px-2.5 py-2 gap-2">
              <UserCheck size={13} className="text-neutral-400" />
              <select
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
                className="text-sm font-medium text-neutral-800 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="all">Todos los vendedores</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="inline-flex items-center bg-white border border-neutral-200 rounded-xl px-2.5 py-2 gap-2">
            <Calendar size={14} className="text-neutral-400" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodKey)}
              className="text-sm font-medium text-neutral-800 bg-transparent focus:outline-none cursor-pointer"
            >
              {PERIODS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>
          {period === "custom" && (
            <select
              value={`${customMonth.year}-${customMonth.month}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-").map(Number);
                setCustomMonth({ year: y, month: m });
              }}
              className="text-sm font-medium text-neutral-800 bg-white border border-neutral-200 rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
            >
              {monthOptions.map((m) => (
                <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                  {m.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </motion.div>

      {/* KPIs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        <Kpi
          label="Ingresos local"
          value={formatPrice(metrics.revenue)}
          sub={
            revenueGrowth !== null
              ? `${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth.toFixed(1)}% vs período anterior`
              : "Sin comparativa"
          }
          subColor={
            revenueGrowth !== null
              ? revenueGrowth >= 0
                ? "text-green-300"
                : "text-red-300"
              : undefined
          }
          icon={
            revenueGrowth !== null && revenueGrowth >= 0 ? (
              <TrendingUp size={15} className="text-green-300" />
            ) : (
              <TrendingDown size={15} className="text-red-300" />
            )
          }
          highlight
        />
        <Kpi
          label="Ventas en tienda"
          value={String(metrics.totalSales)}
          sub={
            salesGrowth !== null
              ? `${salesGrowth >= 0 ? "+" : ""}${salesGrowth.toFixed(1)}% vs anterior`
              : metrics.cancelledCount > 0
                ? `${metrics.cancelledCount} cancelada${metrics.cancelledCount === 1 ? "" : "s"}`
                : "Sin canceladas"
          }
          subColor={
            salesGrowth !== null
              ? salesGrowth >= 0
                ? "text-green-600"
                : "text-red-500"
              : undefined
          }
          icon={<ShoppingBag size={15} className="text-neutral-400" />}
        />
        <Kpi
          label="Ticket promedio"
          value={formatPrice(metrics.avgTicket)}
          sub={`${metrics.totalUnits} unidad${metrics.totalUnits === 1 ? "" : "es"} en total`}
          icon={<CreditCard size={15} className="text-neutral-400" />}
        />
        <Kpi
          label="Días activos"
          value={String(metrics.activeDays)}
          sub={
            metrics.activeDays > 0
              ? `${formatPrice(Math.round(metrics.revenue / metrics.activeDays))} / día`
              : "Sin actividad"
          }
          icon={<CalendarDays size={15} className="text-neutral-400" />}
        />
      </motion.div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-white rounded-2xl border border-neutral-200 p-5"
      >
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              {chartMetric === "revenue" ? "Ingresos" : "Ventas"} · {periodInfo.label}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {metrics.series.length} {metrics.series[0]?.kind === "month" ? "meses" : "días"}
            </p>
          </div>
          <div className="inline-flex bg-neutral-100 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setChartMetric("revenue")}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition ${
                chartMetric === "revenue"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              Ingresos
            </button>
            <button
              type="button"
              onClick={() => setChartMetric("orders")}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition ${
                chartMetric === "orders"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              Ventas
            </button>
          </div>
        </div>
        <SeriesChart series={metrics.series} metric={chartMetric} />
      </motion.div>

      {/* Ranking de vendedores (siempre visible, no se filtra) */}
      {sellerRanking.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="bg-white rounded-2xl border border-neutral-200 p-5"
        >
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Trophy size={12} className="text-[#3B9DD8]" /> Ranking de vendedores
            </p>
            <span className="text-[10px] text-neutral-400">por ingresos del período</span>
          </div>
          <div className="space-y-3">
            {sellerRanking.slice(0, 8).map((s, i) => {
              const max = sellerRanking[0].revenue;
              const pct = (s.revenue / max) * 100;
              const isSelected = sellerFilter === s.id;
              return (
                <div key={s.id} className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[11px] font-bold w-5 shrink-0 text-center ${
                        i === 0
                          ? "text-yellow-600"
                          : i === 1
                            ? "text-neutral-500"
                            : i === 2
                              ? "text-orange-700"
                              : "text-neutral-400"
                      }`}
                    >
                      {i + 1}°
                    </span>
                    <UserCheck size={14} className="text-neutral-400 shrink-0" />
                    <button
                      type="button"
                      onClick={() => setSellerFilter(isSelected ? "all" : s.id)}
                      className={`text-sm font-semibold flex-1 min-w-0 truncate text-left transition ${
                        isSelected ? "text-[#3B9DD8]" : "text-neutral-900 hover:text-[#3B9DD8]"
                      }`}
                      title={isSelected ? "Quitar filtro" : "Filtrar este dashboard por este vendedor"}
                    >
                      {s.name}
                      {isSelected && <span className="ml-2 text-[10px] uppercase tracking-wider">(filtrando)</span>}
                    </button>
                    <span className="text-xs font-bold text-neutral-900 shrink-0">
                      {formatPrice(s.revenue)}
                    </span>
                    <Link
                      href={`/admin/vendedor/${s.id}`}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-[#3B9DD8] hover:bg-blue-50 transition shrink-0"
                      title="Ver detalle del vendedor"
                    >
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 pl-12">
                    <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#3B9DD8] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-neutral-500 shrink-0">
                      {s.count} venta{s.count !== 1 ? "s" : ""} · {formatPrice(Math.round(s.revenue / s.count))} prom.
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Top productos + Métodos de pago */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Star size={12} className="text-[#3B9DD8]" /> Top productos
            </p>
            <span className="text-[10px] text-neutral-400">por unidades vendidas</span>
          </div>
          {topProducts.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-4">Sin datos en el período</p>
          ) : (
            <ol className="space-y-4">
              {topProducts.map((p, i) => {
                const max = topProducts[0].qty;
                const pct = (p.qty / max) * 100;
                return (
                  <li key={p.name} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-neutral-400 w-4 shrink-0">{i + 1}</span>
                      <span className="text-xs font-medium text-neutral-800 flex-1 min-w-0 truncate">{p.name}</span>
                      <span className="text-xs font-bold text-neutral-900 shrink-0">{p.qty} ud.</span>
                    </div>
                    <div className="flex items-center gap-2 pl-6">
                      <div className="flex-1 h-1 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#3B9DD8] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-neutral-500 shrink-0">{formatPrice(p.revenue)}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-5 flex items-center gap-1.5">
            <CreditCard size={12} /> Métodos de pago
          </p>
          {Object.keys(metrics.paymentMethods).length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-4">Sin datos en el período</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(metrics.paymentMethods)
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .map(([method, data]) => {
                  const pct =
                    metrics.revenue > 0 ? Math.round((data.revenue / metrics.revenue) * 100) : 0;
                  return (
                    <div key={method}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-neutral-600 truncate">{method}</span>
                        <span className="font-bold text-neutral-900 shrink-0 pl-1">
                          {formatPrice(data.revenue)} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full bg-neutral-800 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Ventas recientes */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="bg-white rounded-2xl border border-neutral-200 p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
            <Clock size={12} /> Ventas recientes del período
          </p>
          <Link
            href="/admin/ordenes?canal=local"
            className="text-[11px] text-[#3B9DD8] font-semibold hover:underline flex items-center gap-1"
          >
            Ver todas <ArrowRight size={11} />
          </Link>
        </div>
        {metrics.recent.length === 0 ? (
          <p className="text-xs text-neutral-400 text-center py-4">Sin ventas en el período</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {metrics.recent.map((o) => {
              const statusLabel = ORDER_STATUS_LABEL[o.status] ?? o.status;
              const statusColor = ORDER_STATUS_COLOR[o.status] ?? "bg-neutral-100 text-neutral-700";
              const sellerName =
                o.seller_id
                  ? sellers.find((s) => s.id === o.seller_id)?.name ?? "Vendedor"
                  : "Sin vendedor";
              return (
                <li key={o.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-neutral-700">
                        {o.order_number}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                      <UserCheck size={9} className="inline -mt-0.5 mr-0.5 text-neutral-400" />
                      {sellerName}
                      {o.customer_name && o.customer_name !== "Venta local" ? ` · ${o.customer_name}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-neutral-900">{formatPrice(o.total_cop)}</p>
                    <p className="text-[10px] text-neutral-400">
                      {safeDate(o.created_at).toLocaleDateString("es-CO", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </motion.div>
    </div>
  );
}

/* -------- Series helpers (idénticos al dashboard web) -------- */

type SeriesPoint = {
  date: Date;
  label: string;
  revenue: number;
  orders: number;
  kind: "day" | "month";
};

function buildSeries(
  periodInfo: { start: Date | null; end: Date | null },
  orders: LocalOrder[]
): SeriesPoint[] {
  const start = periodInfo.start ?? earliestDate(orders) ?? startOfDay(new Date());
  const end = periodInfo.end ?? new Date();
  const span = end.getTime() - start.getTime();
  const useMonthly = span > 1000 * 60 * 60 * 24 * 92;

  const points: SeriesPoint[] = [];
  if (useMonthly) {
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      const monthStart = new Date(cursor);
      const monthEnd = endOfMonth(cursor);
      const inRange = orders.filter((o) => {
        const d = safeDate(o.created_at);
        return d >= monthStart && d <= monthEnd;
      });
      points.push({
        date: monthStart,
        label: monthStart.toLocaleDateString("es-CO", { month: "short" }),
        revenue: inRange.reduce((s, o) => s + o.total_cop, 0),
        orders: inRange.length,
        kind: "month",
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    const cursor = startOfDay(start);
    const last = startOfDay(end);
    while (cursor <= last) {
      const dStart = new Date(cursor);
      const dEnd = new Date(cursor.getTime() + 86400000);
      const inRange = orders.filter((o) => {
        const d = safeDate(o.created_at);
        return d >= dStart && d < dEnd;
      });
      points.push({
        date: dStart,
        label: dayLabel(dStart),
        revenue: inRange.reduce((s, o) => s + o.total_cop, 0),
        orders: inRange.length,
        kind: "day",
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return points;
}

function earliestDate(orders: LocalOrder[]): Date | null {
  if (!orders.length) return null;
  let min = safeDate(orders[0].created_at);
  for (const o of orders) {
    const d = safeDate(o.created_at);
    if (d < min) min = d;
  }
  return min;
}

function buildMonthOptions(
  orders: LocalOrder[]
): { year: number; month: number; label: string }[] {
  const set = new Set<string>();
  const out: { year: number; month: number; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!set.has(key)) {
      set.add(key);
      out.push({ year: d.getFullYear(), month: d.getMonth(), label: monthLabel(d) });
    }
  }
  for (const o of orders) {
    const d = safeDate(o.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!set.has(key)) {
      set.add(key);
      const first = new Date(d.getFullYear(), d.getMonth(), 1);
      out.push({ year: d.getFullYear(), month: d.getMonth(), label: monthLabel(first) });
    }
  }
  return out.sort((a, b) => (b.year !== a.year ? b.year - a.year : b.month - a.month));
}

/* -------- SeriesChart (SVG, sin librerías) -------- */

function SeriesChart({
  series,
  metric,
}: {
  series: SeriesPoint[];
  metric: "revenue" | "orders";
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const W = 720;
  const H = 220;
  const PAD_L = 48;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 28;

  const values = series.map((p) => (metric === "revenue" ? p.revenue : p.orders));
  const max = Math.max(...values, 1);
  const min = 0;

  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const x = (i: number) =>
    series.length === 1 ? PAD_L + innerW / 2 : PAD_L + (i / (series.length - 1)) * innerW;
  const y = (val: number) =>
    PAD_T + innerH - ((val - min) / (max - min || 1)) * innerH;

  const linePath = series
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(metric === "revenue" ? p.revenue : p.orders)}`)
    .join(" ");
  const areaPath = `${linePath} L ${x(series.length - 1)} ${PAD_T + innerH} L ${x(0)} ${PAD_T + innerH} Z`;

  const yTicks = 4;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => (max * i) / yTicks);

  const formatY = (v: number) => {
    if (metric === "orders") return String(Math.round(v));
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
    return `$${Math.round(v)}`;
  };

  const xLabels = pickXLabels(series);

  if (series.length === 0 || max === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-neutral-400">
        Sin ventas en el período
      </div>
    );
  }

  const total = series.reduce((s, p) => s + (metric === "revenue" ? p.revenue : p.orders), 0);
  const avg = total / series.length;
  const peak = series.reduce(
    (mx, p) =>
      (metric === "revenue" ? p.revenue : p.orders) >
      (metric === "revenue" ? mx.revenue : mx.orders)
        ? p
        : mx,
    series[0]
  );

  const hover = hoverIdx !== null ? series[hoverIdx] : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Total" value={metric === "revenue" ? formatPrice(total) : String(total)} />
        <Stat
          label="Promedio"
          value={metric === "revenue" ? formatPrice(Math.round(avg)) : avg.toFixed(1)}
        />
        <Stat
          label={peak.kind === "month" ? "Mejor mes" : "Mejor día"}
          value={`${peak.label} · ${
            metric === "revenue" ? formatPrice(peak.revenue) : `${peak.orders} ventas`
          }`}
        />
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-56"
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="localDashArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B9DD8" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#3B9DD8" stopOpacity="0" />
            </linearGradient>
          </defs>
          {tickValues.map((tv, i) => (
            <g key={i}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={y(tv)}
                y2={y(tv)}
                stroke="#f1f1f1"
                strokeDasharray={i === 0 ? "0" : "3 3"}
              />
              <text x={PAD_L - 8} y={y(tv) + 3} fill="#9ca3af" fontSize="10" textAnchor="end">
                {formatY(tv)}
              </text>
            </g>
          ))}
          <path d={areaPath} fill="url(#localDashArea)" />
          <path d={linePath} fill="none" stroke="#3B9DD8" strokeWidth="2" />
          {series.map((p, i) => (
            <circle
              key={i}
              cx={x(i)}
              cy={y(metric === "revenue" ? p.revenue : p.orders)}
              r={hoverIdx === i ? 4 : 2.5}
              fill="#3B9DD8"
            />
          ))}
          {hover && hoverIdx !== null && (
            <line
              x1={x(hoverIdx)}
              x2={x(hoverIdx)}
              y1={PAD_T}
              y2={PAD_T + innerH}
              stroke="#3B9DD8"
              strokeOpacity="0.3"
              strokeDasharray="2 2"
            />
          )}
          {xLabels.map((i) => (
            <text key={i} x={x(i)} y={H - 8} fill="#9ca3af" fontSize="10" textAnchor="middle">
              {series[i].label}
            </text>
          ))}
          {series.map((_, i) => {
            const w = innerW / Math.max(series.length, 1);
            return (
              <rect
                key={i}
                x={x(i) - w / 2}
                y={PAD_T}
                width={w}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
              />
            );
          })}
        </svg>
        {hover && hoverIdx !== null && (
          <div
            className="absolute bg-neutral-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-lg pointer-events-none"
            style={{
              left: `${(x(hoverIdx) / W) * 100}%`,
              top: 0,
              transform: "translate(-50%, -110%)",
              whiteSpace: "nowrap",
            }}
          >
            <div className="font-bold">{hover.label}</div>
            <div>
              {metric === "revenue" ? formatPrice(hover.revenue) : `${hover.orders} ventas`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-neutral-50 rounded-xl px-3 py-2 border border-neutral-100">
      <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">{label}</p>
      <p className="text-sm font-bold text-neutral-900 truncate">{value}</p>
    </div>
  );
}

function pickXLabels(series: SeriesPoint[]): number[] {
  if (series.length === 0) return [];
  if (series.length <= 8) return series.map((_, i) => i);
  const step = Math.ceil(series.length / 7);
  const out: number[] = [];
  for (let i = 0; i < series.length; i += step) out.push(i);
  if (out[out.length - 1] !== series.length - 1) out.push(series.length - 1);
  return out;
}

/* -------- KPI -------- */

function Kpi({
  label,
  value,
  sub,
  icon,
  highlight = false,
  subColor,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  highlight?: boolean;
  subColor?: string;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 ${
        highlight ? "bg-neutral-900 border-neutral-900" : "bg-white border-neutral-200"
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
      <p className={`text-xl font-bold ${highlight ? "text-white" : "text-neutral-900"}`}>{value}</p>
      {sub && (
        <p
          className={`text-[10px] mt-0.5 ${
            subColor ?? (highlight ? "text-neutral-500" : "text-neutral-400")
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
