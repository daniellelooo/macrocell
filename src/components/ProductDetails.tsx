"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ShieldCheck,
  Truck,
  ListChecks,
  CreditCard,
  HelpCircle,
} from "lucide-react";
import {
  conditionLabels,
  conditionWarranty,
  type Product,
  type Variant,
} from "@/lib/products";
import { useSiteConfigStore, getWhatsappUrl } from "@/lib/site-config-store";

type Props = {
  product: Product;
  variant?: Variant;
};

/**
 * Acordeón de detalles de la ficha de producto: especificaciones,
 * envío, garantía, métodos de pago, preguntas frecuentes.
 *
 * El primer panel ("Características destacadas") arranca abierto si el
 * producto tiene features cargados; el resto se abren a clic.
 */
export default function ProductDetails({ product, variant }: Props) {
  const whatsappNumber = useSiteConfigStore((s) => s.whatsappNumber);
  const initialOpen = product.features.length > 0 ? "specs" : null;
  const [openId, setOpenId] = useState<string | null>(initialOpen);

  const toggle = (id: string) =>
    setOpenId((curr) => (curr === id ? null : id));

  // Specs derivadas: combina features cargadas + datos de la variante.
  const variantRows: { label: string; value: string }[] = [];
  if (variant) {
    if (variant.size)
      variantRows.push({ label: "Pantalla", value: variant.size });
    if (variant.storage)
      variantRows.push({ label: "Almacenamiento", value: variant.storage });
    if (variant.ram) variantRows.push({ label: "Memoria RAM", value: variant.ram });
    if (variant.color) variantRows.push({ label: "Color", value: variant.color });
    variantRows.push({
      label: "Condición",
      value: conditionLabels[variant.condition],
    });
    if (variant.notes) variantRows.push({ label: "Notas", value: variant.notes });
    variantRows.push({ label: "SKU", value: variant.sku });
  }

  const sections: AccordionSection[] = [
    {
      id: "specs",
      title: "Especificaciones técnicas",
      icon: ListChecks,
      content: (
        <div className="space-y-4">
          {product.features.length > 0 && (
            <ul className="space-y-2.5">
              {product.features.map((f, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-sm text-neutral-700"
                >
                  <span className="w-1 h-1 rounded-full bg-neutral-400 mt-2 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}
          {variantRows.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3 border-t border-neutral-100">
              {variantRows.map((row) => (
                <div key={row.label}>
                  <dt className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">
                    {row.label}
                  </dt>
                  <dd className="text-sm text-neutral-800 font-medium font-mono">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {product.features.length === 0 && variantRows.length === 0 && (
            <p className="text-sm text-neutral-400 italic">
              Sin especificaciones cargadas todavía.
            </p>
          )}
        </div>
      ),
    },
    {
      id: "envio",
      title: "Envío y entrega",
      icon: Truck,
      content: (
        <div className="space-y-3 text-sm text-neutral-700">
          <p>
            <strong className="text-neutral-900">Envío gratis</strong> a toda
            Colombia en compras de contado. Operamos con Servientrega,
            Coordinadora e Interrapidísimo según la ciudad de destino.
          </p>
          <ul className="space-y-2 mt-2">
            {[
              {
                area: "Medellín y área metropolitana",
                eta: "24 horas hábiles",
              },
              {
                area: "Bogotá, Cali, Barranquilla, Bucaramanga",
                eta: "1–2 días hábiles",
              },
              { area: "Capitales y ciudades intermedias", eta: "2–3 días hábiles" },
              { area: "Municipios y zonas rurales", eta: "3–5 días hábiles" },
            ].map((row) => (
              <li
                key={row.area}
                className="flex items-center justify-between gap-3 text-sm border-b border-neutral-100 pb-1.5 last:border-0"
              >
                <span className="text-neutral-700">{row.area}</span>
                <span className="text-neutral-900 font-semibold whitespace-nowrap">
                  {row.eta}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-neutral-500 pt-2">
            También puedes recoger en cualquiera de nuestras 4 sedes en Medellín
            e Itagüí — disponible el mismo día tras confirmar.
          </p>
        </div>
      ),
    },
    {
      id: "garantia",
      title: "Garantía y devoluciones",
      icon: ShieldCheck,
      content: (
        <div className="space-y-3 text-sm text-neutral-700">
          {variant && (
            <p className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-green-800">
              <strong>Esta variante:</strong>{" "}
              {conditionWarranty[variant.condition]}.
            </p>
          )}
          <p>
            Tienes <strong className="text-neutral-900">5 días hábiles</strong>{" "}
            de derecho de retracto según la Ley 1480 (Estatuto del Consumidor de
            Colombia).
          </p>
          <p>
            Si el equipo presenta un defecto de fábrica dentro del plazo de
            garantía, lo cambiamos por uno nuevo o te devolvemos el dinero. Para
            activar la garantía, llévalo a cualquiera de nuestras sedes con la
            factura.
          </p>
          <ul className="text-xs text-neutral-500 space-y-1 pt-2 border-t border-neutral-100 mt-3">
            <li>• Equipos nuevos: 1 año oficial Apple.</li>
            <li>• Equipos en exhibición: 3.5 meses Macrocell.</li>
            <li>• Open box: garantía Apple restante.</li>
            <li>• AS-IS: sin garantía oficial.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "pago",
      title: "Métodos de pago y financiación",
      icon: CreditCard,
      content: (
        <div className="space-y-3 text-sm text-neutral-700">
          <p>
            Aceptamos efectivo, transferencias (Bancolombia, Davivienda, BBVA),
            Nequi, Daviplata, PSE y tarjetas de crédito (Visa, Mastercard).
          </p>
          <p>
            Manejamos crédito directo con{" "}
            <strong className="text-neutral-900">Banco de Bogotá</strong>:
            aprobación rápida, sin fiador, cuotas flexibles. Los detalles los
            confirmamos por WhatsApp.
          </p>
          <p className="text-xs text-neutral-500 pt-2 border-t border-neutral-100 mt-2">
            Las compras en efectivo incluyen vidrio templado y estuche
            protector sin costo, además de 1 año de membresía para cambio de
            vidrio.
          </p>
        </div>
      ),
    },
    {
      id: "ayuda",
      title: "¿Tienes dudas sobre este producto?",
      icon: HelpCircle,
      content: (
        <div className="space-y-3 text-sm text-neutral-700">
          <p>
            Escríbenos por WhatsApp y un asesor te responde en menos de 5
            minutos. Te ayudamos a elegir el almacenamiento, color y condición
            que mejor se ajuste.
          </p>
          <a
            href={getWhatsappUrl(
              whatsappNumber,
              `Hola, tengo una duda sobre el ${product.name}.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white px-4 py-2.5 rounded-full text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
          >
            Hablar por WhatsApp
          </a>
        </div>
      ),
    },
  ];

  return (
    <section
      aria-label="Detalles del producto"
      className="border-t border-neutral-100 mt-2"
    >
      {sections.map((section) => {
        const open = openId === section.id;
        const Icon = section.icon;
        return (
          <div
            key={section.id}
            className="border-b border-neutral-100 last:border-0"
          >
            <button
              onClick={() => toggle(section.id)}
              aria-expanded={open}
              aria-controls={`${section.id}-panel`}
              className="w-full flex items-center justify-between gap-4 py-4 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] rounded"
            >
              <span className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                    open ? "bg-[#0071E3] text-white" : "bg-neutral-100 text-neutral-500"
                  }`}
                  aria-hidden
                >
                  <Icon size={16} />
                </span>
                <span className="text-base font-semibold text-neutral-900 group-hover:text-[#0071E3] transition-colors">
                  {section.title}
                </span>
              </span>
              <ChevronDown
                size={18}
                className={`text-neutral-400 shrink-0 transition-transform duration-200 ${
                  open ? "rotate-180" : ""
                }`}
                aria-hidden
              />
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  id={`${section.id}-panel`}
                  key="panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pl-12 pr-2 pb-5">{section.content}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </section>
  );
}

type AccordionSection = {
  id: string;
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  content: React.ReactNode;
};
