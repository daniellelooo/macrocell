"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Search,
  ChevronDown,
  Package,
  User,
  MapPin,
  CreditCard,
  MessageCircle,
  Download,
  LayoutGrid,
  List,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/products";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_COLOR,
} from "@/lib/orders";
import { useSiteConfigStore, getWhatsappUrl } from "@/lib/site-config-store";

type OrderItemRow = {
  productName: string;
  variantLabel: string | null;
  quantity: number;
  unitPriceCop: number;
};

type OrderRow = {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  userId: string | null;
  shippingCity: string | null;
  shippingDepartment: string | null;
  shippingAddress: string | null;
  notes: string | null;
  totalCop: number;
  paymentProvider: string | null;
  paymentStatus: string | null;
  paymentMethodType: string | null;
  whatsappSent: boolean;
  items: OrderItemRow[];
};

const STATUS_FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "pending", label: "Pendientes" },
  { id: "confirmed", label: "Confirmados" },
  { id: "shipped", label: "En camino" },
  { id: "delivered", label: "Entregados" },
  { id: "cancelled", label: "Cancelados" },
] as const;

function AdminOrdenesContent() {
  const searchParams = useSearchParams();
  const clienteFilter = searchParams.get("cliente") ?? null;
  const whatsappNumber = useSiteConfigStore((s) => s.whatsappNumber);

  const [rows, setRows] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [openId, setOpenId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "kanban">("list");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchOrders();
        if (!cancelled) setRows(list);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (clienteFilter && r.userId !== clienteFilter) return false;
      if (statusFilter !== "todos" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.orderNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.customerPhone.includes(q) ||
        (r.customerEmail ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter, clienteFilter]);

  const totals = useMemo(() => {
    if (!rows) return { count: 0, revenue: 0, pending: 0 };
    return {
      count: rows.length,
      revenue: rows
        .filter((r) => r.status !== "cancelled")
        .reduce((s, r) => s + r.totalCop, 0),
      pending: rows.filter((r) => r.status === "pending").length,
    };
  }, [rows]);

  const exportCsv = () => {
    if (!filtered.length) return;
    const header = [
      "Número", "Fecha", "Estado", "Cliente", "Teléfono", "Email",
      "Ciudad", "Departamento", "Dirección", "Total COP", "Proveedor pago",
      "Estado pago", "Productos",
    ];
    const rows_csv = filtered.map((o) => {
      const date = new Date(o.createdAt).toLocaleDateString("es-CO", {
        day: "2-digit", month: "2-digit", year: "numeric",
      });
      const products = o.items
        .map((it) => `${it.productName}${it.variantLabel ? ` (${it.variantLabel})` : ""} x${it.quantity}`)
        .join(" | ");
      return [
        o.orderNumber, date, o.status, o.customerName, o.customerPhone,
        o.customerEmail ?? "", o.shippingCity ?? "", o.shippingDepartment ?? "",
        o.shippingAddress ?? "", String(o.totalCop),
        o.paymentProvider ?? "", o.paymentStatus ?? "", products,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [header.join(","), ...rows_csv].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const supabase = getSupabaseBrowserClient();
    const { error: e } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", id);
    if (e) {
      setError(e.message);
      return;
    }
    setRows((prev) =>
      prev ? prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)) : prev
    );
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
              <ShoppingBag size={22} className="text-[#3B9DD8]" /> Pedidos
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Todos los pedidos hechos en la tienda — invitados y clientes
              registrados.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex bg-white border border-neutral-200 rounded-xl p-0.5">
              <button
                onClick={() => setView("list")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 ${
                  view === "list"
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
                title="Vista lista"
              >
                <List size={13} /> Lista
              </button>
              <button
                onClick={() => setView("kanban")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 ${
                  view === "kanban"
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
                title="Vista Kanban"
              >
                <LayoutGrid size={13} /> Kanban
              </button>
            </div>
            <button
              onClick={exportCsv}
              disabled={!filtered.length}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition disabled:opacity-40"
              title="Exportar a CSV"
            >
              <Download size={13} /> Exportar
            </button>
          </div>
        </div>
        {clienteFilter && (
          <div className="mt-3 inline-flex items-center gap-2 bg-neutral-900 text-white text-xs px-3 py-1.5 rounded-full">
            Filtrando pedidos de un cliente
            <a
              href="/admin/ordenes"
              className="opacity-70 hover:opacity-100 underline"
            >
              quitar filtro
            </a>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Pedidos totales" value={String(totals.count)} />
        <Kpi label="Pendientes" value={String(totals.pending)} />
        <Kpi label="Ventas" value={formatPrice(totals.revenue)} />
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número de pedido, nombre, teléfono o email…"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm text-neutral-700 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === f.id
                  ? "bg-[#3B9DD8] text-white"
                  : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
          No se pudieron cargar los pedidos: {error}
        </div>
      )}

      {!rows && !error && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center text-sm text-neutral-400">
          Cargando pedidos…
        </div>
      )}

      {rows && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center">
          <Package size={28} className="text-neutral-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-neutral-700">
            {search || statusFilter !== "todos" || clienteFilter
              ? "Ningún pedido coincide con los filtros."
              : "Todavía no hay pedidos."}
          </p>
        </div>
      )}

      {rows && filtered.length > 0 && view === "list" && (
        <div className="space-y-2">
          {filtered.map((o) => (
            <OrderRowCard
              key={o.id}
              order={o}
              isOpen={openId === o.id}
              onToggle={() => setOpenId((cur) => (cur === o.id ? null : o.id))}
              onUpdateStatus={(s) => updateStatus(o.id, s)}
              whatsappNumber={whatsappNumber}
            />
          ))}
        </div>
      )}

      {rows && filtered.length > 0 && view === "kanban" && (
        <KanbanBoard
          orders={filtered}
          onUpdateStatus={updateStatus}
        />
      )}
    </div>
  );
}

export default function AdminOrdenesPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-neutral-400">Cargando pedidos…</div>
      }
    >
      <AdminOrdenesContent />
    </Suspense>
  );
}

/* ----------------------- componentes ----------------------- */

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 px-4 py-3.5">
      <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold mb-1">
        {label}
      </p>
      <p className="text-lg md:text-xl font-bold text-neutral-900">{value}</p>
    </div>
  );
}

