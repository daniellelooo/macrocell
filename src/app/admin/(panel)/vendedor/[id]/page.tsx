"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  Package,
  ChevronDown,
  Calendar,
  CreditCard,
  CalendarDays,
  Trophy,
  Star,
  ShoppingBag,
} from "lucide-react";
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

type PeriodKey = "today" | "7d" | "30d" | "thisMonth" | "lastMonth" | "ytd" | "all";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "7d", label: "Últimos 7 días" },
  { key: "30d", label: "Últimos 30 días" },
  { key: "thisMonth", label: "Este mes" },
  { key: "lastMonth", label: "Mes pasado" },
  { key: "ytd", label: "Año en curso" },
  { key: "all", label: "Todo el tiempo" },
];

function safeDate(s: string): Date {
  return new Date(s.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"));
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function resolvePeriod(key: PeriodKey): { start: Date | null; end: Date | null; label: string } {
  const now = new Date();
  const today = startOfDay(now);
  if (key === "today") return { start: today, end: now, label: "Hoy" };
  if (key === "7d") return { start: new Date(today.getTime() - 6 * 86400000), end: now, label: "Últimos 7 días" };
  if (key === "30d") return { start: new Date(today.getTime() - 29 * 86400000), end: now, label: "Últimos 30 días" };
  if (key === "thisMonth") return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now, label: "Este mes" };
  if (key === "lastMonth") {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { start: lm, end: endOfMonth(lm), label: "Mes pasado" };
  }
  if (key === "ytd") return { start: new Date(now.getFullYear(), 0, 1), end: now, label: `${now.getFullYear()}` };
  return { start: null, end: null, label: "Todo el tiempo" };
}

export default function VendedorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [vendorName, setVendorName] = useState<string>("");
  const [sales, setSales] = useState<SaleRow[] | null>(null);
  const [teamRevenue, setTeamRevenue] = useState<{ sellerId: string; revenue: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("30d");

  useEffect(() => {
    if (!id) return;
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;

    (async () => {
      try {
        const [profileRes, mySalesRes, teamSalesRes, itemsRes] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", id).single(),
          supabase
            .from("orders")
            .select("id, order_number, created_at, status, total_cop, payment_method_type")
            .eq("seller_id", id)
            .eq("payment_provider", "local")
            .order("created_at", { ascending: false }),
          supabase
            .from("orders")
            .select("seller_id, total_cop, status, created_at")
            .eq("payment_provider", "local")
            .neq("status", "cancelled"),
          supabase
            .from("order_items")
            .select("order_id, product_name, variant_label, quantity, unit_price_cop"),
        ]);

        if (cancelled) return;
        setVendorName(profileRes.data?.full_name ?? "Vendedor");
        if (mySalesRes.error) throw mySalesRes.error;

        const orders = mySalesRes.data ?? [];
        const items = itemsRes.data ?? [];
        const orderIds = new Set(orders.map((o) => o.id));

        setSales(
          orders.map((o) => ({
            id: o.id,
            orderNumber: o.order_number,
            createdAt: o.created_at,
            status: o.status,
            totalCop: o.total_cop,
            paymentMethod: o.payment_method_type,
            items: items
              .filter((it) => orderIds.has(it.order_id) && it.order_id === o.id)
              .map((it) => ({
                productName: it.product_name,
                variantLabel: it.variant_label,
                quantity: it.quantity,
                unitPriceCop: it.unit_price_cop,
              })),
          }))
        );

        // Acumular ventas del equipo (todas las ventas locales no canceladas)
        const teamMap = new Map<string, number>();
        for (const o of teamSalesRes.data ?? []) {
          if (!o.seller_id) continue;
          teamMap.set(o.seller_id, (teamMap.get(o.seller_id) ?? 0) + o.total_cop);
        }
        setTeamRevenue([...teamMap.entries()].map(([sellerId, revenue]) => ({ sellerId, revenue })));
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();

    return () => { cancelled = true; };
  }, [id]);

  const periodInfo = useMemo(() => resolvePeriod(period), [period]);

  const inPeriod = useMemo(() => {
    if (!sales) return [];
    return sales.filter((s) => {
      if (s.status === "cancelled") return false;
      if (!periodInfo.start || !periodInfo.end) return true;
      const d = safeDate(s.createdAt);
      return d >= periodInfo.start && d <= periodInfo.end;
    });
  }, [sales, periodInfo]);

  const stats = useMemo(() => {
    if (!sales) return null;
    const totalSales = inPeriod.length;
    const totalRevenue = inPeriod.reduce((s, o) => s + o.totalCop, 0);
    const totalUnits = inPeriod.reduce(
      (s, o) => s + o.items.reduce((u, it) => u + it.quantity, 0),
      0
    );
    const avgTicket = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0;

    // Días con al menos una venta
    const days = new Set<string>();
    for (const s of inPeriod) days.add(dayKey(safeDate(s.createdAt)));
    const activeDays = days.size;

    return { totalSales, totalRevenue, totalUnits, avgTicket, activeDays };
  }, [sales, inPeriod]);

  // Top productos del vendedor en el período
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const s of inPeriod) {
      for (const it of s.items) {
        const cur = map.get(it.productName) ?? { name: it.productName, qty: 0, revenue: 0 };
        cur.qty += it.quantity;
        cur.revenue += it.quantity * it.unitPriceCop;
        map.set(it.productName, cur);
      }
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [inPeriod]);

  // Serie diaria para el mini-chart (últimos 14 días dentro del período)
  const dailySeries = useMemo(() => {
    if (!periodInfo.start || !periodInfo.end) {
      // "todo el tiempo": fallback a últimos 14 días
      const end = new Date();
      const start = new Date(end.getTime() - 13 * 86400000);
      return buildSeries(start, end, inPeriod);
    }
    const span = (periodInfo.end.getTime() - periodInfo.start.getTime()) / 86400000;
    if (span <= 60) return buildSeries(periodInfo.start, periodInfo.end, inPeriod);
    // Para períodos largos, mostrar últimos 30 días
    const end = periodInfo.end;
    const start = new Date(end.getTime() - 29 * 86400000);
    return buildSeries(start, end, inPeriod);
  }, [inPeriod, periodInfo]);

  // Posición del vendedor en el ranking del equipo (todo el tiempo)
  const teamRank = useMemo(() => {
    if (teamRevenue.length === 0) return null;
    const sorted = [...teamRevenue].sort((a, b) => b.revenue - a.revenue);
    const rank = sorted.findIndex((s) => s.sellerId === id);
    return { rank: rank >= 0 ? rank + 1 : null, total: sorted.length };
  }, [teamRevenue, id]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          href="/admin/usuarios"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 transition mb-4"
        >
          <ArrowLeft size={14} /> Volver al equipo
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
              <TrendingUp size={22} className="text-[#3B9DD8]" /> {vendorName || "Vendedor"}
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Rendimiento del vendedor · {periodInfo.label}
            </p>
          </div>
          <div className="inline-flex items-center bg-white border border-neutral-200 rounded-xl px-2.5 py-2 gap-2 self-start md:self-auto">
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
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {!sales && !error && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-neutral-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {stats && (
        <>
          {/* KPIs principales */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Kpi
              label="Total vendido"
              value={formatPrice(stats.totalRevenue)}
              icon={<TrendingUp size={14} className="text-green-300" />}
              highlight
            />
            <Kpi
              label="Ventas"
              value={String(stats.totalSales)}
              icon={<ShoppingBag size={14} className="text-neutral-400" />}
            />
            <Kpi
              label="Unidades"
              value={String(stats.totalUnits)}
              icon={<Package size={14} className="text-neutral-400" />}
            />
            <Kpi
              label="Ticket promedio"
              value={formatPrice(stats.avgTicket)}
              icon={<CreditCard size={14} className="text-neutral-400" />}
            />
            <Kpi
              label="Días activos"
              value={String(stats.activeDays)}
              sub={stats.activeDays > 0 ? `${formatPrice(Math.round(stats.totalRevenue / stats.activeDays))} / día` : undefined}
              icon={<CalendarDays size={14} className="text-neutral-400" />}
            />
          </div>

          {/* Posición en ranking */}
          {teamRank?.rank && teamRank.total > 1 && (
            <div className="bg-gradient-to-r from-[#3B9DD8]/10 to-transparent border border-[#3B9DD8]/20 rounded-2xl px-5 py-3 flex items-center gap-3">
              <Trophy size={16} className="text-[#3B9DD8] shrink-0" />
              <p className="text-sm text-neutral-700">
                Posición en el equipo (todo el tiempo):{" "}
                <span className="font-bold text-neutral-900">
                  #{teamRank.rank} de {teamRank.total}
                </span>
              </p>
            </div>
          )}

          {/* Chart + Top productos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-white rounded-2xl border border-neutral-200 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-4">
                Ingresos por día
              </p>
              {dailySeries.every((p) => p.revenue === 0) ? (
                <div className="h-40 flex items-center justify-center text-xs text-neutral-400">
                  Sin ventas en el período
                </div>
              ) : (
                <DailyBars points={dailySeries} />
              )}
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-4 flex items-center gap-1.5">
                <Star size={12} className="text-[#3B9DD8]" /> Top productos
              </p>
              {topProducts.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-4">Sin datos</p>
              ) : (
                <ol className="space-y-3">
                  {topProducts.map((p, i) => {
                    const max = topProducts[0].qty;
                    const pct = (p.qty / max) * 100;
                    return (
                      <li key={p.name} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-neutral-400 w-3 shrink-0">{i + 1}</span>
                          <span className="text-xs font-medium text-neutral-800 flex-1 min-w-0 truncate">{p.name}</span>
                          <span className="text-xs font-bold text-neutral-900 shrink-0">{p.qty}</span>
                        </div>
                        <div className="flex items-center gap-2 pl-5">
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
          </div>
        </>
      )}

      {sales && sales.length === 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center">
          <Package size={28} className="text-neutral-300 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">Este vendedor no tiene ventas registradas.</p>
        </div>
      )}

      {sales && sales.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-800">
              Ventas del período ({inPeriod.length})
            </h2>
            {inPeriod.length !== sales.filter((s) => s.status !== "cancelled").length && (
              <span className="text-[11px] text-neutral-400">
                {sales.filter((s) => s.status !== "cancelled").length} en total
              </span>
            )}
          </div>
          {inPeriod.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-neutral-400">
              Sin ventas en este período.
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {inPeriod.map((s) => {
                const statusLabel = ORDER_STATUS_LABEL[s.status] ?? s.status;
                const statusColor = ORDER_STATUS_COLOR[s.status] ?? "bg-neutral-100 text-neutral-700";
                const date = safeDate(s.createdAt);

                return (
                  <div key={s.id}>
                    <button
                      onClick={() => setOpenId((cur) => (cur === s.id ? null : s.id))}
                      className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-neutral-50 transition"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-neutral-900">{s.orderNumber}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          {date.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}{" "}
                          {date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                          {s.paymentMethod && ` · ${s.paymentMethod}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-neutral-900">{formatPrice(s.totalCop)}</p>
                        <p className="text-[10px] text-neutral-400">
                          {s.items.length} ítem{s.items.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <ChevronDown
                        size={15}
                        className={`text-neutral-400 shrink-0 transition-transform ${openId === s.id ? "rotate-180" : ""}`}
                      />
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
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* -------- Helpers -------- */

type DayPoint = { label: string; revenue: number; orders: number };

function buildSeries(start: Date, end: Date, sales: SaleRow[]): DayPoint[] {
  const cursor = startOfDay(start);
  const last = startOfDay(end);
  const points: DayPoint[] = [];
  while (cursor <= last) {
    const dStart = new Date(cursor);
    const dEnd = new Date(cursor.getTime() + 86400000);
    const inRange = sales.filter((o) => {
      const d = safeDate(o.createdAt);
      return d >= dStart && d < dEnd;
    });
    points.push({
      label: dStart.toLocaleDateString("es-CO", { day: "2-digit", month: "short" }),
      revenue: inRange.reduce((s, o) => s + o.totalCop, 0),
      orders: inRange.length,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return points;
}

function DailyBars({ points }: { points: DayPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...points.map((p) => p.revenue), 1);
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-40">
        {points.map((p, i) => {
          const h = p.revenue === 0 ? 2 : Math.max(4, (p.revenue / max) * 150);
          return (
            <div
              key={i}
              className="flex-1 relative group cursor-pointer"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div
                className={`w-full rounded-t-md transition-all ${
                  p.revenue === 0 ? "bg-neutral-100" : hover === i ? "bg-[#2A84BE]" : "bg-[#3B9DD8]"
                }`}
                style={{ height: `${h}px` }}
              />
              {hover === i && p.revenue > 0 && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-neutral-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap z-10 pointer-events-none">
                  <div className="font-bold">{p.label}</div>
                  <div>{formatPrice(p.revenue)}</div>
                  <div className="text-neutral-400">{p.orders} venta{p.orders === 1 ? "" : "s"}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] text-neutral-400">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  sub,
  highlight = false,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 ${
        highlight ? "bg-neutral-900 border-neutral-900" : "bg-white border-neutral-200"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className={`text-[10px] uppercase tracking-wider font-semibold ${highlight ? "text-neutral-500" : "text-neutral-400"}`}>
          {label}
        </p>
        {icon}
      </div>
      <p className={`text-lg md:text-xl font-bold truncate ${highlight ? "text-white" : "text-neutral-900"}`}>
        {value}
      </p>
      {sub && (
        <p className={`text-[10px] mt-0.5 ${highlight ? "text-neutral-500" : "text-neutral-400"}`}>{sub}</p>
      )}
    </div>
  );
}
