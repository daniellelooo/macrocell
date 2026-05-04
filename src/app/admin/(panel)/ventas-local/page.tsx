"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Store,
  Calendar,
  TrendingUp,
  UserCheck,
  CreditCard,
  Trophy,
  ArrowRight,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/products";

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

type PeriodKey =
  | "today"
  | "7d"
  | "30d"
  | "thisMonth"
  | "lastMonth"
  | "ytd"
  | "all";

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

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function resolvePeriod(key: PeriodKey): { start: Date | null; end: Date | null; label: string } {
  const now = new Date();
  const today = startOfDay(now);
  if (key === "today") {
    return { start: today, end: now, label: "Hoy" };
  }
  if (key === "7d") {
    return { start: new Date(today.getTime() - 6 * 86400000), end: now, label: "Últimos 7 días" };
  }
  if (key === "30d") {
    return { start: new Date(today.getTime() - 29 * 86400000), end: now, label: "Últimos 30 días" };
  }
  if (key === "thisMonth") {
    return { start: startOfMonth(now), end: now, label: "Este mes" };
  }
  if (key === "lastMonth") {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return { start: lm, end, label: "Mes pasado" };
  }
  if (key === "ytd") {
    return { start: new Date(now.getFullYear(), 0, 1), end: now, label: `${now.getFullYear()}` };
  }
  return { start: null, end: null, label: "Todo el tiempo" };
}

