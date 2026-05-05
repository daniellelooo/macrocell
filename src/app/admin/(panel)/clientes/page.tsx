"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  Phone,
  Mail,
  ShoppingBag,
  ChevronRight,
  Shield,
  Download,
  X,
  MessageCircle,
  Filter,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/products";
import { useSiteConfigStore, getWhatsappUrl } from "@/lib/site-config-store";

type CustomerRow = {
  userId: string;
  fullName: string;
  phone: string;
  email: string | null;
  isAdmin: boolean;
  role: string;
  createdAt: string;
  ordersCount: number;
  ordersTotalCop: number;
  lastOrderAt: string | null;
  avgOrderCop: number;
};

type DetailOrder = {
  id: string;
  orderNumber: string;
  status: string;
  totalCop: number;
  createdAt: string;
};

type SortKey = "spend" | "orders" | "recent" | "registered" | "name";
type FilterKey = "all" | "withOrders" | "noOrders" | "vip";

export default function AdminClientesPage() {
  const [rows, setRows] = useState<CustomerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("spend");
  const [filter, setFilter] = useState<FilterKey>("all");

  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [detailOrders, setDetailOrders] = useState<DetailOrder[] | null>(null);
  const [savingRole, setSavingRole] = useState(false);

  const whatsappNumber = useSiteConfigStore((s) => s.whatsappNumber);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchCustomers();
        if (!cancelled) setRows(list);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const detail = useMemo(
    () => rows?.find((r) => r.userId === detailUserId) ?? null,
    [rows, detailUserId]
  );

  useEffect(() => {
    if (!detailUserId) return;
    // Limpiar pedidos del cliente anterior mientras carga el nuevo,
    // evitar que se vean los de otro perfil por unos ms.
    setDetailOrders(null);
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, status, total_cop, created_at")
        .eq("user_id", detailUserId)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setDetailOrders(
          (data ?? []).map((o) => ({
            id: o.id,
            orderNumber: o.order_number,
            status: o.status,
            totalCop: o.total_cop,
            createdAt: o.created_at,
          }))
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailUserId]);

  const closeDetail = () => {
    setDetailUserId(null);
    setDetailOrders(null);
  };

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    const vipThreshold =
      [...rows].sort((a, b) => b.ordersTotalCop - a.ordersTotalCop)[
        Math.floor(rows.length * 0.1)
      ]?.ordersTotalCop ?? 0;

    return rows
      .filter((r) => {
        if (filter === "withOrders" && r.ordersCount === 0) return false;
        if (filter === "noOrders" && r.ordersCount > 0) return false;
        if (filter === "vip" && r.ordersTotalCop < vipThreshold) return false;
        if (!q) return true;
        return (
          r.fullName.toLowerCase().includes(q) ||
          r.phone.includes(q) ||
          (r.email ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "spend":
            return b.ordersTotalCop - a.ordersTotalCop;
          case "orders":
            return b.ordersCount - a.ordersCount;
          case "recent":
            return (b.lastOrderAt ?? "").localeCompare(a.lastOrderAt ?? "");
          case "registered":
            return b.createdAt.localeCompare(a.createdAt);
          case "name":
            return a.fullName.localeCompare(b.fullName);
        }
      });
  }, [rows, search, sortBy, filter]);

  const totals = useMemo(() => {
    if (!rows) return { customers: 0, withOrders: 0, revenue: 0, avg: 0 };
    const customers = rows.length;
    const withOrders = rows.filter((r) => r.ordersCount > 0).length;
    const revenue = rows.reduce((s, r) => s + r.ordersTotalCop, 0);
    const avg = withOrders > 0 ? Math.round(revenue / withOrders) : 0;
    return { customers, withOrders, revenue, avg };
  }, [rows]);

  const exportCsv = () => {
    if (!rows) return;
    const headers = [
      "Nombre",
      "Teléfono",
      "Email",
      "Pedidos",
      "Total gastado (COP)",
      "Ticket promedio",
      "Último pedido",
      "Registro",
    ];
    const lines = [headers.join(",")];
    for (const r of filtered) {
      lines.push(
        [
          quote(r.fullName),
          quote(r.phone),
          quote(r.email ?? ""),
          r.ordersCount,
          r.ordersTotalCop,
          r.avgOrderCop,
          r.lastOrderAt ? r.lastOrderAt.slice(0, 10) : "",
          r.createdAt.slice(0, 10),
        ].join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes-macrocell-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const promoteRole = async (userId: string, newRole: string) => {
    setSavingRole(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase
        .from("profiles")
        .update({ role: newRole, is_admin: newRole === "admin" })
        .eq("id", userId);
      setRows(
        (prev) =>
          prev?.map((r) =>
            r.userId === userId
              ? { ...r, role: newRole, isAdmin: newRole === "admin" }
              : r
          ) ?? null
      );
    } finally {
      setSavingRole(false);
    }
  };

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
            <Users size={22} className="text-[#3B9DD8]" /> Clientes
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Personas registradas en la tienda. Click para ver pedidos, promover o
            contactar.
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={!rows}
          className="inline-flex items-center gap-2 bg-white border border-neutral-200 px-3 py-2.5 rounded-xl text-xs font-semibold hover:border-neutral-400 transition disabled:opacity-50"
        >
          <Download size={13} /> Exportar CSV
        </button>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Clientes registrados" value={String(totals.customers)} />
        <Kpi label="Compraron alguna vez" value={String(totals.withOrders)} />
        <Kpi label="Ventas a clientes" value={formatPrice(totals.revenue)} />
        <Kpi label="Ticket promedio" value={formatPrice(totals.avg)} />
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 p-4 space-y-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, teléfono o email…"
            className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center bg-neutral-50 rounded-lg p-0.5 border border-neutral-200">
            {(
              [
                { k: "all", label: "Todos" },
                { k: "withOrders", label: "Con compras" },
                { k: "noOrders", label: "Sin compras" },
                { k: "vip", label: "Top 10%" },
              ] as { k: FilterKey; label: string }[]
            ).map((f) => (
              <button
                key={f.k}
                onClick={() => setFilter(f.k)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition ${
                  filter === f.k
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
            <Filter size={12} /> Ordenar:
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="bg-white border border-neutral-200 rounded-lg px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
            >
              <option value="spend">Total gastado</option>
              <option value="orders">N° pedidos</option>
              <option value="recent">Última compra</option>
              <option value="registered">Registro reciente</option>
              <option value="name">Nombre A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
          No se pudieron cargar los clientes: {error}
        </div>
      )}

      {!rows && !error && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center text-sm text-neutral-400">
          Cargando clientes…
        </div>
      )}

      {rows && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center">
          <Users size={28} className="text-neutral-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-neutral-700">
            {search || filter !== "all"
              ? "Ningún cliente coincide con los filtros."
              : "Todavía no hay clientes registrados."}
          </p>
        </div>
      )}

      {rows && filtered.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <ul className="divide-y divide-neutral-100">
            {filtered.map((c) => (
              <li key={c.userId}>
                <button
                  onClick={() => setDetailUserId(c.userId)}
                  className="w-full text-left flex items-center gap-4 px-4 md:px-5 py-4 hover:bg-neutral-50 transition group"
                >
                  <div className="w-10 h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {initials(c.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-neutral-900 truncate">
                        {c.fullName || "(sin nombre)"}
                      </p>
                      {c.role !== "cliente" && (
                        <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold bg-[#3B9DD8]/10 text-[#3B9DD8] px-1.5 py-0.5 rounded-full">
                          <Shield size={9} /> {c.role}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-neutral-500 mt-0.5">
                      {c.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail size={10} /> {c.email}
                        </span>
                      )}
                      {c.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={10} /> {c.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-neutral-900 inline-flex items-center gap-1">
                      <ShoppingBag size={11} className="text-neutral-400" />
                      {c.ordersCount}
                    </p>
                    {c.ordersTotalCop > 0 ? (
                      <p className="text-[11px] text-neutral-500">
                        {formatPrice(c.ordersTotalCop)}
                      </p>
                    ) : (
                      <p className="text-[10px] text-neutral-400">sin compras</p>
                    )}
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-neutral-300 group-hover:text-neutral-500 transition shrink-0"
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Drawer de detalle */}
      {detail && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex justify-end"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDetail();
          }}
        >
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-neutral-100 px-5 py-4 flex items-center justify-between">
              <p className="text-sm font-bold text-neutral-900">Detalle del cliente</p>
              <button
                onClick={() => closeDetail()}
                className="p-1.5 rounded-lg hover:bg-neutral-100"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-neutral-900 text-white flex items-center justify-center text-base font-bold">
                  {initials(detail.fullName)}
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-neutral-900 truncate">
                    {detail.fullName || "(sin nombre)"}
                  </p>
                  <p className="text-xs text-neutral-500 truncate">
                    {detail.email || "Sin email registrado"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Stat label="Pedidos" value={String(detail.ordersCount)} />
                <Stat label="Gastado" value={formatPrice(detail.ordersTotalCop)} />
                <Stat label="Ticket prom." value={formatPrice(detail.avgOrderCop)} />
              </div>

              {detail.phone && (
                <div className="flex gap-2">
                  <a
                    href={getWhatsappUrl(
                      whatsappNumber,
                      `Hola ${detail.fullName.split(" ")[0]}, te escribo de Macrocell.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#25D366] text-white hover:bg-[#1da851] transition"
                  >
                    <MessageCircle size={12} /> WhatsApp
                  </a>
                  <a
                    href={`tel:${detail.phone}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition"
                  >
                    <Phone size={12} /> Llamar
                  </a>
                </div>
              )}

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
                  Rol
                </p>
                <select
                  value={detail.role}
                  onChange={(e) => promoteRole(detail.userId, e.target.value)}
                  disabled={savingRole}
                  className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30 disabled:opacity-50"
                >
                  <option value="cliente">Cliente</option>
                  <option value="vendedor">Promover a vendedor</option>
                  <option value="gestor_inventario">Promover a gestor de inventario</option>
                  <option value="admin">Promover a admin</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    Pedidos ({detailOrders?.length ?? "…"})
                  </p>
                  {detail.ordersCount > 0 && (
                    <Link
                      href={`/admin/ordenes?cliente=${encodeURIComponent(detail.userId)}`}
                      className="text-[11px] text-[#3B9DD8] font-semibold hover:underline"
                    >
                      Ver todos
                    </Link>
                  )}
                </div>
                {!detailOrders ? (
                  <p className="text-xs text-neutral-400">Cargando…</p>
                ) : detailOrders.length === 0 ? (
                  <p className="text-xs text-neutral-400">Sin pedidos.</p>
                ) : (
                  <ul className="divide-y divide-neutral-100 border border-neutral-100 rounded-xl">
                    {detailOrders.slice(0, 8).map((o) => (
                      <li key={o.id} className="flex items-center justify-between px-3 py-2 text-xs">
                        <div className="min-w-0">
                          <p className="font-mono font-bold text-neutral-700 truncate">
                            {o.orderNumber}
                          </p>
                          <p className="text-[10px] text-neutral-400">
                            {new Date(o.createdAt).toLocaleDateString("es-CO", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            · {o.status}
                          </p>
                        </div>
                        <p className="font-bold text-neutral-900 shrink-0">
                          {formatPrice(o.totalCop)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* helpers */

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 px-4 py-3.5">
      <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold mb-1">
        {label}
      </p>
      <p className="text-xl font-bold text-neutral-900">{value}</p>
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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function quote(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function fetchCustomers(): Promise<CustomerRow[]> {
  const supabase = getSupabaseBrowserClient();

  const [profilesRes, ordersRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, phone, is_admin, role, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("user_id, customer_email, total_cop, created_at, status")
      .not("user_id", "is", null),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (ordersRes.error) throw ordersRes.error;

  const profiles = profilesRes.data ?? [];
  const orders = ordersRes.data ?? [];

  const byUser = new Map<
    string,
    { count: number; total: number; lastAt: string | null; lastEmail: string | null }
  >();
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    const id = o.user_id!;
    const cur = byUser.get(id) ?? {
      count: 0,
      total: 0,
      lastAt: null,
      lastEmail: null,
    };
    cur.count += 1;
    cur.total += o.total_cop ?? 0;
    if (!cur.lastAt || (o.created_at && o.created_at > cur.lastAt)) {
      cur.lastAt = o.created_at;
      cur.lastEmail = o.customer_email ?? cur.lastEmail;
    } else if (!cur.lastEmail) {
      cur.lastEmail = o.customer_email ?? null;
    }
    byUser.set(id, cur);
  }

  return profiles.map((p) => {
    const stats = byUser.get(p.id);
    const count = stats?.count ?? 0;
    const total = stats?.total ?? 0;
    return {
      userId: p.id,
      fullName: p.full_name ?? "",
      phone: p.phone ?? "",
      email: stats?.lastEmail ?? null,
      isAdmin: !!p.is_admin,
      role: p.role ?? "cliente",
      createdAt: p.created_at,
      ordersCount: count,
      ordersTotalCop: total,
      lastOrderAt: stats?.lastAt ?? null,
      avgOrderCop: count > 0 ? Math.round(total / count) : 0,
    };
  });
}
