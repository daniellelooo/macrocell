"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Users,
  Package,
  AlertTriangle,
  ArrowRight,
  CreditCard,
  Star,
  Clock,
  CheckCircle,
  Truck,
  Calendar,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/products";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/lib/orders";

/* -------- Types -------- */

type OrderData = {
  id: string;
  order_number: string;
  status: string;
  total_cop: number;
  created_at: string;
  payment_provider: string | null;
  payment_method_type: string | null;
  customer_name: string;
  customer_phone: string;
  seller_id: string | null;
};

type OrderItemData = {
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price_cop: number;
};

type TopProduct = {
  name: string;
  totalQty: number;
  totalRevenue: number;
};

type TopCustomer = {
  name: string;
  phone: string;
  ordersCount: number;
  totalSpend: number;
};

type PeriodKey =
  | "today"
  | "7d"
  | "30d"
  | "thisMonth"
  | "lastMonth"
  | "ytd"
  | "all"
  | "custom";

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "7d", label: "Últimos 7 días" },
  { key: "30d", label: "Últimos 30 días" },
  { key: "thisMonth", label: "Este mes" },
  { key: "lastMonth", label: "Mes pasado" },
  { key: "ytd", label: "Año en curso" },
  { key: "all", label: "Todo el tiempo" },
  { key: "custom", label: "Mes específico…" },
];

/* -------- Helpers -------- */

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
    return {
      start,
      end: now,
      label: monthLabel(now),
      previous: { start: prev, end: endOfMonth(prev) },
    };
  }
  if (key === "lastMonth") {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prev = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return {
      start: lm,
      end: endOfMonth(lm),
      label: monthLabel(lm),
      previous: { start: prev, end: endOfMonth(prev) },
    };
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
    return {
      start,
      end,
      label: monthLabel(start),
      previous: { start: prev, end: endOfMonth(prev) },
    };
  }
  return { start: null, end: null, label: "Todo el tiempo" };
}

