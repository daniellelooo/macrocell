"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { useCartStore } from "@/lib/store";
import { track } from "@/lib/analytics";
import { formatPrice } from "@/lib/products";
import {
  PAYMENT_STATUS_COLOR,
  PAYMENT_STATUS_LABEL,
  type InternalPaymentStatus,
} from "@/lib/wompi";
import { useSiteConfigStore, getWhatsappUrl } from "@/lib/site-config-store";

type State =
  | { kind: "loading" }
  | {
      kind: "ok";
      status: InternalPaymentStatus;
      transactionId: string;
      method: string;
      amountCop: number;
    }
  | { kind: "no-tx" }
  | { kind: "error"; message: string };

export default function ResultadoPage() {
  const params = useParams<{ orderNumber: string }>();
  const search = useSearchParams();
  const wompiId = search.get("id");
  const orderNumber = params.orderNumber;
  const [state, setState] = useState<State>({ kind: "loading" });
  const clearCart = useCartStore((s) => s.clearCart);
  const cartItems = useCartStore((s) => s.items);
  const whatsappNumber = useSiteConfigStore((s) => s.whatsappNumber);
  const purchaseTrackedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    if (!wompiId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ kind: "no-tx" });
      return;
    }
    fetch(`/api/wompi/transaction/${encodeURIComponent(wompiId)}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.transaction) {
          setState({ kind: "error", message: json.error ?? "Error" });
          return;
        }
        const amountCop = Math.round(json.transaction.amount_in_cents / 100);
        setState({
          kind: "ok",
          status: json.transaction.internalStatus as InternalPaymentStatus,
          transactionId: json.transaction.id,
          method: json.transaction.payment_method_type,
          amountCop,
        });
        if (
          json.transaction.internalStatus === "approved" &&
          !purchaseTrackedRef.current
        ) {
          purchaseTrackedRef.current = true;
          // Snapshot del carrito ANTES de limpiarlo (para items en el evento)
          const snapshot = cartItems;
          track("purchase", {
            value: amountCop,
            orderId: orderNumber,
            contentIds: snapshot.map((i) => i.product.id),
            items: snapshot.map((i) => ({
              id: i.product.id,
              name: i.product.name,
              category: i.product.category,
              price: i.variant.price,
              quantity: i.quantity,
            })),
          });
          clearCart();
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ kind: "error", message: (err as Error).message });
      });
    return () => {
      cancelled = true;
    };
    // cartItems intencionalmente fuera de deps: queremos snapshotearlo en el momento del fetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wompiId, clearCart, orderNumber]);

  const isApproved = state.kind === "ok" && state.status === "approved";
  const isPending = state.kind === "ok" && state.status === "pending";
  const isDeclined =
    state.kind === "ok" &&
    (state.status === "declined" ||
      state.status === "voided" ||
      state.status === "error");

  return (
    <div className="pt-24 min-h-screen bg-[#F5F5F7] flex items-center justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full text-center shadow-sm"
      >
        {state.kind === "loading" && (
          <>
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-5 animate-pulse">
              <Clock size={28} className="text-neutral-400" aria-hidden />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 mb-2">
              Verificando tu pago…
            </h1>
            <p className="text-sm text-neutral-500">
              Esto suele tomar unos segundos.
            </p>
          </>
        )}

        {state.kind === "no-tx" && (
          <>
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertCircle size={28} className="text-amber-600" aria-hidden />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 mb-2">
              No vemos un pago asociado
            </h1>
            <p className="text-sm text-neutral-500 mb-6 leading-relaxed">
              No recibimos confirmación de Wompi para el pedido{" "}
              <span className="font-mono font-bold">{orderNumber}</span>. Si
              acabas de pagar, la confirmación puede tardar unos minutos.
            </p>
          </>
        )}

        {state.kind === "error" && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <XCircle size={28} className="text-[#3B9DD8]" aria-hidden />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 mb-2">
              No pudimos verificar tu pago
            </h1>
            <p className="text-xs text-neutral-400 mb-6 font-mono">
              {state.message}
            </p>
          </>
        )}

        {isApproved && state.kind === "ok" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 220 }}
              className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle2 size={40} className="text-green-500" aria-hidden />
            </motion.div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">
              ¡Pago aprobado!
            </h1>
            <p className="text-sm text-neutral-500 mb-6 leading-relaxed">
              Recibimos tu pago. En las próximas horas un asesor coordina
              contigo el envío y te confirma por WhatsApp.
            </p>
            <ResultPanel
              orderNumber={orderNumber}
              transactionId={state.transactionId}
              method={state.method}
              amountCop={state.amountCop}
              status={state.status}
            />
          </>
        )}

        {isPending && state.kind === "ok" && (
          <>
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Clock size={28} className="text-amber-600" aria-hidden />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 mb-2">
              Pago pendiente de confirmación
            </h1>
            <p className="text-sm text-neutral-500 mb-6 leading-relaxed">
              Algunos métodos (PSE, Bancolombia) pueden tardar minutos en
              confirmarse. Te enviaremos un mensaje cuando se acredite.
            </p>
            <ResultPanel
              orderNumber={orderNumber}
              transactionId={state.transactionId}
              method={state.method}
              amountCop={state.amountCop}
              status={state.status}
            />
          </>
        )}

        {isDeclined && state.kind === "ok" && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <XCircle size={28} className="text-[#3B9DD8]" aria-hidden />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 mb-2">
              Pago no completado
            </h1>
            <p className="text-sm text-neutral-500 mb-6 leading-relaxed">
              Wompi reportó que la transacción fue {state.status}. Tu pedido
              quedó registrado pero sin pago — puedes reintentar o coordinar
              por WhatsApp.
            </p>
            <ResultPanel
              orderNumber={orderNumber}
              transactionId={state.transactionId}
              method={state.method}
              amountCop={state.amountCop}
              status={state.status}
            />
          </>
        )}

        {/* CTAs comunes (cuenta + tienda + WhatsApp) */}
        <div className="flex flex-col sm:flex-row gap-2 mt-6">
          <Link
            href="/cuenta"
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#3B9DD8] hover:bg-[#2A84BE] text-white px-5 py-3 rounded-full text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9DD8] focus-visible:ring-offset-2"
          >
            Ver mis pedidos <ArrowRight size={13} aria-hidden />
          </Link>
          <Link
            href="/catalogo"
            className="flex-1 inline-flex items-center justify-center bg-white border border-neutral-200 hover:border-neutral-400 text-neutral-700 px-5 py-3 rounded-full text-sm font-semibold transition"
          >
            Seguir comprando
          </Link>
        </div>

        {(isDeclined || state.kind === "no-tx" || state.kind === "error") && (
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <Link
              href={`/checkout`}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-neutral-900 text-white px-5 py-3 rounded-full text-sm font-semibold hover:bg-black transition"
            >
              <RotateCcw size={13} aria-hidden /> Reintentar pago
            </Link>
            <a
              href={getWhatsappUrl(
                whatsappNumber,
                `Hola, tengo un problema con el pago del pedido ${orderNumber}.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center bg-[#25D366] hover:bg-[#1ebe5d] text-white px-5 py-3 rounded-full text-sm font-semibold transition"
            >
              Contactar por WhatsApp
            </a>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function ResultPanel({
  orderNumber,
  transactionId,
  method,
  amountCop,
  status,
}: {
  orderNumber: string;
  transactionId: string;
  method: string;
  amountCop: number;
  status: InternalPaymentStatus;
}) {
  return (
    <dl className="bg-neutral-50 rounded-2xl p-4 text-left text-sm space-y-2.5 mb-2">
      <Row label="Pedido" value={orderNumber} mono />
      <Row label="Transacción" value={transactionId} mono />
      <Row label="Método" value={method} />
      <Row label="Monto" value={formatPrice(amountCop)} bold />
      <div className="flex items-center justify-between gap-3">
        <dt className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold">
          Estado
        </dt>
        <dd>
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              PAYMENT_STATUS_COLOR[status] ?? ""
            }`}
          >
            {PAYMENT_STATUS_LABEL[status] ?? status}
          </span>
        </dd>
      </div>
    </dl>
  );
}

function Row({
  label,
  value,
  mono,
  bold,
}: {
  label: string;
  value: string;
  mono?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold shrink-0">
        {label}
      </dt>
      <dd
        className={`text-sm text-neutral-900 truncate ${
          mono ? "font-mono text-xs" : ""
        } ${bold ? "font-bold" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