type OrderCardProps = {
  order: OrderRow;
  isOpen: boolean;
  onToggle: () => void;
  onUpdateStatus: (newStatus: string) => void;
  whatsappNumber: string;
};

function OrderRowCard({
  order,
  isOpen,
  onToggle,
  onUpdateStatus,
  whatsappNumber,
}: OrderCardProps) {
  const statusLabel = ORDER_STATUS_LABEL[order.status] ?? order.status;
  const statusColor =
    ORDER_STATUS_COLOR[order.status] ?? "bg-neutral-100 text-neutral-700";
  const date = new Date(order.createdAt);
  const dateStr = date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const waMsg = `Hola ${order.customerName.split(" ")[0]}, te escribimos sobre tu pedido ${order.orderNumber} en Macrocell.`;
  const waUrl = getWhatsappUrl(order.customerPhone || whatsappNumber, waMsg);

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-4 md:px-5 py-3.5 text-left hover:bg-neutral-50 transition"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-neutral-900">
              {order.orderNumber}
            </span>
            <span
              className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColor}`}
            >
              {statusLabel}
            </span>
            {order.paymentProvider === "wompi" && (
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  order.paymentStatus === "approved"
                    ? "bg-green-100 text-green-700"
                    : order.paymentStatus === "declined"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                }`}
              >
                <CreditCard size={9} /> Wompi: {order.paymentStatus ?? "—"}
              </span>
            )}
            {!order.userId && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">
                invitado
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-neutral-500 mt-1">
            <span className="font-medium text-neutral-700">
              {order.customerName}
            </span>
            <span>·</span>
            <span>{order.customerPhone}</span>
            <span>·</span>
            <span>
              {dateStr} {timeStr}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-neutral-900">
            {formatPrice(order.totalCop)}
          </p>
          <p className="text-[10px] text-neutral-400">
            {order.items.length} ítem{order.items.length !== 1 ? "s" : ""}
          </p>
        </div>
        <ChevronDown
          size={16}
          className={`text-neutral-400 shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-neutral-100"
          >
            <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-5 bg-neutral-50/50">
              <section className="space-y-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                  <User size={11} /> Cliente
                </h3>
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-neutral-900">
                    {order.customerName}
                  </p>
                  {order.customerEmail && (
                    <p className="text-neutral-600">{order.customerEmail}</p>
                  )}
                  <p className="text-neutral-600">{order.customerPhone}</p>
                </div>

                <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5 pt-2">
                  <MapPin size={11} /> Envío
                </h3>
                <div className="text-sm text-neutral-700 leading-snug">
                  {order.shippingAddress ? (
                    <>
                      <p>{order.shippingAddress}</p>
                      <p className="text-neutral-500">
                        {[order.shippingCity, order.shippingDepartment]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </>
                  ) : (
                    <p className="text-neutral-400">Sin dirección registrada</p>
                  )}
                </div>

                {order.notes && (
                  <>
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 pt-2">
                      Notas del cliente
                    </h3>
                    <p className="text-sm text-neutral-700 italic">
                      &ldquo;{order.notes}&rdquo;
                    </p>
                  </>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                  <Package size={11} /> Productos
                </h3>
                <ul className="space-y-2">
                  {order.items.map((it, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm bg-white rounded-lg border border-neutral-200 p-2.5"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-neutral-900 leading-tight">
                          {it.productName}
                        </p>
                        {it.variantLabel && (
                          <p className="text-[11px] text-neutral-500">
                            {it.variantLabel}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0 text-xs">
                        <p className="font-semibold text-neutral-900">
                          ×{it.quantity}
                        </p>
                        <p className="text-neutral-500">
                          {formatPrice(it.unitPriceCop)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="bg-neutral-900 text-white rounded-lg p-3 flex items-center justify-between">
                  <span className="text-xs font-semibold">Total</span>
                  <span className="text-sm font-bold">
                    {formatPrice(order.totalCop)}
                  </span>
                </div>
              </section>

              <section className="md:col-span-2 space-y-3 border-t border-neutral-200 pt-4">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  Cambiar estado
                </h3>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(ORDER_STATUS_LABEL).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => onUpdateStatus(key)}
                      disabled={order.status === key}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                        order.status === key
                          ? "bg-neutral-900 text-white cursor-default"
                          : "bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-400"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white text-xs font-semibold px-3 py-2 rounded-full transition"
                  >
                    <MessageCircle size={12} /> Escribir al cliente
                  </a>
                  {order.paymentMethodType && (
                    <span className="inline-flex items-center gap-1.5 bg-white border border-neutral-200 text-neutral-600 text-xs font-semibold px-3 py-2 rounded-full">
                      <CreditCard size={12} /> {order.paymentMethodType}
                    </span>
                  )}
                </div>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ----------------------- data fetching ----------------------- */

async function fetchOrders(): Promise<OrderRow[]> {
  const supabase = getSupabaseBrowserClient();
  const [oRes, iRes] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("order_items").select("*"),
  ]);
  if (oRes.error) throw oRes.error;
  if (iRes.error) throw iRes.error;

  const orders = oRes.data ?? [];
  const items = iRes.data ?? [];

  return orders.map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    createdAt: o.created_at,
    status: o.status,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    customerEmail: o.customer_email,
    userId: o.user_id,
    shippingCity: o.shipping_city,
    shippingDepartment: o.shipping_department,
    shippingAddress: o.shipping_address,
    notes: o.notes,
    totalCop: o.total_cop,
    paymentProvider: o.payment_provider,
    paymentStatus: o.payment_status,
    paymentMethodType: o.payment_method_type,
    whatsappSent: o.whatsapp_sent,
    items: items
      .filter((it) => it.order_id === o.id)
      .map((it) => ({
        productName: it.product_name,
        variantLabel: it.variant_label,
        quantity: it.quantity,
        unitPriceCop: it.unit_price_cop,
      })),
  }));
}

/* ----------------------- Kanban ----------------------- */

const KANBAN_COLUMNS: { status: string; label: string; color: string }[] = [
  { status: "pending", label: "Pendientes", color: "border-amber-300 bg-amber-50" },
  { status: "confirmed", label: "Confirmados", color: "border-blue-300 bg-blue-50" },
  { status: "shipped", label: "En camino", color: "border-violet-300 bg-violet-50" },
  { status: "delivered", label: "Entregados", color: "border-green-300 bg-green-50" },
  { status: "cancelled", label: "Cancelados", color: "border-neutral-300 bg-neutral-100" },
];

function KanbanBoard({
  orders,
  onUpdateStatus,
}: {
  orders: OrderRow[];
  onUpdateStatus: (id: string, newStatus: string) => Promise<void>;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, OrderRow[]>();
    for (const col of KANBAN_COLUMNS) map.set(col.status, []);
    for (const o of orders) {
      const list = map.get(o.status) ?? [];
      list.push(o);
      map.set(o.status, list);
    }
    return map;
  }, [orders]);

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="flex gap-3 min-w-max pb-3">
        {KANBAN_COLUMNS.map((col) => {
          const columnOrders = grouped.get(col.status) ?? [];
          const total =
            col.status === "cancelled"
              ? 0
              : columnOrders.reduce((s, o) => s + o.totalCop, 0);
          return (
            <div
              key={col.status}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(col.status);
              }}
              onDragLeave={() => setOverCol((cur) => (cur === col.status ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                setOverCol(null);
                if (draggingId) {
                  const o = orders.find((x) => x.id === draggingId);
                  if (o && o.status !== col.status) {
                    void onUpdateStatus(draggingId, col.status);
                  }
                }
                setDraggingId(null);
              }}
              className={`w-72 shrink-0 rounded-2xl border-2 ${col.color} ${
                overCol === col.status ? "ring-2 ring-[#3B9DD8]/50" : ""
              } transition`}
            >
              <div className="px-3 py-2.5 border-b border-black/5 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-700">
                  {col.label}
                </p>
                <span className="text-[10px] font-bold text-neutral-500 bg-white px-2 py-0.5 rounded-full">
                  {columnOrders.length}
                </span>
              </div>
              {total > 0 && (
                <p className="px-3 pt-2 text-[10px] font-semibold text-neutral-500">
                  {formatPrice(total)}
                </p>
              )}
              <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto min-h-[80px]">
                {columnOrders.length === 0 ? (
                  <p className="text-[11px] text-neutral-400 text-center py-4">
                    Sin pedidos
                  </p>
                ) : (
                  columnOrders.map((o) => (
                    <div
                      key={o.id}
                      draggable={true}
                      onDragStart={() => setDraggingId(o.id)}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setOverCol(null);
                      }}
                      className={`bg-white rounded-xl border border-neutral-200 p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-neutral-400 transition ${
                        draggingId === o.id ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[11px] font-bold text-neutral-700">
                          {o.orderNumber}
                        </span>
                        {o.paymentProvider === "local" && (
                          <span className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-blue-100 text-blue-700">
                            Local
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-neutral-900 truncate">
                        {o.customerName}
                      </p>
                      <p className="text-[10px] text-neutral-500 truncate">
                        {o.shippingCity || o.customerPhone}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-900">
                          {formatPrice(o.totalCop)}
                        </span>
                        <span className="text-[9px] text-neutral-400">
                          {new Date(o.createdAt).toLocaleDateString("es-CO", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-500 mt-1.5 truncate">
                        {o.items.length} producto{o.items.length !== 1 ? "s" : ""} ·{" "}
                        {o.items.reduce((s, i) => s + i.quantity, 0)} unidades
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-neutral-400 mt-2 text-center">
        Arrastra una tarjeta a otra columna para cambiar su estado.
      </p>
    </div>
  );
}