/* -------- Dashboard -------- */

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<OrderData[] | null>(null);
  const [items, setItems] = useState<OrderItemData[] | null>(null);
  const [outOfStock, setOutOfStock] = useState(0);
  const [totalSkus, setTotalSkus] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [customMonth, setCustomMonth] = useState<{ year: number; month: number }>({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [chartMetric, setChartMetric] = useState<"revenue" | "orders">("revenue");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const [ordersRes, itemsRes, variantsRes, profilesRes] = await Promise.all([
          supabase
            .from("orders")
            .select(
              "id, order_number, status, total_cop, created_at, payment_provider, payment_method_type, customer_name, customer_phone, seller_id"
            )
            .order("created_at", { ascending: false }),
          supabase
            .from("order_items")
            .select("order_id, product_name, quantity, unit_price_cop"),
          supabase.from("variants").select("sku, in_stock"),
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("role", "cliente"),
        ]);

        if (ordersRes.error) throw ordersRes.error;
        if (itemsRes.error) throw itemsRes.error;
        if (variantsRes.error) throw variantsRes.error;

        if (!cancelled) {
          setOrders((ordersRes.data ?? []) as OrderData[]);
          setItems(itemsRes.data ?? []);
          const variants = variantsRes.data ?? [];
          setTotalSkus(variants.length);
          setOutOfStock(variants.filter((v) => !v.in_stock).length);
          setCustomerCount(profilesRes.count ?? 0);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const periodInfo = useMemo(
    () => resolvePeriod(period, customMonth),
    [period, customMonth]
  );

  // Web-only orders (sin ventas locales — el dashboard es solo web)
  const webOrders = useMemo(
    () => (orders ?? []).filter((o) => o.payment_provider !== "local"),
    [orders]
  );

  const inPeriod = useMemo(() => {
    if (!periodInfo.start || !periodInfo.end) return webOrders;
    return webOrders.filter((o) => {
      const d = safeDate(o.created_at);
      return d >= periodInfo.start! && d <= periodInfo.end!;
    });
  }, [webOrders, periodInfo]);

  const inPrevious = useMemo(() => {
    if (!periodInfo.previous) return [];
    return webOrders.filter((o) => {
      const d = safeDate(o.created_at);
      return d >= periodInfo.previous!.start && d <= periodInfo.previous!.end;
    });
  }, [webOrders, periodInfo]);

  const metrics = useMemo(() => {
    if (!orders) return null;

    const nonCancelled = inPeriod.filter((o) => o.status !== "cancelled");
    const prevNonCancelled = inPrevious.filter((o) => o.status !== "cancelled");

    const revenue = nonCancelled.reduce((s, o) => s + o.total_cop, 0);
    const prevRevenue = prevNonCancelled.reduce((s, o) => s + o.total_cop, 0);
    const avgOrderValue =
      nonCancelled.length > 0 ? Math.round(revenue / nonCancelled.length) : 0;

    const byStatus: Record<string, number> = {};
    for (const o of inPeriod) {
      byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    }

    // Serie temporal: días para periodos cortos, meses para largos.
    const series = buildSeries(periodInfo, nonCancelled);

    const paymentMethods: Record<string, number> = {};
    for (const o of nonCancelled) {
      const method =
        o.payment_provider === "wompi"
          ? o.payment_method_type ?? "Wompi"
          : "Efectivo / Manual";
      paymentMethods[method] = (paymentMethods[method] ?? 0) + 1;
    }

    return {
      revenue,
      prevRevenue,
      avgOrderValue,
      totalOrders: inPeriod.length,
      prevTotalOrders: inPrevious.length,
      pendingOrders: byStatus["pending"] ?? 0,
      confirmedOrders: byStatus["confirmed"] ?? 0,
      shippedOrders: byStatus["shipped"] ?? 0,
      deliveredOrders: byStatus["delivered"] ?? 0,
      cancelledOrders: byStatus["cancelled"] ?? 0,
      byStatus,
      series,
      paymentMethods,
      recentOrders: webOrders.slice(0, 5),
    };
  }, [orders, inPeriod, inPrevious, periodInfo, webOrders]);

  const topProducts = useMemo((): TopProduct[] => {
    if (!items) return [];
    const idsInPeriod = new Set(
      inPeriod.filter((o) => o.status !== "cancelled").map((o) => o.id)
    );
    const map = new Map<string, TopProduct>();
    for (const it of items) {
      if (!idsInPeriod.has(it.order_id)) continue;
      const cur = map.get(it.product_name) ?? {
        name: it.product_name,
        totalQty: 0,
        totalRevenue: 0,
      };
      cur.totalQty += it.quantity;
      cur.totalRevenue += it.quantity * it.unit_price_cop;
      map.set(it.product_name, cur);
    }
    return Array.from(map.values())
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 5);
  }, [items, inPeriod]);

  const topCustomers = useMemo((): TopCustomer[] => {
    const map = new Map<string, TopCustomer>();
    for (const o of inPeriod) {
      if (o.status === "cancelled") continue;
      const key = o.customer_phone;
      const cur = map.get(key) ?? {
        name: o.customer_name,
        phone: o.customer_phone,
        ordersCount: 0,
        totalSpend: 0,
      };
      cur.ordersCount += 1;
      cur.totalSpend += o.total_cop;
      map.set(key, cur);
    }
    return Array.from(map.values())
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 5);
  }, [inPeriod]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
        Error al cargar el dashboard: {error}
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

  const ordersGrowth =
    metrics.prevTotalOrders > 0
      ? ((metrics.totalOrders - metrics.prevTotalOrders) /
          metrics.prevTotalOrders) *
        100
      : null;

  const statusOrder = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
  const totalOrdersForPct = metrics.totalOrders || 1;

  const STATUS_BAR_COLOR: Record<string, string> = {
    pending: "bg-amber-400",
    confirmed: "bg-blue-500",
    shipped: "bg-violet-500",
    delivered: "bg-green-500",
    cancelled: "bg-neutral-300",
  };

  const monthOptions = buildMonthOptions(orders ?? []);

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
            <BarChart3 size={22} className="text-[#3B9DD8]" /> Dashboard
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Solo ventas web · {periodInfo.label}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center bg-white border border-neutral-200 rounded-xl px-2.5 py-2 gap-2">
            <Calendar size={14} className="text-neutral-400" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodKey)}
              className="text-sm font-medium text-neutral-800 bg-transparent focus:outline-none cursor-pointer"
            >
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
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

      {/* KPI Row 1 — Revenue */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        <KpiCard
          label="Ingresos"
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
        <KpiCard
          label="Pedidos"
          value={String(metrics.totalOrders)}
          sub={
            ordersGrowth !== null
              ? `${ordersGrowth >= 0 ? "+" : ""}${ordersGrowth.toFixed(1)}% vs anterior`
              : `${metrics.cancelledOrders} cancelados`
          }
          subColor={
            ordersGrowth !== null
              ? ordersGrowth >= 0
                ? "text-green-600"
                : "text-red-500"
              : undefined
          }
          icon={<ShoppingBag size={15} className="text-neutral-400" />}
        />
        <KpiCard
          label="Ticket promedio"
          value={formatPrice(metrics.avgOrderValue)}
          sub={`Sobre ${metrics.totalOrders - metrics.cancelledOrders} pedidos válidos`}
          icon={<CreditCard size={15} className="text-neutral-400" />}
        />
        <KpiCard
          label="Clientes registrados"
          value={String(customerCount)}
          sub={`${totalSkus - outOfStock} de ${totalSkus} SKUs en stock`}
          icon={<Users size={15} className="text-neutral-400" />}
        />
      </motion.div>

      {/* KPI Row 2 — Operations */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        <KpiCard
          label="Pendientes"
          value={String(metrics.pendingOrders)}
          sub="Esperando confirmación"
          icon={<Clock size={15} className="text-amber-500" />}
          urgent={metrics.pendingOrders > 0}
        />
        <KpiCard
          label="En proceso"
          value={String(metrics.confirmedOrders + metrics.shippedOrders)}
          sub={`${metrics.confirmedOrders} conf. · ${metrics.shippedOrders} en camino`}
          icon={<Truck size={15} className="text-blue-500" />}
        />
        <KpiCard
          label="Entregados"
          value={String(metrics.deliveredOrders)}
          sub="Completados exitosamente"
          icon={<CheckCircle size={15} className="text-green-500" />}
        />
        <KpiCard
          label="Cancelados"
          value={String(metrics.cancelledOrders)}
          sub="No cuentan en ingresos"
          icon={<AlertTriangle size={15} className="text-neutral-400" />}
        />
      </motion.div>

      {/* Chart + Status */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="md:col-span-2 bg-white rounded-2xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                {chartMetric === "revenue" ? "Ingresos" : "Pedidos"} · {periodInfo.label}
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
                Pedidos
              </button>
            </div>
          </div>
          <SeriesChart series={metrics.series} metric={chartMetric} />
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-5">
            Pedidos por estado
          </p>
          {metrics.totalOrders === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-4">
              Sin pedidos en el período
            </p>
          ) : (
            <div className="space-y-4">
              {statusOrder.map((s) => {
                const count = metrics.byStatus[s] ?? 0;
                const pct = (count / totalOrdersForPct) * 100;
                const barColor = STATUS_BAR_COLOR[s] ?? "bg-neutral-300";
                return (
                  <div key={s}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-neutral-600 font-medium">
                        {ORDER_STATUS_LABEL[s] ?? s}
                      </span>
                      <span className="font-bold text-neutral-900">{count}</span>
                    </div>
                    <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Top products + customers */}
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
            <p className="text-xs text-neutral-400 text-center py-4">
              Sin datos en el período
            </p>
          ) : (
            <ol className="space-y-4">
              {topProducts.map((p, i) => {
                const maxQty = topProducts[0].totalQty;
                const pct = (p.totalQty / maxQty) * 100;
                return (
                  <li key={p.name} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-neutral-400 w-4 shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-xs font-medium text-neutral-800 flex-1 min-w-0 truncate">
                        {p.name}
                      </span>
                      <span className="text-xs font-bold text-neutral-900 shrink-0">
                        {p.totalQty} ud.
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pl-6">
                      <div className="flex-1 h-1 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#3B9DD8] rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-neutral-500 shrink-0">
                        {formatPrice(p.totalRevenue)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Users size={12} className="text-[#3B9DD8]" /> Mejores clientes
            </p>
            <span className="text-[10px] text-neutral-400">por gasto en período</span>
          </div>
          {topCustomers.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-4">
              Sin datos en el período
            </p>
          ) : (
            <ol className="space-y-4">
              {topCustomers.map((c, i) => {
                const maxSpend = topCustomers[0].totalSpend;
                const pct = (c.totalSpend / maxSpend) * 100;
                return (
                  <li key={c.phone} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-neutral-400 w-4 shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-xs font-medium text-neutral-800 flex-1 min-w-0 truncate">
                        {c.name}
                      </span>
                      <span className="text-xs font-bold text-neutral-900 shrink-0">
                        {c.ordersCount} pedido{c.ordersCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pl-6">
                      <div className="flex-1 h-1 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-neutral-800 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-neutral-500 shrink-0">
                        {formatPrice(c.totalSpend)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </motion.div>

      {/* Recent orders + Payment + Stock */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="md:col-span-2 bg-white rounded-2xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Clock size={12} /> Pedidos recientes
            </p>
            <Link
              href="/admin/ordenes"
              className="text-[11px] text-[#3B9DD8] font-semibold hover:underline flex items-center gap-1"
            >
              Ver todos <ArrowRight size={11} />
            </Link>
          </div>
          {metrics.recentOrders.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-4">
              Sin pedidos todavía
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {metrics.recentOrders.map((o) => {
                const statusLabel = ORDER_STATUS_LABEL[o.status] ?? o.status;
                const statusColor =
                  ORDER_STATUS_COLOR[o.status] ?? "bg-neutral-100 text-neutral-700";
                return (
                  <li key={o.id} className="flex items-center gap-3 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-neutral-700">
                          {o.order_number}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${statusColor}`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                        {o.customer_name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-neutral-900">
                        {formatPrice(o.total_cop)}
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        {new Date(safeDate(o.created_at)).toLocaleDateString("es-CO", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-4 flex items-center gap-1.5">
              <CreditCard size={12} /> Métodos de pago
            </p>
            {Object.keys(metrics.paymentMethods).length === 0 ? (
              <p className="text-xs text-neutral-400">Sin datos en el período</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(metrics.paymentMethods)
                  .sort((a, b) => b[1] - a[1])
                  .map(([method, count]) => {
                    const total = Object.values(metrics.paymentMethods).reduce(
                      (s, v) => s + v,
                      0
                    );
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={method}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-neutral-600 truncate">{method}</span>
                          <span className="font-bold text-neutral-900 shrink-0 pl-1">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-neutral-800 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div
            className={`rounded-2xl border p-5 ${
              outOfStock > 0
                ? "bg-red-50 border-red-200"
                : "bg-green-50 border-green-200"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-4 flex items-center gap-1.5">
              <Package size={12} /> Inventario SKUs
            </p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-neutral-600">En stock</span>
                <span className="text-xs font-bold text-green-700">
                  {totalSkus - outOfStock}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-neutral-600">Sin stock</span>
                <span
                  className={`text-xs font-bold ${
                    outOfStock > 0 ? "text-red-600" : "text-neutral-400"
                  }`}
                >
                  {outOfStock}
                </span>
              </div>
              <div className="h-1.5 bg-white/60 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{
                    width: `${
                      totalSkus > 0
                        ? ((totalSkus - outOfStock) / totalSkus) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              {outOfStock > 0 && (
                <Link
                  href="/admin/productos"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:underline"
                >
                  <AlertTriangle size={11} /> Ver agotados
                </Link>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* -------- Series helpers -------- */

type SeriesPoint = {
  date: Date;
  label: string;
  revenue: number;
  orders: number;
  kind: "day" | "month";
};

function buildSeries(
  periodInfo: { start: Date | null; end: Date | null },
  orders: OrderData[]
): SeriesPoint[] {
  const start = periodInfo.start ?? earliestDate(orders) ?? startOfDay(new Date());
  const end = periodInfo.end ?? new Date();
  const span = end.getTime() - start.getTime();
  const useMonthly = span > 1000 * 60 * 60 * 24 * 92; // > ~3 meses → vista mensual

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

function earliestDate(orders: OrderData[]): Date | null {
  if (!orders.length) return null;
  let min = safeDate(orders[0].created_at);
  for (const o of orders) {
    const d = safeDate(o.created_at);
    if (d < min) min = d;
  }
  return min;
}

function buildMonthOptions(
  orders: OrderData[]
): { year: number; month: number; label: string }[] {
  const set = new Set<string>();
  const out: { year: number; month: number; label: string }[] = [];
  const now = new Date();
  // Garantizar últimos 12 meses
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!set.has(key)) {
      set.add(key);
      out.push({ year: d.getFullYear(), month: d.getMonth(), label: monthLabel(d) });
    }
  }
  // Más meses si hay órdenes anteriores
  for (const o of orders) {
    const d = safeDate(o.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!set.has(key)) {
      set.add(key);
      const first = new Date(d.getFullYear(), d.getMonth(), 1);
      out.push({ year: d.getFullYear(), month: d.getMonth(), label: monthLabel(first) });
    }
  }
  return out.sort((a, b) =>
    b.year !== a.year ? b.year - a.year : b.month - a.month
  );
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
    series.length === 1
      ? PAD_L + innerW / 2
      : PAD_L + (i / (series.length - 1)) * innerW;
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
  const peak = series.reduce((max, p) =>
    (metric === "revenue" ? p.revenue : p.orders) >
    (metric === "revenue" ? max.revenue : max.orders)
      ? p
      : max
  , series[0]);

  const hover = hoverIdx !== null ? series[hoverIdx] : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Total" value={metric === "revenue" ? formatPrice(total) : String(total)} />
        <Stat
          label="Promedio"
          value={
            metric === "revenue"
              ? formatPrice(Math.round(avg))
              : avg.toFixed(1)
          }
        />
        <Stat
          label={peak.kind === "month" ? "Mejor mes" : "Mejor día"}
          value={`${peak.label} · ${
            metric === "revenue"
              ? formatPrice(peak.revenue)
              : `${peak.orders} ped.`
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
            <linearGradient id="dashArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B9DD8" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#3B9DD8" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* grid lines */}
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
              <text
                x={PAD_L - 8}
                y={y(tv) + 3}
                fill="#9ca3af"
                fontSize="10"
                textAnchor="end"
              >
                {formatY(tv)}
              </text>
            </g>
          ))}
          {/* area */}
          <path d={areaPath} fill="url(#dashArea)" />
          {/* line */}
          <path d={linePath} fill="none" stroke="#3B9DD8" strokeWidth="2" />
          {/* points */}
          {series.map((p, i) => (
            <circle
              key={i}
              cx={x(i)}
              cy={y(metric === "revenue" ? p.revenue : p.orders)}
              r={hoverIdx === i ? 4 : 2.5}
              fill="#3B9DD8"
            />
          ))}
          {/* hover guide */}
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
          {/* x labels */}
          {xLabels.map((i) => (
            <text
              key={i}
              x={x(i)}
              y={H - 8}
              fill="#9ca3af"
              fontSize="10"
              textAnchor="middle"
            >
              {series[i].label}
            </text>
          ))}
          {/* hit areas */}
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
              {metric === "revenue"
                ? formatPrice(hover.revenue)
                : `${hover.orders} pedidos`}
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
      <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">
        {label}
      </p>
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

/* -------- KpiCard -------- */

function KpiCard({
  label,
  value,
  sub,
  icon,
  highlight = false,
  urgent = false,
  subColor,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  highlight?: boolean;
  urgent?: boolean;
  subColor?: string;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 ${
        urgent
          ? "bg-amber-50 border-amber-200"
          : highlight
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
          highlight
            ? "text-white"
            : urgent
              ? "text-amber-700"
              : "text-neutral-900"
        }`}
      >
        {value}
      </p>
      {sub && (
        <p
          className={`text-[10px] mt-0.5 ${
            subColor ??
            (highlight
              ? "text-neutral-500"
              : urgent
                ? "text-amber-600"
                : "text-neutral-400")
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
