"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Target,
  Calendar,
  TrendingUp,
  Save,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/products";

type SellerRow = {
  id: string;
  fullName: string;
  targetCop: number; // 0 = sin meta definida
  achievedCop: number;
  salesCount: number;
};

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function AdminMetasPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [rows, setRows] = useState<SellerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();

        // Fetch sellers (vendedor + admin que también vende)
        const [sellersRes, targetsRes, salesRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, role")
            .in("role", ["vendedor", "admin"])
            .order("full_name"),
          supabase
            .from("seller_targets")
            .select("seller_id, target_cop")
            .eq("period_year", year)
            .eq("period_month", month),
          // Ventas locales del mes para calcular logro
          supabase
            .from("orders")
            .select("seller_id, total_cop, created_at, status")
            .eq("payment_provider", "local")
            .neq("status", "cancelled"),
        ]);

        if (sellersRes.error) throw sellersRes.error;
        if (cancelled) return;

        const sellers = sellersRes.data ?? [];
        const targets = new Map<string, number>(
          (targetsRes.data ?? []).map((t) => [t.seller_id, t.target_cop])
        );

        // Filtrar ventas del período seleccionado
        const monthStart = new Date(year, month - 1, 1).getTime();
        const monthEnd = new Date(year, month, 0, 23, 59, 59, 999).getTime();
        const achievedMap = new Map<string, { revenue: number; count: number }>();
        for (const o of salesRes.data ?? []) {
          if (!o.seller_id) continue;
          const t = new Date(o.created_at.replace(" ", "T")).getTime();
          if (t < monthStart || t > monthEnd) continue;
          const cur = achievedMap.get(o.seller_id) ?? { revenue: 0, count: 0 };
          cur.revenue += o.total_cop;
          cur.count += 1;
          achievedMap.set(o.seller_id, cur);
        }

        const built: SellerRow[] = sellers.map((s) => {
          const a = achievedMap.get(s.id);
          return {
            id: s.id,
            fullName: s.full_name || "Sin nombre",
            targetCop: targets.get(s.id) ?? 0,
            achievedCop: a?.revenue ?? 0,
            salesCount: a?.count ?? 0,
          };
        });

        if (!cancelled) {
          setRows(built);
          setDrafts({});
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [year, month]);

  const totals = useMemo(() => {
    if (!rows) return null;
    const target = rows.reduce((s, r) => s + r.targetCop, 0);
    const achieved = rows.reduce((s, r) => s + r.achievedCop, 0);
    const sales = rows.reduce((s, r) => s + r.salesCount, 0);
    const withTarget = rows.filter((r) => r.targetCop > 0).length;
    return { target, achieved, sales, withTarget };
  }, [rows]);

  const navigateMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1)  { m = 12; y--; }
    setMonth(m);
    setYear(y);
  };

  const handleSave = async (sellerId: string) => {
    const draft = drafts[sellerId];
    if (draft === undefined) return;
    const target = Math.max(0, Math.round(Number(draft.replace(/[^\d]/g, "")) || 0));
    setSavingId(sellerId);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("seller_targets")
        .upsert(
          {
            seller_id: sellerId,
            period_year: year,
            period_month: month,
            target_cop: target,
            created_by: user?.id ?? null,
          },
          { onConflict: "seller_id,period_year,period_month" }
        );
      if (error) throw error;
      setRows((prev) =>
        prev?.map((r) => (r.id === sellerId ? { ...r, targetCop: target } : r)) ?? null
      );
      setDrafts((d) => {
        const next = { ...d };
        delete next[sellerId];
        return next;
      });
      setSavedFlash(sellerId);
      setTimeout(() => setSavedFlash((cur) => (cur === sellerId ? null : cur)), 1500);
    } catch (err) {
      alert("Error al guardar: " + (err as Error).message);
    }
    setSavingId(null);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <Target size={22} className="text-[#3B9DD8]" /> Metas mensuales
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Define la meta de ingresos por vendedor para cada mes. El vendedor verá
            su barra de progreso en el panel.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-2 py-1.5">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-1.5 rounded-lg hover:bg-neutral-100 transition"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={14} />
          </button>
          <div className="flex items-center gap-1.5 px-2 text-sm font-semibold text-neutral-800">
            <Calendar size={13} className="text-neutral-400" />
            {MONTH_NAMES[month - 1]} {year}
          </div>
          <button
            onClick={() => navigateMonth(1)}
            className="p-1.5 rounded-lg hover:bg-neutral-100 transition"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </motion.div>

      {/* KPIs del mes */}
      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi
            label="Meta total del equipo"
            value={formatPrice(totals.target)}
            sub={`${totals.withTarget}/${rows?.length ?? 0} con meta definida`}
          />
          <Kpi
            label="Logrado"
            value={formatPrice(totals.achieved)}
            sub={
              totals.target > 0
                ? `${Math.round((totals.achieved / totals.target) * 100)}% de la meta`
                : "Sin meta para comparar"
            }
            highlight
          />
          <Kpi label="Ventas registradas" value={String(totals.sales)} />
          <Kpi
            label="Faltante"
            value={formatPrice(Math.max(0, totals.target - totals.achieved))}
            sub={
              totals.target > 0 && totals.achieved >= totals.target
                ? "¡Meta alcanzada!"
                : undefined
            }
          />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {!rows && !error && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center text-sm text-neutral-400">
          Cargando…
        </div>
      )}

      {rows && rows.length === 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center">
          <p className="text-sm font-semibold text-neutral-700 mb-1">
            No hay vendedores en el equipo.
          </p>
          <Link href="/admin/usuarios" className="text-xs text-[#3B9DD8] hover:underline">
            Crear vendedor →
          </Link>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <ul className="divide-y divide-neutral-100">
            {rows.map((r) => {
              const draft = drafts[r.id];
              const draftNum = draft !== undefined
                ? Math.max(0, Math.round(Number(draft.replace(/[^\d]/g, "")) || 0))
                : null;
              const dirty = draftNum !== null && draftNum !== r.targetCop;
              const target = r.targetCop;
              const pct = target > 0 ? Math.min(100, (r.achievedCop / target) * 100) : 0;
              const flash = savedFlash === r.id;
              return (
                <li key={r.id} className="px-5 py-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {initials(r.fullName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 truncate">
                          {r.fullName}
                        </p>
                        <p className="text-[11px] text-neutral-500">
                          <TrendingUp size={9} className="inline -mt-0.5 mr-0.5 text-neutral-400" />
                          {formatPrice(r.achievedCop)} vendidos · {r.salesCount} venta{r.salesCount === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">$</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={draft !== undefined ? draft : (target > 0 ? formatNumeric(target) : "")}
                          onChange={(e) =>
                            setDrafts((d) => ({ ...d, [r.id]: e.target.value }))
                          }
                          placeholder="Sin meta"
                          className="w-40 pl-6 pr-3 py-2 rounded-lg border border-neutral-200 text-sm font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30 placeholder:font-normal placeholder:text-neutral-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSave(r.id)}
                        disabled={!dirty || savingId === r.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                          flash
                            ? "bg-green-500 text-white"
                            : dirty
                              ? "bg-[#3B9DD8] text-white hover:bg-[#2A84BE]"
                              : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                        }`}
                      >
                        {flash ? (
                          <>
                            <Check size={13} /> Guardado
                          </>
                        ) : (
                          <>
                            <Save size={13} /> {savingId === r.id ? "..." : "Guardar"}
                          </>
                        )}
                      </button>
                      <Link
                        href={`/admin/vendedor/${r.id}`}
                        className="p-2 rounded-lg text-neutral-400 hover:text-[#3B9DD8] hover:bg-blue-50 transition"
                        title="Ver detalle del vendedor"
                      >
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  {target > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-neutral-500">
                        <span>{Math.round(pct)}% de la meta</span>
                        <span>
                          {formatPrice(r.achievedCop)} / {formatPrice(target)}
                        </span>
                      </div>
                      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct >= 100
                              ? "bg-green-500"
                              : pct >= 75
                                ? "bg-[#3B9DD8]"
                                : pct >= 40
                                  ? "bg-amber-400"
                                  : "bg-red-400"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {target === 0 && (
                    <p className="text-[11px] text-neutral-400">
                      Sin meta definida para este mes.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="text-[11px] text-neutral-400">
        El vendedor ve su propia meta y progreso en el panel <code className="text-[10px]">/vendedor</code>.
        Define metas distintas por mes navegando con los botones del calendario.
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 ${
        highlight ? "bg-neutral-900 border-neutral-900" : "bg-white border-neutral-200"
      }`}
    >
      <p
        className={`text-[10px] uppercase tracking-wider font-semibold mb-1 ${
          highlight ? "text-neutral-500" : "text-neutral-400"
        }`}
      >
        {label}
      </p>
      <p className={`text-lg font-bold truncate ${highlight ? "text-white" : "text-neutral-900"}`}>
        {value}
      </p>
      {sub && (
        <p className={`text-[10px] mt-0.5 ${highlight ? "text-neutral-500" : "text-neutral-400"}`}>
          {sub}
        </p>
      )}
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatNumeric(n: number): string {
  return n.toLocaleString("es-CO");
}
