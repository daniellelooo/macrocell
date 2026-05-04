"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle, MessageCircle } from "lucide-react";
import { useSiteConfigStore, getWhatsappUrl } from "@/lib/site-config-store";

type FaqItem = {
  q: string;
  a: React.ReactNode;
};

type FaqCategory = {
  id: string;
  title: string;
  items: FaqItem[];
};

const FAQS: FaqCategory[] = [
  {
    id: "garantia",
    title: "Garantía y postventa",
    items: [
      {
        q: "¿Qué garantía tienen los productos?",
        a: (
          <>
            Los iPhone, iPad, Apple Watch y MacBook nuevos vienen con{" "}
            <strong>1 año de garantía oficial Apple</strong>. Los equipos de
            exhibición tienen{" "}
            <strong>3.5 meses de garantía Macrocell</strong>. Los AS-IS y open
            box pueden tener garantía limitada — siempre se aclara en la ficha
            del producto.
          </>
        ),
      },
      {
        q: "¿Qué pasa si el equipo llega con un problema?",
        a: (
          <>
            Tenés <strong>5 días hábiles</strong> de derecho de retracto según
            la Ley 1480 (Estatuto del Consumidor). Si el equipo presenta un
            defecto de fábrica, lo cambiamos por uno nuevo o te devolvemos el
            dinero. Para activar la garantía, llevalo a cualquiera de nuestras
            sedes con la factura.
          </>
        ),
      },
      {
        q: "¿Tienen servicio técnico propio?",
        a: "Sí, manejamos servicio técnico de garantía en sede. Para fallas fuera de garantía te conectamos con un Apple Authorized Service Provider en Medellín.",
      },
    ],
  },
  {
    id: "envios",
    title: "Envíos y entregas",
    items: [
      {
        q: "¿Hacen envíos a toda Colombia?",
        a: (
          <>
            Sí, enviamos a <strong>todo el país sin costo adicional</strong> en
            compras de contado. Usamos Servientrega, Coordinadora o
            Interrapidísimo según la ciudad. El tiempo estimado es de 1–3 días
            hábiles para capitales y 3–5 para municipios.
          </>
        ),
      },
      {
        q: "¿Puedo recoger mi pedido en sede?",
        a: "Sí, podés recogerlo en cualquiera de nuestras 4 sedes (C.C. Monterrey, Itagüí o Pasaje Roberesco). Lo confirmamos por WhatsApp el mismo día.",
      },
      {
        q: "¿Cuánto tarda en llegar?",
        a: "Para Medellín y área metropolitana: 24 horas. Resto del país: 1–3 días hábiles después de confirmar el pago.",
      },
    ],
  },
  {
    id: "pagos",
    title: "Pagos y financiación",
    items: [
      {
        q: "¿Qué métodos de pago aceptan?",
        a: "Aceptamos efectivo, transferencias (Bancolombia, Davivienda, BBVA), Nequi, Daviplata, PSE y tarjetas de crédito (Visa, Mastercard). Los detalles de la cuenta los compartimos al confirmar el pedido por WhatsApp.",
      },
      {
        q: "¿Tienen crédito?",
        a: (
          <>
            Sí, manejamos crédito directo con{" "}
            <strong>Banco de Bogotá</strong>. Aprobación rápida, sin fiador, con
            cuotas flexibles. Te ayudamos con todo el trámite desde la sede o
            por WhatsApp.
          </>
        ),
      },
      {
        q: "¿Hay descuento por pago en efectivo?",
        a: "Las compras de contado incluyen vidrio templado y estuche protector sin costo adicional, además de 1 año de membresía para cambio de vidrio.",
      },
      {
        q: "¿Se puede pagar a cuotas con tarjeta?",
        a: "Sí, tu banco define las cuotas y tasas. Nosotros recibimos el pago completo y vos lo difieres con tu emisor.",
      },
    ],
  },
  {
    id: "productos",
    title: "Productos y stock",
    items: [
      {
        q: "¿Los iPhone son originales?",
        a: (
          <>
            Sí, todos nuestros equipos son <strong>100% originales Apple</strong>.
            Cada uno se entrega con su número de serie/IMEI verificable
            directamente en{" "}
            <a
              href="https://checkcoverage.apple.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#3B9DD8] underline"
            >
              checkcoverage.apple.com
            </a>
            .
          </>
        ),
      },
      {
        q: "¿Cuál es la diferencia entre 'Nuevo' y 'Exhibición'?",
        a: (
          <>
            <strong>Nuevo:</strong> equipo sellado de fábrica, 1 año de garantía
            Apple oficial.
            <br />
            <strong>Exhibición:</strong> equipo que estuvo en muestra dentro de
            la tienda, sin uso real. Estado impecable a precio menor, con 3.5
            meses de garantía Macrocell.
          </>
        ),
      },
      {
        q: "¿Qué significa 'AS-IS' u 'Open Box'?",
        a: (
          <>
            <strong>Open Box:</strong> caja abierta pero el equipo no fue usado;
            puede haber sido devuelto. Mantiene la garantía Apple restante.
            <br />
            <strong>AS-IS:</strong> equipo vendido tal cual, sin garantía. Suele
            ser una unidad con detalle estético menor o configuración específica
            (por ejemplo SIM física en una región sin esa SKU oficial).
          </>
        ),
      },
      {
        q: "¿Reciben mi iPhone usado en parte de pago?",
        a: "Por ahora no manejamos plan canje formal. Si querés, contanos qué tenés y vemos caso a caso por WhatsApp.",
      },
    ],
  },
  {
    id: "tienda",
    title: "Sobre Macrocell",
    items: [
      {
        q: "¿Dónde están ubicados?",
        a: (
          <>
            Tenemos 4 sedes:
            <ul className="list-disc list-inside mt-2 space-y-0.5 text-sm">
              <li>C.C. Monterrey, El Poblado — Local 206</li>
              <li>C.C. Monterrey, El Poblado — Locales 098 / 099</li>
              <li>Super Centro de la Moda, Itagüí — Local 118</li>
              <li>Pasaje Roberesco, Centro de Medellín — Local 105</li>
            </ul>
          </>
        ),
      },
      {
        q: "¿Cuál es el horario de atención?",
        a: "Lunes a sábado de 10:00 am a 7:30 pm. Domingos y festivos de 11:00 am a 5:00 pm. Por WhatsApp respondemos todos los días.",
      },
      {
        q: "¿Son distribuidor oficial Apple?",
        a: "Somos un reseller independiente especializado en productos Apple. Todos los equipos son originales, con factura y garantía respaldada.",
      },
    ],
  },
];

