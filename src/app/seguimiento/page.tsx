"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Package, ArrowLeft, CheckCircle, Clock, Truck } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/products";
import { useSiteConfigStore, getWhatsappUrl } from "@/lib/site-config-store";

type OrderItem = {
  product_name: string;
  variant_label: string | null;
  quantity: number;
  unit_price_cop: number;
  image_url: string | null;
};

type TrackResult = {
  order_number: string;
  status: string;
  created_at: string;
  customer_name: string;
  shipping_city: string | null;
  shipping_department: string | null;
  total_cop: number;
  shipping_cop: number;
  subtotal_cop: number;
  payment_provider: string | null;
  items: OrderItem[];
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente de confirmación",
  confirmed: "Confirmado",
  shipped: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock size={20} className="text-amber-500" />,
  confirmed: <CheckCircle size={20} className="text-blue-500" />,
  shipped: <Truck size={20} className="text-violet-500" />,
  delivered: <CheckCircle size={20} className="text-green-500" />,
  cancelled: <Package size={20} className="text-neutral-400" />,
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-50 border-amber-200 text-amber-800",
  confirmed: "bg-blue-50 border-blue-200 text-blue-800",
  shipped: "bg-violet-50 border-violet-200 text-violet-800",
  delivered: "bg-green-50 border-green-200 text-green-800",
  cancelled: "bg-neutral-100 border-neutral-200 text-neutral-600",
};

export default function SeguimientoPage() {
  const { whatsappNumber, whatsappDefaultMessage } = useSiteConfigStore();
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !phone.trim()) return;
    setLoading(true);
    setResult(null);
    setNotFound(false);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: rpcError } = await supabase.rpc("lookup_order", {
        p_order_number: orderNumber.trim().toUpperCase(),
        p_phone: phone.trim(),
      });

      if (rpcError) throw rpcError;

      if (!data) {
        setNotFound(true);
      } else {
        setResult(data as TrackResult);
      }
    } catch (err) {
      setError((err as Error).message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <header className="bg-white border-b border-neutral-200 px-5 py-4 flex items-center gap-4">
        <Link
          href="/"
          className="p-2 rounded-xl hover:bg-neutral-100 transition text-neutral-500"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-base font-bold text-neutral-900">Seguimiento de pedido</h1>
          <p className="text-xs text-neutral-500">Macrocell</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-10 space-y-6">
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3B9DD8]/10 flex items-center justify-center">
              <Search size={18} className="text-[#3B9DD8]" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-900">Consultar pedido</p>
              <p className="text-xs text-neutral-500">Ingresa tu número de pedido y teléfono</p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="space-y-3">
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
              placeholder="Número de pedido (ej. ORD-00012)"
              required
              className="w-full px-3 py-3 rounded-xl border border-neutral-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Teléfono de contacto"
              required
              className="w-full px-3 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#3B9DD8] text-white font-semibold rounded-xl text-sm hover:bg-[#2A84BE] transition disabled:opacity-50"
            >
              {loading ? "Buscando…" : "Consultar pedido"}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
            Error al consultar: {error}
          </div>
        )}

        {notFound && (
          <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center">
            <Package size={32} className="text-neutral-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-neutral-700">Pedido no encontrado</p>
            <p className="text-xs text-neutral-500 mt-1">
              Verifica el número de pedido y el teléfono ingresados.
            </p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Status card */}
            <div className={`rounded-2xl border p-5 ${STATUS_COLOR[result.status] ?? "bg-white border-neutral-200"}`}>
              <div className="flex items-center gap-3 mb-2">
                {STATUS_ICON[result.status] ?? <Package size={20} />}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-0.5">
                    Estado del pedido
                  </p>
                  <p className="text-base font-bold">
                    {STATUS_LABEL[result.status] ?? result.status}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-80 mt-2">
                <span>
                  <span className="font-semibold">Pedido:</span> {result.order_number}
                </span>
                <span>
                  <span className="font-semibold">Fecha:</span>{" "}
                  {new Date(
                    result.created_at.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00")
                  ).toLocaleDateString("es-CO", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-neutral-100">
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Productos
                </p>
              </div>
              <ul className="divide-y divide-neutral-100">
                {result.items.map((it, i) => (
                  <li key={i} className="flex items-start gap-3 px-5 py-3">
                    {it.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.image_url}
                        alt={it.product_name}
                        className="w-12 h-12 object-cover rounded-lg border border-neutral-100 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg border border-neutral-100 bg-neutral-50 flex items-center justify-center shrink-0">
                        <Package size={16} className="text-neutral-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900">{it.product_name}</p>
                      {it.variant_label && (
                        <p className="text-xs text-neutral-500">{it.variant_label}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 text-xs">
                      <p className="font-semibold text-neutral-900">×{it.quantity}</p>
                      <p className="text-neutral-500">{formatPrice(it.unit_price_cop)}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-100 space-y-1 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(result.subtotal_cop)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Envío</span>
                  <span>{result.shipping_cop === 0 ? "Gratis" : formatPrice(result.shipping_cop)}</span>
                </div>
                <div className="flex justify-between font-bold text-neutral-900 text-sm pt-1 border-t border-neutral-200">
                  <span>Total</span>
                  <span>{formatPrice(result.total_cop)}</span>
                </div>
              </div>
            </div>

            {/* Delivery info */}
            {(result.shipping_city || result.shipping_department) && (
              <div className="bg-white rounded-2xl border border-neutral-200 px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                  Destino de envío
                </p>
                <p className="text-sm text-neutral-800">
                  {[result.shipping_city, result.shipping_department]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            )}

            <p className="text-center text-xs text-neutral-400 pb-4">
              ¿Tienes dudas?{" "}
              <a
                href={getWhatsappUrl(whatsappNumber, whatsappDefaultMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#3B9DD8] hover:underline"
              >
                Contáctanos por WhatsApp
              </a>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
