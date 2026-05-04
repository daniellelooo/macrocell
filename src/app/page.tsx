"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  BadgeDollarSign,
  HeadphonesIcon,
  MapPin,
  ArrowRight,
  Star,
  CreditCard,
  Gift,
  BadgeCheck,
} from "lucide-react";
import ProductCard from "@/components/ProductCard";
import AnimatedSection from "@/components/AnimatedSection";
import CategoryShowcase from "@/components/CategoryShowcase";
import { formatPrice } from "@/lib/products";
import { useCatalogStore } from "@/lib/catalog-store";
import { useSiteConfigStore, getWhatsappUrl } from "@/lib/site-config-store";

// Las imágenes del carrusel ahora vienen de site-config (admin → Configuración).

function MobileCarousel({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0);
  const list = images.length > 0 ? images : [""];

  useEffect(() => {
    if (list.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % list.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [list.length]);

  return (
    <div className="w-full">
      <div className="relative w-full aspect-[16/9] overflow-hidden bg-[#F5F5F7]">
        <AnimatePresence initial={false}>
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {list[current] && (
              <Image
                src={list[current]}
                alt={`Macrocell ${current + 1}`}
                fill
                className="object-contain"
                priority={current === 0}
                unoptimized
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex gap-1.5 justify-center pt-2.5">
        {list.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`rounded-full transition-all duration-500 ${
              i === current ? "w-5 h-1.5 bg-[#3B9DD8]" : "w-1.5 h-1.5 bg-neutral-300"
            }`}
            aria-label={`Imagen ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function HeroCarousel({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0);
  const list = images.length > 0 ? images : [""];

  useEffect(() => {
    if (list.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % list.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [list.length]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl lg:rounded-3xl aspect-[4/5] max-w-[360px] lg:max-w-[420px] xl:max-w-[460px] mx-auto bg-[#F5F5F7]">
      <AnimatePresence initial={false}>
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          {list[current] && (
            <Image
              src={list[current]}
              alt={`Macrocell ${current + 1}`}
              fill
              className="object-contain"
              priority={current === 0}
              unoptimized
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {list.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`rounded-full transition-all duration-500 ${
              i === current
                ? "w-5 h-1.5 bg-white"
                : "w-1.5 h-1.5 bg-white/40"
            }`}
            aria-label={`Imagen ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const products = useCatalogStore((s) => s.products);
  const featuredProducts = products.filter((p) => p.isFeatured).slice(0, 4);
  const sedes = useSiteConfigStore((s) => s.sedes);
  const hoursWeek = useSiteConfigStore((s) => s.hoursWeek);
  const hoursWeekend = useSiteConfigStore((s) => s.hoursWeekend);
  const whatsappNumber = useSiteConfigStore((s) => s.whatsappNumber);
  const whatsappMsg = useSiteConfigStore((s) => s.whatsappDefaultMessage);
  const instagramUrl = useSiteConfigStore((s) => s.instagramUrl);
  const heroImagesDesktop = useSiteConfigStore((s) => s.heroImagesDesktop);
  const heroImagesMobile = useSiteConfigStore((s) => s.heroImagesMobile);
  const WA_URL = getWhatsappUrl(whatsappNumber, whatsappMsg);

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="bg-white flex items-center pt-24 pb-10 md:pt-28 md:pb-16 lg:pt-32 lg:pb-20 min-h-screen md:min-h-[calc(100svh-2rem)]">
        <div className="max-w-7xl mx-auto w-full">
          {/* Mobile: image on top, text below. Desktop: side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-12 xl:gap-16 items-center">

            {/* Mobile: carrusel horizontal */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="order-1 lg:hidden"
            >
              <MobileCarousel images={heroImagesMobile} />
            </motion.div>

            {/* Desktop: carrusel */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="order-1 lg:order-2 hidden lg:block lg:pr-12"
            >
              <HeroCarousel images={heroImagesDesktop} />
            </motion.div>

            {/* Text — order-2 on mobile (bottom), order-1 on desktop (left) */}
            <div className="order-2 lg:order-1 px-5 md:px-12 pt-7 pb-4 lg:py-0">
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="text-[2.6rem] leading-[1.08] md:text-6xl lg:text-7xl font-bold tracking-tight text-neutral-900 mb-4"
              >
                Los precios
                <br />
                más bajos
                <br />
                <span className="text-[#3B9DD8]">en iPhone.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="text-sm md:text-lg text-neutral-500 mb-6 max-w-md leading-relaxed"
              >
                Sin intermediarios. Garantía oficial Apple. Crédito con Banco de Bogotá.
                Desde{" "}
                <strong className="text-neutral-800 font-semibold">
                  {formatPrice(1420000)}
                </strong>
                .
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col sm:flex-row gap-3 mb-8"
              >
                <Link
                  href="/catalogo"
                  className="bg-[#3B9DD8] text-white px-7 py-4 rounded-full font-semibold text-sm hover:bg-[#2A84BE] transition-colors active:scale-95 text-center"
                >
                  Ver catálogo y precios
                </Link>
                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-neutral-800 px-7 py-4 rounded-full font-semibold text-sm border border-neutral-200 hover:bg-neutral-50 transition-all active:scale-95 text-center"
                >
                  Contáctanos por WhatsApp
                </a>
              </motion.div>

              {/* Stats — 4 cols on all sizes */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.38 }}
                className="grid grid-cols-4 gap-3 pt-6 border-t border-neutral-100"
              >
                {[
                  { value: "+200K", label: "Seguidores" },
                  { value: "4", label: "Sedes" },
                  { value: "1 año", label: "Garantía" },
                  { value: "Gratis", label: "Envío" },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-base md:text-lg font-bold text-neutral-900">{s.value}</p>
                    <p className="text-[10px] md:text-xs text-neutral-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPRA POR LÍNEA ──────────────────────────────────────── */}
      <CategoryShowcase />

      {/* ── PRECIOS DESTACADOS ────────────────────────────────────── */}
      <section className="py-14 md:py-24 bg-[#F5F5F7]">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="mb-7 px-5 md:px-12">
            <h2 className="text-2xl md:text-5xl font-bold tracking-tight text-neutral-900 mb-2">
              Precios que no encontrarás en otro lado
            </h2>
            <p className="text-neutral-500 text-sm md:text-base">
              Sin intermediarios. Directo al mejor precio de Medellín.
            </p>
          </AnimatedSection>

          {/* Mobile: horizontal scroll. Desktop: grid */}
          <div className="flex gap-4 overflow-x-auto no-scrollbar px-5 md:px-12 pb-2 md:grid md:grid-cols-3 md:overflow-visible">
            {[
              {
                name: "iPhone 14",
                desc: "Exhibición 128 GB · 3.5 meses garantía",
                price: 1400000,
                badge: "Mega descuento",
                image: "/IPHONE14.jpeg",
              },
              {
                name: "iPad A16",
                desc: "Chip A16 · Pantalla 10.9\" · 128 GB",
                price: 1420000,
                badge: "El más accesible",
                image: "/IPADA16.png",
              },
              {
                name: "iPhone 16",
                desc: "Nuevo 128 GB · 1 año garantía Apple",
                price: 2950000,
                badge: "Nuevo",
                image: "/IPHONE16.jpeg",
              },
            ].map((item, i) => (
              <Link
                key={item.name}
                href="/catalogo"
                className="bg-white rounded-2xl border border-neutral-200 flex flex-col hover:border-neutral-300 hover:shadow-md transition-all overflow-hidden shrink-0 w-[72vw] sm:w-[55vw] md:w-auto active:scale-[0.98]"
              >
                <div className="relative w-full h-44 md:h-52 bg-[#F5F5F7]">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-contain p-5"
                  />
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <span className="inline-block bg-neutral-100 text-neutral-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider mb-3 self-start">
                    {item.badge}
                  </span>
                  <h3 className="text-base font-bold text-neutral-900 mb-0.5">{item.name}</h3>
                  <p className="text-xs text-neutral-400 mb-4">{item.desc}</p>
                  <p className="text-2xl font-bold text-neutral-900 mt-auto">
                    {formatPrice(item.price)}
                  </p>
                  <span className="mt-3 flex items-center gap-1 text-sm text-[#3B9DD8] font-semibold">
                    Ver en catálogo <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCTOS DESTACADOS ──────────────────────────────────── */}
      <section className="py-14 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="flex items-end justify-between mb-7 px-5 md:px-12">
            <div>
              <h2 className="text-2xl md:text-5xl font-bold tracking-tight text-neutral-900 mb-1">
                Los más buscados
              </h2>
              <p className="text-neutral-500 text-sm">Equipos con garantía oficial Apple</p>
            </div>
            <Link
              href="/catalogo"
              className="flex items-center gap-1 text-xs md:text-sm font-semibold text-[#3B9DD8] shrink-0 ml-4"
            >
              Ver todos <ArrowRight size={13} />
            </Link>
          </AnimatedSection>

          <div className="px-5 md:px-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
            {featuredProducts.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── POR QUÉ PROPHONE ─────────────────────────────────────── */}
      <section className="py-14 md:py-24 bg-[#F5F5F7]">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="mb-8 px-5 md:px-12">
            <h2 className="text-2xl md:text-5xl font-bold tracking-tight text-neutral-900 mb-2">
              ¿Por qué Macrocell?
            </h2>
            <p className="text-neutral-500 text-sm">Tu tienda de smartphones de confianza</p>
          </AnimatedSection>

          {/* Mobile: horizontal scroll cards. Desktop: 3-col grid */}
          <div className="flex gap-4 overflow-x-auto no-scrollbar px-5 md:px-12 pb-2 md:grid md:grid-cols-3 md:overflow-visible">
            {[
              {
                icon: <ShieldCheck size={22} className="text-[#3B9DD8]" />,
                title: "Garantía Oficial",
                description: "Todos nuestros equipos tienen garantía Apple de 1 año. Compra con total seguridad.",
              },
              {
                icon: <BadgeDollarSign size={22} className="text-[#3B9DD8]" />,
                title: "Los Mejores Precios",
                description: "Sin intermediarios. Traemos lo mejor de Apple a los precios más bajos de Medellín.",
              },
              {
                icon: <HeadphonesIcon size={22} className="text-[#3B9DD8]" />,
                title: "Asesoría Personalizada",
                description: "Te ayudamos a elegir el equipo ideal. Respondemos rápido por WhatsApp.",
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className="bg-white rounded-2xl p-5 border border-neutral-200 shrink-0 w-[72vw] sm:w-[55vw] md:w-auto"
              >
                <div className="mb-3">{feature.icon}</div>
                <h3 className="text-sm font-bold text-neutral-900 mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-sm text-neutral-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TU COMPRA INCLUYE ─────────────────────────────────────── */}
      <section className="py-14 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-5 md:px-12">
          <AnimatedSection className="mb-7">
            <h2 className="text-2xl md:text-5xl font-bold tracking-tight text-neutral-900 mb-2">
              Tu compra incluye mucho más
            </h2>
            <p className="text-neutral-500 text-sm">Solo en compras de contado</p>
          </AnimatedSection>

          {/* 3 cols on all sizes — compact cards */}
          <div className="grid grid-cols-3 gap-3 md:gap-5">
            {[
              {
                icon: <Gift size={20} className="text-[#3B9DD8]" />,
                title: "Vidrio Protector",
                desc: "Membresía 1 año para cambio de vidrio.",
              },
              {
                icon: <ShieldCheck size={20} className="text-[#3B9DD8]" />,
                title: "Estuche",
                desc: "Estuche protector sin costo adicional.",
              },
              {
                icon: <BadgeCheck size={20} className="text-[#3B9DD8]" />,
                title: "Garantía 1 Año",
                desc: "Respaldo oficial Apple + soporte nuestro.",
              },
            ].map((item, i) => (
              <AnimatedSection
                key={item.title}
                delay={i * 0.08}
                className="bg-[#F5F5F7] rounded-2xl p-4 md:p-6 border border-neutral-100 flex flex-col"
              >
                <div className="mb-3">{item.icon}</div>
                <h3 className="text-xs md:text-sm font-bold text-neutral-900 mb-1">
                  {item.title}
                </h3>
                <p className="text-[11px] md:text-sm text-neutral-500 leading-snug">
                  {item.desc}
                </p>
              </AnimatedSection>
            ))}
          </div>

          <p className="text-xs text-neutral-400 mt-4">
            * Aplica para compras en efectivo. Pregunta por condiciones.
          </p>
        </div>
      </section>

      {/* ── CRÉDITO BANCO DE BOGOTÁ ───────────────────────────────── */}
      <section className="py-14 md:py-24 bg-[#F5F5F7]">
        <div className="max-w-5xl mx-auto px-5 md:px-12">
          <div className="bg-[#0C1014] rounded-3xl p-7 md:p-14 flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-10">
            <div className="flex-1 w-full">
              <div className="flex items-center gap-3 mb-5">
                <CreditCard size={18} className="text-[#3B9DD8]" />
                <span className="text-neutral-400 text-xs font-medium">
                  Crédito disponible
                </span>
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 leading-snug">
                ¿No tienes todo el efectivo?
                <br />
                <span className="text-[#3B9DD8]">Te financiamos.</span>
              </h2>

              <div className="flex items-center gap-3 mb-4">
                <div className="relative w-24 h-9 rounded-lg overflow-hidden bg-white/10">
                  <Image
                    src="/banco-de-bogota-logo-png_seeklogo-16005-removebg-preview.png"
                    alt="Banco de Bogotá"
                    fill
                    className="object-contain p-1.5"
                  />
                </div>
                <span className="text-neutral-400 text-xs">Alianza oficial</span>
              </div>

              <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                Adquiere tu iPhone a crédito con{" "}
                <strong className="text-white">Banco de Bogotá</strong>. Cuotas
                accesibles, sin trámites complicados.
              </p>

              {/* Benefits visible on mobile too */}
              <div className="grid grid-cols-2 gap-2 mb-6 md:hidden">
                {["Aprobación rápida", "Cuotas flexibles", "Sin fiador", "Entrega inmediata"].map((b) => (
                  <div key={b} className="flex items-center gap-2 border border-white/10 rounded-xl px-3 py-2">
                    <span className="w-1.5 h-1.5 bg-[#3B9DD8] rounded-full shrink-0" />
                    <span className="text-white text-xs">{b}</span>
                  </div>
                ))}
              </div>

              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#3B9DD8] text-white px-6 py-3.5 rounded-full text-sm font-semibold hover:bg-[#2A84BE] active:scale-95 transition-all w-full md:w-auto justify-center md:justify-start"
              >
                Solicitar crédito por WhatsApp
              </a>
            </div>

            {/* Desktop benefits column */}
            <div className="hidden md:flex flex-col gap-3 min-w-[200px]">
              {["Aprobación rápida", "Cuotas flexibles", "Sin fiador", "Entrega inmediata"].map((benefit) => (
                <div
                  key={benefit}
                  className="flex items-center gap-3 border border-white/10 rounded-xl px-4 py-2.5"
                >
                  <span className="w-1.5 h-1.5 bg-[#3B9DD8] rounded-full shrink-0" />
                  <span className="text-white text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIOS ──────────────────────────────────────────── */}
      <section className="py-14 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="mb-7 px-5 md:px-12">
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-neutral-900 mb-1">
              Lo que dicen nuestros clientes
            </h2>
            <p className="text-neutral-500 text-sm">
              Miles de personas satisfechas en toda Antioquia
            </p>
          </AnimatedSection>

          {/* Mobile: horizontal scroll. Desktop: grid */}
          <div className="flex gap-4 overflow-x-auto no-scrollbar px-5 md:px-12 pb-2 md:grid md:grid-cols-3 md:overflow-visible">
            {[
              {
                name: "Valentina G.",
                text: "Compré mi iPhone 16 Pro y el precio fue el mejor que encontré en Medellín. Me regalaron el vidrio y el estuche, ¡increíble!",
                rating: 5,
              },
              {
                name: "Sebastián M.",
                text: "Ya llevo 3 años comprando en Macrocell. Siempre garantía real y precios que no consigo en otro lado. 100% recomendados.",
                rating: 5,
              },
              {
                name: "Camila R.",
                text: "Muy fácil el crédito con Banco de Bogotá. En media hora ya tenía mi iPhone 15. Servicio rapidísimo.",
                rating: 5,
              },
            ].map((review, i) => (
              <div
                key={review.name}
                className="bg-[#F5F5F7] rounded-2xl p-5 border border-neutral-100 shrink-0 w-[78vw] sm:w-[55vw] md:w-auto"
              >
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: review.rating }).map((_, j) => (
                    <Star key={j} size={13} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-neutral-700 mb-4 leading-relaxed text-sm">
                  &ldquo;{review.text}&rdquo;
                </p>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  {review.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEDES ────────────────────────────────────────────────── */}
      <section id="sedes" className="py-14 md:py-24 bg-[#F5F5F7]">
        <div className="max-w-7xl mx-auto px-5 md:px-12">
          <AnimatedSection className="mb-7">
            <h2 className="text-2xl md:text-5xl font-bold tracking-tight text-neutral-900 mb-1">
              Nuestras {sedes.length} Sedes
            </h2>
            <p className="text-neutral-500 text-sm">
              Visítanos y llévate tu equipo hoy mismo · Medellín e Itagüí
            </p>
          </AnimatedSection>

          {/* 2-col on mobile, 4-col on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {sedes.map((sede, i) => (
              <AnimatedSection
                key={sede.id}
                delay={i * 0.08}
                className="bg-white rounded-2xl p-4 md:p-6 border border-neutral-200 flex flex-col"
              >
                <MapPin size={16} className="text-[#3B9DD8] mb-3" />
                <h3 className="text-xs md:text-sm font-bold text-neutral-900 mb-0.5">
                  {sede.name}
                </h3>
                <p className="text-[11px] md:text-xs text-neutral-500 mb-0.5">{sede.area}</p>
                <p className="text-[11px] md:text-xs text-neutral-400">{sede.detail}</p>
              </AnimatedSection>
            ))}
          </div>

          <p className="text-xs text-neutral-400 mt-5">
            {hoursWeek} · {hoursWeekend}
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────── */}
      <section className="py-20 md:py-32 px-5 bg-[#0C1014] text-white text-center">
        <AnimatedSection className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 leading-snug">
            ¿Listo para tu nuevo iPhone?
          </h2>
          <p className="text-neutral-400 text-sm md:text-base mb-8 max-w-sm md:max-w-lg mx-auto leading-relaxed">
            Más de <strong className="text-white">200K seguidores</strong> confían
            en Macrocell. Los mejores precios en Colombia.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#3B9DD8] text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-[#2A84BE] active:scale-95 transition-all"
            >
              Hablar por WhatsApp
            </a>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/20 text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-white/5 active:scale-95 transition-all"
            >
              Ver Instagram
            </a>
          </div>
        </AnimatedSection>
      </section>
    </>
  );
}