export default function FAQsPage() {
  const whatsappNumber = useSiteConfigStore((s) => s.whatsappNumber);
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) =>
    setOpenId((curr) => (curr === id ? null : id));

  return (
    <>
      <section className="pt-28 pb-10 px-5 md:px-12 bg-white">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="inline-flex items-center gap-2 bg-[#3B9DD8]/10 text-[#3B9DD8] text-xs font-semibold px-3 py-1 rounded-full mb-4">
              <HelpCircle size={12} aria-hidden /> Centro de ayuda
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-neutral-900 mb-3">
              Preguntas frecuentes
            </h1>
            <p className="text-sm md:text-lg text-neutral-500 leading-relaxed">
              Lo que más nos preguntan sobre garantías, envíos, pagos y
              productos. ¿No encontraste lo que buscabas? Escríbenos por
              WhatsApp y te respondemos al toque.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-10 px-5 md:px-12 bg-[#F5F5F7] min-h-[60vh]">
        <div className="max-w-3xl mx-auto space-y-8">
          {FAQS.map((cat, ci) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: ci * 0.05 }}
            >
              <h2
                id={`faq-${cat.id}`}
                className="text-lg md:text-xl font-bold text-neutral-900 mb-3"
              >
                {cat.title}
              </h2>
              <div className="bg-white rounded-2xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden">
                {cat.items.map((item, i) => {
                  const id = `${cat.id}-${i}`;
                  const open = openId === id;
                  return (
                    <div key={id}>
                      <button
                        onClick={() => toggle(id)}
                        aria-expanded={open}
                        aria-controls={`${id}-panel`}
                        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-neutral-50 transition focus:outline-none focus-visible:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3B9DD8]"
                      >
                        <span className="text-sm md:text-base font-semibold text-neutral-900 flex-1">
                          {item.q}
                        </span>
                        <ChevronDown
                          size={16}
                          className={`text-neutral-400 shrink-0 transition-transform duration-200 ${
                            open ? "rotate-180" : ""
                          }`}
                          aria-hidden
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div
                            id={`${id}-panel`}
                            key="panel"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{
                              duration: 0.25,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-4 -mt-1 text-sm text-neutral-600 leading-relaxed">
                              {item.a}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}

          {/* CTA final */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="bg-[#0C1014] text-white rounded-2xl p-6 md:p-8 mt-10"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-base md:text-lg font-bold mb-1">
                  ¿No encontraste lo que buscabas?
                </p>
                <p className="text-sm text-neutral-400">
                  Escríbenos y te respondemos en menos de 5 minutos.
                </p>
              </div>
              <a
                href={getWhatsappUrl(whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white px-6 py-3 rounded-full text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C1014] shrink-0"
              >
                <MessageCircle size={14} aria-hidden /> Hablar por WhatsApp
              </a>
            </div>
          </motion.div>

          <p className="text-center pt-4">
            <Link
              href="/catalogo"
              className="text-sm text-[#3B9DD8] hover:text-[#2A84BE] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9DD8] rounded px-1"
            >
              ← Volver al catálogo
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
