"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  User,
  CreditCard,
  MessageCircle,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { useCartStore } from "@/lib/store";
import { formatPrice } from "@/lib/products";
import { useSiteConfigStore, getWhatsappUrl } from "@/lib/site-config-store";
import { getCurrentProfile, type CustomerProfile } from "@/lib/customer-auth";
import { createOrder, markOrderWhatsappSent, validateStock } from "@/lib/orders";
import { track } from "@/lib/analytics";

type FormData = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  ciudad: string;
  departamento: string;
  direccion: string;
  notas: string;
};

// Ciudades por departamento. La opción "Otra ciudad" deja escribir una libre
// (con su propia validación de longitud mínima). Cobertura: capitales + ciudades
// con flujo logístico recurrente para Macrocell.
const CITIES_BY_DEPARTMENT: Record<string, string[]> = {
  Antioquia: [
    "Medellín",
    "Itagüí",
    "Envigado",
    "Bello",
    "Sabaneta",
    "La Estrella",
    "Caldas",
    "Copacabana",
    "Girardota",
    "Rionegro",
    "Apartadó",
    "Turbo",
  ],
  "Bogotá D.C.": ["Bogotá"],
  "Valle del Cauca": [
    "Cali",
    "Palmira",
    "Buenaventura",
    "Tuluá",
    "Cartago",
    "Buga",
    "Yumbo",
  ],
  Cundinamarca: [
    "Soacha",
    "Chía",
    "Zipaquirá",
    "Facatativá",
    "Mosquera",
    "Madrid",
    "Funza",
    "Cajicá",
    "Fusagasugá",
    "Girardot",
  ],
  Atlántico: ["Barranquilla", "Soledad", "Malambo", "Sabanalarga", "Puerto Colombia"],
  Bolívar: ["Cartagena", "Magangué", "Turbaco", "Arjona"],
  Santander: ["Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "Barrancabermeja"],
  Nariño: ["Pasto", "Tumaco", "Ipiales"],
  Córdoba: ["Montería", "Lorica", "Cereté", "Sahagún", "Planeta Rica"],
  "Norte de Santander": ["Cúcuta", "Villa del Rosario", "Los Patios", "Ocaña"],
  Risaralda: ["Pereira", "Dosquebradas", "Santa Rosa de Cabal"],
  Quindío: ["Armenia", "Calarcá", "La Tebaida"],
  Caldas: ["Manizales", "La Dorada", "Villamaría"],
  Tolima: ["Ibagué", "Espinal", "Honda"],
  Huila: ["Neiva", "Pitalito", "Garzón"],
  Cauca: ["Popayán", "Santander de Quilichao"],
  Magdalena: ["Santa Marta", "Ciénaga"],
  Meta: ["Villavicencio", "Acacías"],
  Boyacá: ["Tunja", "Duitama", "Sogamoso"],
  Otro: [],
};

const DEPARTAMENTOS = Object.keys(CITIES_BY_DEPARTMENT);
const CUSTOM_CITY_VALUE = "__custom__";

// Email RFC-lite (suficiente para checkout, no PII validation paranoica).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Valida una dirección de envío. Rechaza:
 *   - Cadenas muy cortas (<10 chars)
 *   - Cadenas sin ningún número (calle/carrera siempre lleva número)
 *   - Cadenas que parecen "asdfasdf" — sin vocales o con un solo char repetido
 *   - Cadenas con demasiados chars repetidos seguidos (>=4)
 */
function isPlausibleAddress(raw: string): boolean {
  const a = raw.trim();
  if (a.length < 10) return false;
  if (!/\d/.test(a)) return false; // alguna calle/carrera lleva número
  // No puede ser un solo char repetido
  const uniqueChars = new Set(a.toLowerCase().replace(/\s/g, "")).size;
  if (uniqueChars < 4) return false;
  // No 4 chars iguales seguidos (asdfasdfsssss…)
  if (/(.)\1{3,}/.test(a)) return false;
  // No bigramas repetidos pegados (asdfasdf, abcabc) — patrón de teclado random
  if (/([a-záéíóú]{3,})\1/i.test(a)) return false;
  // Necesita vocales (filtra strings random tipo "kjhgfd 123")
  if (!/[aeiouáéíóú]/i.test(a)) return false;
  // No puede tener una corrida de 6+ consonantes seguidas (sin vocales)
  if (/[bcdfghjklmnñpqrstvwxyz]{6,}/i.test(a)) return false;
  return true;
}

/** Normaliza un teléfono colombiano: deja solo dígitos y quita el +57 inicial. */
function normalizeCoPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("57") && digits.length === 12) return digits.slice(2);
  return digits;
}