export default function VentasLocalPage() {
  const [orders, setOrders] = useState<LocalOrder[] | null>(null);
  const [sellerNames, setSellerNames] = useState<Record<string, string>>({});
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error: oErr } = await supabase
          .from("orders")
          .select(
            "id, order_number, total_cop, created_at, status, seller_id, customer_name, payment_method_type"
          )
          .eq("payment_provider", "local")
          .order("created_at", { ascending: false });
        if (oErr) throw oErr;
        if (cancelled) return;
        const list = (data ?? []) as LocalOrder[];
        setOrders(list);

        const sellerIds = [
          ...new Set(list.filter((o) => o.seller_id).map((o) => o.seller_id as string)),
        ];
        if (sellerIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", sellerIds);
          if (cancelled) return;
          const map: Record<string, string> = {};
          for (const p of profiles ?? []) map[p.id] = p.full_name || "Sin nombre";
          setSellerNames(map);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const periodInfo = useMemo(() => resolvePeriod(period), [period]);

  const inPeriod = useMemo(() => {
    if (!orders) return [];
    const validOrders = orders.filter((o) => o.status !== "cancelled");
    if (!periodInfo.start || !periodInfo.end) return validOrders;
    return validOrders.filter((o) => {
      const d = safeDate(o.created_at);
      return d >= periodInfo.start! && d <= periodInfo.end!;
    });
  }, [orders, periodInfo]);

  const metrics = useMemo(() => {
    const totalRevenue = inPeriod.reduce((s, o) => s + o.total_cop, 0);
    const count = inPeriod.length;
    const avg = count > 0 ? Math.round(totalRevenue / count) : 0;

    const sellerStats = new Map<
      string,
      { sellerId: string; name: string; count: number; revenue: number }
    >();
    for (const o of inPeriod) {
      if (!o.seller_id) continue;
      const cur = sellerStats.get(o.seller_id) ?? {
        sellerId: o.seller_id,
        name: sellerNames[o.seller_id] ?? "Vendedor",
        count: 0,
        revenue: 0,
      };
      cur.count += 1;
      cur.revenue += o.total_cop;
      sellerStats.set(o.seller_id, cur);
    }

    const paymentBreakdown: Record<string, { count: number; revenue: number }> = {};
    for (const o of inPeriod) {
      const method = o.payment_method_type ?? "Efectivo";
      const cur = paymentBreakdown[method] ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += o.total_cop;
      paymentBreakdown[method] = cur;
    }

    return {
      totalRevenue,
      count,
      avg,
      sellers: Array.from(sellerStats.values()).sort((a, b) => b.revenue - a.revenue),
      paymentBreakdown,
      recent: inPeriod.slice(0, 8),
    };
  }, [inPeriod, sellerNames]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
        Error: {error}
      </div>
    );
  }

  if (!orders) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-neutral-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-neutral-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

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
            <Store size={22} className="text-[#3B9DD8]" /> Ventas del local
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Solo ventas físicas registradas por los vendedores · {periodInfo.label}
          </p>
        </div>
        <div className="inline-flex items-center bg-white border border-neutral-200 rounded-xl px-2.5 py-2 gap-2">
          <Calendar size={14} className="text-neutral-400" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodKey)}
            className="text-sm font-medium text-neutral-800 bg-transparent focus:outline-none cursor-pointer"
          >
            {PERIODS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Kpi
          label="Ingresos local"
          value={formatPrice(metrics.totalRevenue)}
          icon={<TrendingUp size={15} className="text-green-300" />}
          highlight
        />
        <Kpi
          label="Ventas en tienda"
          value={String(metrics.count)}
          icon={<Store size={15} className="text-neutral-400" />}
        />
        <Kpi
          label="Ticket promedio"
          value={formatPrice(metrics.avg)}
          icon={<CreditCard size={15} className="text-neutral-400" />}
        />
      </div>

      {/* Ranking de vendedores */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
            <Trophy size={12} className="text-[#3B9DD8]" /> Ranking de vendedores
          </p>
          <span className="text-[10px] text-neutral-400">por ingresos del período</span>
        </div>
        {metrics.sellers.length === 0 ? (
          <p className="text-xs text-neutral-400 text-center py-4">
            Sin ventas locales en el período.
          </p>
        ) : (
          <div className="space-y-3">
            {metrics.sellers.map((s, i) => {
              const max = metrics.sellers[0].revenue;
              const pct = (s.revenue / max) * 100;
              return (
                <div key={s.sellerId} className="space-y-1.5">
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
                    <span className="text-sm font-semibold text-neutral-900 flex-1 min-w-0 truncate">
                      {s.name}
                    </span>
                    <span className="text-xs font-bold text-neutral-900 shrink-0">
                      {formatPrice(s.revenue)}
                    </span>
                    <Link
                      href={`/admin/vendedor/${s.sellerId}`}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-[#3B9DD8] hover:bg-red-50 transition shrink-0"
                      title="Ver detalle del vendedor"
                    >
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 pl-12">
                    <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#3B9DD8] rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-neutral-500 shrink-0">
                      {s.count} venta{s.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Métodos de pago + Ventas recientes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-4 flex items-center gap-1.5">
            <CreditCard size={12} /> Métodos de pago
          </p>
          {Object.keys(metrics.paymentBreakdown).length === 0 ? (
            <p className="text-xs text-neutral-400">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(metrics.paymentBreakdown)
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .map(([method, data]) => {
                  const pct =
                    metrics.totalRevenue > 0
                      ? Math.round((data.revenue / metrics.totalRevenue) * 100)
                      : 0;
                  return (
                    <div key={method}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-neutral-600 truncate">{method}</span>
                        <span className="font-bold text-neutral-900 shrink-0 pl-1">
                          {formatPrice(data.revenue)} ({pct}%)
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

        <div className="md:col-span-2 bg-white rounded-2xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Ventas recientes
            </p>
            <Link
              href="/admin/ordenes?canal=local"
              className="text-[11px] text-[#3B9DD8] font-semibold hover:underline flex items-center gap-1"
            >
              Ver todas <ArrowRight size={11} />
            </Link>
          </div>
          {metrics.recent.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-4">
              Sin ventas en el período
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {metrics.recent.map((o) => (
                <li key={o.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-neutral-700">
                        {o.order_number}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        Local
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                      {o.seller_id ? sellerNames[o.seller_id] ?? "Vendedor" : "Sin vendedor"}
                      {o.customer_name ? ` · ${o.customer_name}` : ""}
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
              ))}
            </ul>
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