/** Móvil colombiano: 10 dígitos empezando por 3. Acepta opcional +57. */
function isValidCoPhone(raw: string): boolean {
  const digits = normalizeCoPhone(raw);
  return /^3\d{9}$/.test(digits);
}

type FormErrors = Partial<Record<keyof FormData, string>>;

export default function CheckoutPage() {
  const {
    items: itemsRaw,
    total: totalFn,
    clearCart,
  } = useCartStore();
  // Hydration mismatch fix: el cart persiste en localStorage, así que en
  // SSR es vacío pero en cliente puede tener items. Hasta que monte,
  // renderizamos como vacío para que el HTML del server coincida.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  const items = mounted ? itemsRaw : [];
  const cartTotal = mounted ? totalFn() : 0;
  const whatsappNumber = useSiteConfigStore((s) => s.whatsappNumber);
  const [step, setStep] = useState<"form" | "confirm" | "done">("form");
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    ciudad: "",
    departamento: "Antioquia",
    direccion: "",
    notas: "",
  });

  // InitiateCheckout: dispara cuando se entra al checkout con items en el carrito
  const initiatedRef = useRef(false);
  useEffect(() => {
    if (initiatedRef.current) return;
    if (items.length === 0) return;
    initiatedRef.current = true;
    track("initiate_checkout", {
      value: cartTotal,
      contentIds: items.map((i) => i.product.id),
      items: items.map((i) => ({
        id: i.product.id,
        name: i.product.name,
        category: i.product.category,
        price: i.variant.price,
        quantity: i.quantity,
      })),
    });
  }, [items, cartTotal]);

  // Pre-rellenar datos si hay sesión
  useEffect(() => {
    let cancelled = false;
    getCurrentProfile().then((p) => {
      if (cancelled || !p) return;
       
      setProfile(p);
      const [first, ...rest] = (p.fullName || "").split(" ");
      setForm((prev) => ({
        ...prev,
        nombre: prev.nombre || first || "",
        apellido: prev.apellido || rest.join(" "),
        email: prev.email || p.email,
        telefono: prev.telefono || p.phone,
      }));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Limpia el error del campo mientras el usuario corrige.
    setErrors((prev) =>
      prev[name as keyof FormData] ? { ...prev, [name]: undefined } : prev
    );
  };

  /** Valida el formulario y devuelve el mapa de errores (vacío si todo OK). */
  const validateForm = (): FormErrors => {
    const e: FormErrors = {};
    if (!form.nombre.trim()) e.nombre = "Ingresa tu nombre.";
    if (!form.apellido.trim()) e.apellido = "Ingresa tu apellido.";

    if (!form.telefono.trim()) {
      e.telefono = "Ingresa tu teléfono.";
    } else if (!isValidCoPhone(form.telefono)) {
      e.telefono = "Debe ser un celular colombiano de 10 dígitos (ej. 300 000 0000).";
    }

    // Email es opcional, pero si lo escriben tiene que ser válido.
    if (form.email.trim() && !EMAIL_REGEX.test(form.email.trim())) {
      e.email = "El correo no parece válido.";
    }

    if (!form.ciudad.trim()) {
      e.ciudad = "Selecciona tu ciudad.";
    } else if (form.ciudad.trim().length < 3) {
      e.ciudad = "Nombre de ciudad demasiado corto.";
    }

    if (!form.direccion.trim()) {
      e.direccion = "Ingresa tu dirección de entrega.";
    } else if (!isPlausibleAddress(form.direccion)) {
      e.direccion =
        "Esa dirección no parece válida. Incluye calle/carrera, número y barrio (ej: Calle 10 # 43-20, Laureles).";
    }

    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateForm();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      // Lleva el foco al primer campo con error para no perder tiempo del usuario.
      const first = Object.keys(errs)[0];
      const el = document.querySelector<HTMLElement>(`[name="${first}"]`);
      el?.focus();
      return;
    }
    setStep("confirm");
  };

  /** Verifica stock y crea la orden en Supabase. Compartido por ambos métodos de pago. */
  const ensureOrder = async () => {
    const stockErrors = await validateStock(items);
    if (stockErrors.length > 0) {
      return {
        ok: false as const,
        error: `Algunos productos ya no tienen suficiente stock: ${stockErrors.join(" ")} Actualiza tu carrito e intenta de nuevo.`,
      };
    }
    return createOrder({
      userId: profile?.id ?? null,
      customerName: `${form.nombre} ${form.apellido}`.trim(),
      customerEmail: form.email || profile?.email,
      customerPhone: normalizeCoPhone(form.telefono),
      shippingDepartment: form.departamento,
      shippingCity: form.ciudad,
      shippingAddress: form.direccion,
      notes: form.notas,
      items,
    });
  };

  /** Confirmar y pagar online vía Wompi (Web Checkout redirect). */
  const handlePayWompi = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await ensureOrder();
      if (!created.ok) {
        setSubmitError(
          `No pudimos registrar tu pedido (${created.error}). Intenta de nuevo o usa la opción de WhatsApp.`
        );
        setSubmitting(false);
        return;
      }
      const res = await fetch("/api/wompi/checkout-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: created.order.id }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !json.url) {
        setSubmitError(
          `No pudimos iniciar el pago en línea (${
            json.error ?? `HTTP ${res.status}`
          }). Puedes coordinar por WhatsApp como alternativa.`
        );
        setSubmitting(false);
        return;
      }
      // No clearCart todavía — el carrito se vacía al regresar a /checkout/resultado.
      window.location.href = json.url;
    } catch (err) {
      setSubmitError(
        `Error inesperado al procesar el pago: ${
          (err as Error).message
        }. Revisa tu conexión e intenta de nuevo.`
      );
      setSubmitting(false);
    }
  };

  /** Coordinar pago por WhatsApp (efectivo, transferencia, Nequi…). */
  const handlePayWhatsapp = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    const created = await ensureOrder();
    if (!created.ok) {
      setSubmitError(
        `No pudimos guardar el pedido en la base de datos (${created.error}), pero te llevaremos a WhatsApp para coordinar igual.`
      );
    }

    const orderLines = items
      .map((item) => {
        const variantInfo = [
          item.variant.size,
          item.variant.ram ? `${item.variant.ram} RAM` : undefined,
          item.variant.storage,
          item.variant.notes,
        ]
          .filter(Boolean)
          .join(" · ");
        const suffix = variantInfo ? ` (${variantInfo})` : "";
        return `• ${item.product.name}${suffix} x${item.quantity} → ${formatPrice(
          item.variant.price * item.quantity
        )}`;
      })
      .join("\n");

    const orderRef = created.ok ? created.order.orderNumber : "";
    const msg = `🛒 *Nuevo pedido - Macrocell*${
      orderRef ? `\n*Pedido:* ${orderRef}` : ""
    }

*Cliente:* ${form.nombre} ${form.apellido}
*Teléfono:* ${form.telefono}
${form.email ? `*Email:* ${form.email}\n` : ""}*Ciudad:* ${form.ciudad}, ${form.departamento}
*Dirección:* ${form.direccion}
${form.notas ? `*Notas:* ${form.notas}\n` : ""}
*Productos:*
${orderLines}

*Total: ${formatPrice(cartTotal)}*

¡Gracias! 🙏`;

    window.open(getWhatsappUrl(whatsappNumber, msg), "_blank");

    if (created.ok) {
      setOrderNumber(created.order.orderNumber);
      void markOrderWhatsappSent(created.order.id);
    }

    clearCart();
    setSubmitting(false);
    setStep("done");
  };

  if (step === "done") {
    return (
      <div className="pt-24 min-h-screen bg-[#F5F5F7] flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white rounded-3xl p-12 max-w-md w-full text-center shadow-sm"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-3">
            ¡Pedido enviado!
          </h2>
          {orderNumber && (
            <div className="bg-neutral-50 rounded-xl px-4 py-3 mb-6 inline-block">
              <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold mb-0.5">
                Número de pedido
              </p>
              <p className="text-sm font-mono font-bold text-neutral-900">
                {orderNumber}
              </p>
            </div>
          )}
          <p className="text-neutral-500 mb-8 text-sm leading-relaxed">
            Tu pedido fue registrado y enviado por WhatsApp. Un asesor te
            contactará pronto para confirmar el pago y envío.
            {profile && (
              <>
                {" "}Puedes seguir su estado en{" "}
                <Link
                  href="/cuenta"
                  className="text-[#3B9DD8] font-semibold hover:underline"
                >
                  Mi cuenta
                </Link>
                .
              </>
            )}
          </p>
          <Link
            href={profile ? "/cuenta" : "/"}
            className="bg-[#3B9DD8] text-white px-8 py-3 rounded-full font-medium hover:bg-[#2A84BE] transition-colors inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9DD8] focus-visible:ring-offset-2"
          >
            {profile ? "Ver mis pedidos" : "Volver al inicio"}
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-[#F5F5F7] px-6 pb-24">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-neutral-500 mb-8">
          <Link
            href="/carrito"
            className="hover:text-neutral-900 transition-colors flex items-center gap-1"
          >
            <ArrowLeft size={14} /> Carrito
          </Link>
          <ChevronRight size={14} />
          <span
            className={step === "form" ? "text-neutral-900 font-medium" : ""}
          >
            Datos de envío
          </span>
          <ChevronRight size={14} />
          <span
            className={
              step === "confirm" ? "text-neutral-900 font-medium" : ""
            }
          >
            Confirmar pedido
          </span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-neutral-900 mb-4">
          {step === "form" ? "Datos de envío" : "Confirma tu pedido"}
        </h1>

        {!profile && step === "form" && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 mb-6 flex items-start gap-3">
            <User size={16} className="text-blue-600 mt-0.5 shrink-0" aria-hidden />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-blue-900">
                ¿Querés ver tu pedido luego?
              </p>
              <p className="text-blue-800 text-xs leading-relaxed mt-0.5">
                <Link
                  href="/cuenta"
                  className="underline font-semibold hover:text-blue-950"
                >
                  Inicia sesión o crea una cuenta
                </Link>{" "}
                para ver el historial de tus compras y agilizar el próximo
                checkout. También puedes seguir como invitado.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {step === "form" && (
                <motion.form
                  key="form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleSubmit}
                  className="bg-white rounded-3xl p-8 shadow-sm space-y-6"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      name="nombre"
                      label="Nombre *"
                      value={form.nombre}
                      onChange={handleChange}
                      placeholder="Juan"
                      error={errors.nombre}
                      required
                    />
                    <Field
                      name="apellido"
                      label="Apellido *"
                      value={form.apellido}
                      onChange={handleChange}
                      placeholder="Pérez"
                      error={errors.apellido}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      name="telefono"
                      label="WhatsApp / Teléfono *"
                      value={form.telefono}
                      onChange={handleChange}
                      placeholder="300 000 0000"
                      type="tel"
                      hint="Celular colombiano de 10 dígitos."
                      error={errors.telefono}
                      required
                    />
                    <Field
                      name="email"
                      label="Correo electrónico"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="correo@ejemplo.com"
                      type="email"
                      hint="Opcional — para enviarte el comprobante."
                      error={errors.email}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="departamento"
                        className="block text-sm font-medium text-neutral-700 mb-1.5"
                      >
                        Departamento *
                      </label>
                      <select
                        id="departamento"
                        name="departamento"
                        value={form.departamento}
                        onChange={(e) => {
                          // Al cambiar departamento, resetear ciudad para evitar
                          // que quede una ciudad de otro departamento.
                          setForm((prev) => ({
                            ...prev,
                            departamento: e.target.value,
                            ciudad: "",
                          }));
                          setErrors((prev) => ({ ...prev, ciudad: undefined }));
                        }}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#3B9DD8] focus:border-transparent transition-all bg-white"
                      >
                        {DEPARTAMENTOS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <CitySelect
                      department={form.departamento}
                      value={form.ciudad}
                      onChange={(val) => {
                        setForm((prev) => ({ ...prev, ciudad: val }));
                        setErrors((prev) => ({ ...prev, ciudad: undefined }));
                      }}
                      error={errors.ciudad}
                    />
                  </div>

                  <Field
                    name="direccion"
                    label="Dirección de entrega *"
                    value={form.direccion}
                    onChange={handleChange}
                    placeholder="Calle 10 # 43-20, Apto 501"
                    error={errors.direccion}
                    required
                  />

                  <div>
                    <label
                      htmlFor="notas"
                      className="block text-sm font-medium text-neutral-700 mb-1.5"
                    >
                      Notas adicionales
                    </label>
                    <textarea
                      id="notas"
                      name="notas"
                      value={form.notas}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Instrucciones especiales para la entrega..."
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#3B9DD8] focus:border-transparent transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#3B9DD8] text-white py-4 rounded-2xl font-semibold text-base hover:bg-[#2A84BE] active:scale-98 transition-all"
                  >
                    Continuar al resumen
                  </button>
                </motion.form>
              )}

              {step === "confirm" && (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="bg-white rounded-3xl p-8 shadow-sm">
                    <h3 className="text-lg font-semibold text-neutral-900 mb-5">
                      Datos de envío
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        {
                          label: "Nombre",
                          value: `${form.nombre} ${form.apellido}`,
                        },
                        { label: "Teléfono", value: form.telefono },
                        { label: "Ciudad", value: `${form.ciudad}, ${form.departamento}` },
                        { label: "Dirección", value: form.direccion },
                        ...(form.email
                          ? [{ label: "Email", value: form.email }]
                          : []),
                        ...(form.notas
                          ? [{ label: "Notas", value: form.notas }]
                          : []),
                      ].map((row) => (
                        <div key={row.label}>
                          <p className="text-neutral-500">{row.label}</p>
                          <p className="font-medium text-neutral-900">
                            {row.value}
                          </p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setSubmitError(null);
                        setStep("form");
                      }}
                      className="mt-5 text-sm text-[#3B9DD8] hover:underline"
                    >
                      Editar datos
                    </button>
                  </div>

                  <div className="bg-white rounded-3xl p-6 shadow-sm">
                    <h3 className="text-base font-bold text-neutral-900 mb-1">
                      Elige cómo pagar
                    </h3>
                    <p className="text-xs text-neutral-500 mb-5">
                      Total a pagar:{" "}
                      <strong className="text-neutral-900 text-sm">
                        {formatPrice(cartTotal)}
                      </strong>
                    </p>

                    {submitError && (
                      <div
                        role="alert"
                        className="mb-4 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-xs leading-relaxed"
                      >
                        <AlertTriangle
                          size={14}
                          className="shrink-0 mt-0.5"
                          aria-hidden
                        />
                        <p>{submitError}</p>
                      </div>
                    )}

                    {/* Pagar online con Wompi */}
                    <button
                      onClick={handlePayWompi}
                      disabled={submitting}
                      className="w-full text-left bg-[#0C1014] hover:bg-black text-white p-5 rounded-2xl transition-all active:scale-[0.99] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9DD8] focus-visible:ring-offset-2 mb-3"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                          <CreditCard size={18} aria-hidden />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm flex items-center gap-2">
                            Pagar con tarjeta o PSE
                            <span className="text-[9px] uppercase tracking-wider bg-[#3B9DD8] text-white px-1.5 py-0.5 rounded-full">
                              Recomendado
                            </span>
                          </p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            Visa · Mastercard · PSE · Nequi · Bancolombia QR
                          </p>
                        </div>
                        <ChevronRight
                          size={16}
                          className="text-neutral-500 shrink-0"
                          aria-hidden
                        />
                      </div>
                      <p className="text-[11px] text-neutral-400 flex items-center gap-1.5 pt-2 border-t border-white/10">
                        <Lock size={11} aria-hidden /> Pago seguro vía Wompi
                      </p>
                    </button>

                    {/* Coordinar por WhatsApp */}
                    <button
                      onClick={handlePayWhatsapp}
                      disabled={submitting}
                      className="w-full text-left bg-white border border-neutral-200 hover:border-[#25D366] text-neutral-900 p-5 rounded-2xl transition-all active:scale-[0.99] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center text-[#25D366]">
                          <MessageCircle size={18} aria-hidden />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm">
                            Coordinar por WhatsApp
                          </p>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            Pago contraentrega · efectivo · transferencia
                          </p>
                        </div>
                        <ChevronRight
                          size={16}
                          className="text-neutral-300 shrink-0"
                          aria-hidden
                        />
                      </div>
                    </button>

                    {submitting && (
                      <p className="text-xs text-neutral-400 mt-4 text-center animate-pulse">
                        Procesando…
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Order summary sidebar */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-3xl p-6 shadow-sm sticky top-24"
            >
              <h2 className="text-base font-semibold text-neutral-900 mb-5">
                Tu pedido ({items.length})
              </h2>
              <div className="space-y-4 mb-5">
                {items.map((item) => {
                  const variantInfo = [
                    item.variant.size,
                    item.variant.ram ? `${item.variant.ram} RAM` : undefined,
                    item.variant.storage,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <div key={item.variant.sku} className="flex gap-3 items-center">
                      <div className="w-14 h-14 bg-neutral-50 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden p-2">
                        <Image
                          src={item.product.image}
                          alt={item.product.name}
                          width={56}
                          height={56}
                          className="object-contain w-full h-full"
                          unoptimized
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate">
                          {item.product.name}
                        </p>
                        {variantInfo && (
                          <p className="text-xs text-neutral-500">{variantInfo}</p>
                        )}
                        {item.variant.notes && (
                          <p className="text-xs text-neutral-400">
                            {item.variant.notes}
                          </p>
                        )}
                        <p className="text-sm font-semibold text-neutral-900">
                          {formatPrice(item.variant.price)} ×{item.quantity}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-neutral-100 pt-4">
                <div className="flex justify-between font-bold text-neutral-900">
                  <span>Total estimado</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  El valor puede ajustarse según disponibilidad
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------- subcomponentes ----------------------- */

type FieldProps = {
  name: keyof FormData;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
  error?: string;
  required?: boolean;
};

/**
 * Input controlado con label, hint y mensaje de error inline.
 * Borde rojo y aria-invalid cuando hay error — accesible para lectores de pantalla.
 */
function Field({
  name,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
  error,
  required,
}: FieldProps) {
  const id = `field-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-neutral-700 mb-1.5"
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        type={type}
        required={required}
        aria-invalid={!!error}
        aria-describedby={
          [errorId, hintId].filter(Boolean).join(" ") || undefined
        }
        className={`w-full px-4 py-3 rounded-xl border text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
          error
            ? "border-red-300 focus:ring-red-400 bg-red-50/40"
            : "border-neutral-200 focus:ring-[#3B9DD8]"
        }`}
      />
      {error ? (
        <p id={errorId} className="text-[11px] text-red-600 mt-1.5 leading-snug">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[11px] text-neutral-400 mt-1.5">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Selector de ciudad. Muestra un dropdown con las ciudades del departamento
 * elegido + opción "Otra ciudad" que despliega un input libre. Para "Bogotá D.C."
 * solo hay Bogotá, así que se autoselecciona y se oculta el dropdown.
 */
function CitySelect({
  department,
  value,
  onChange,
  error,
}: {
  department: string;
  value: string;
  onChange: (val: string) => void;
  error?: string;
}) {
  const cities = CITIES_BY_DEPARTMENT[department] ?? [];
  const isCustomDept = department === "Otro" || cities.length === 0;
  const isInList = cities.includes(value);
  // El select muestra: ciudad si está en la lista, "__custom__" si el usuario
  // está escribiendo una libre, o "" si todavía no eligió.
  const selectValue = isInList ? value : value || isCustomDept ? CUSTOM_CITY_VALUE : "";
  const showCustomInput = isCustomDept || selectValue === CUSTOM_CITY_VALUE;
  const id = "field-ciudad";
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-neutral-700 mb-1.5"
      >
        Ciudad / Municipio *
      </label>
      {!isCustomDept && (
        <select
          id={id}
          name="ciudad"
          value={selectValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === CUSTOM_CITY_VALUE) {
              onChange(""); // limpiamos para que el input custom arranque vacío
            } else {
              onChange(v);
            }
          }}
          aria-invalid={!!error}
          aria-describedby={errorId}
          className={`w-full px-4 py-3 rounded-xl border text-neutral-900 focus:outline-none focus:ring-2 focus:border-transparent transition-all bg-white ${
            error
              ? "border-red-300 focus:ring-red-400 bg-red-50/40"
              : "border-neutral-200 focus:ring-[#3B9DD8]"
          }`}
        >
          <option value="">Selecciona una ciudad…</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value={CUSTOM_CITY_VALUE}>Otra ciudad…</option>
        </select>
      )}
      {showCustomInput && (
        <input
          id={isCustomDept ? id : `${id}-custom`}
          name={isCustomDept ? "ciudad" : "ciudad-custom"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Escribe el nombre de tu municipio"
          autoFocus={!isCustomDept}
          aria-invalid={!!error}
          aria-describedby={errorId}
          className={`w-full px-4 py-3 rounded-xl border text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
            !isCustomDept ? "mt-2" : ""
          } ${
            error
              ? "border-red-300 focus:ring-red-400 bg-red-50/40"
              : "border-neutral-200 focus:ring-[#3B9DD8]"
          }`}
        />
      )}
      {error && (
        <p id={errorId} className="text-[11px] text-red-600 mt-1.5 leading-snug">
          {error}
        </p>
      )}
    </div>
  );
}
