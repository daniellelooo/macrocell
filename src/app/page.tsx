"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  BadgeDollarSign,
  HeadphonesIcon,
  MapPin,
  ArrowRight,
  Star,
  Gift,
  BadgeCheck,
} from "lucide-react";
import ProductCard from "@/components/ProductCard";
import AnimatedSection from "@/components/AnimatedSection";
import CategoryShowcase from "@/components/CategoryShowcase";
import { formatPrice } from "@/lib/products";
import { useCatalogStore } from "@/lib/catalog-store";
import { useSiteConfigStore, getWhatsappUrl } from "@/lib/site-config-store";

export default function HomePage() {
  const products = useCatalogStore((s) => s.products);
  const featuredProducts = products.filter((p) => p.isFeatured).slice(0, 4);
  const sedes = useSiteConfigStore((s) => s.sedes);
  const hoursWeek = useSiteConfigStore((s) => s.hoursWeek);
  const hoursWeekend = useSiteConfigStore((s) => s.hoursWeekend);
  const whatsappNumber = useSiteConfigStore((s) => s.whatsappNumber);
  const whatsappMsg = useSiteConfigStore((s) => s.whatsappDefaultMessage);
  const instagramUrl = useSiteConfigStore((s) => s.instagramUrl);
  const WA_URL = getWhatsappUrl(whatsappNumber, whatsappMsg);

  const heroStats = [
    { value: "154K", label: "Seguidores" },
    { value: "4", label: "Sedes" },
    { value: "1 año", label: "Garantía" },
    { value: "Gratis", label: "Envío" },
  ];

  const words = ["El", "mejor", "precio"];

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative min-h-[100svh] flex flex-col justify-center bg-white overflow-hidden">

        {/* Background ambient glow */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-[#3B9DD8]/[0.07] blur-[130px]" />
          <div className="absolute bottom-0 -left-20 w-[500px] h-[500px] rounded-full bg-[#3B9DD8]/[0.05] blur-[100px]" />
        </div>

        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.35]"
          aria-hidden
          style={{
            backgroundImage: "radial-gradient(circle, #d4d4d4 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative max-w-7xl mx-auto w-full px-6 md:px-12 pt-32 pb-20 md:pt-40 md:pb-28">


          {/* Main headline — word-by-word stagger */}
          <h1 className="mb-3 leading-[0.88] tracking-tight font-black text-neutral-900"
            style={{ fontSize: "clamp(3.6rem, 11vw, 9.5rem)" }}>
            {words.map((word, i) => (
              <motion.span
                key={word}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.1 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="inline-block mr-[0.22em]"
              >
                {word}
              </motion.span>
            ))}
            <br />
            <motion.span
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.46, ease: [0.16, 1, 0.3, 1] }}
              className="inline-block text-[#3B9DD8]"
            >
              en iPhone.
            </motion.span>
          </h1>

          {/* Animated underline accent */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{ originX: 0 }}
            className="h-[3px] w-40 md:w-64 bg-[#3B9DD8] rounded-full mb-8 mt-5"
          />

          {/* Description + CTAs row */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 lg:gap-16">

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-md"
            >
              <p className="text-neutral-500 text-base md:text-lg leading-relaxed mb-7">
                Sin intermediarios. Garantía oficial Apple. Envío gratis a toda Colombia. Desde{" "}
                <strong className="text-neutral-800 font-semibold">{formatPrice(1420000)}</strong>.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/catalogo"
                  className="inline-flex items-center justify-center gap-2 bg-[#3B9DD8] text-white px-7 py-4 rounded-full font-bold text-sm hover:bg-[#2A84BE] active:scale-95 transition-all duration-200 shadow-lg shadow-[#3B9DD8]/25"
                >
                  Ver catálogo y precios
                  <ArrowRight size={14} />
                </Link>
                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center bg-white text-neutral-800 px-7 py-4 rounded-full font-semibold text-sm border border-neutral-200 hover:bg-neutral-50 active:scale-95 transition-all duration-200"
                >
                  WhatsApp
                </a>
              </div>
            </motion.div>

            {/* Stats — vertical on desktop right side */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.72 }}
              className="grid grid-cols-4 lg:grid-cols-2 gap-x-10 gap-y-5 lg:gap-x-14 lg:gap-y-6 shrink-0"
            >
              {heroStats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.78 + i * 0.07 }}
                >
                  <p className="text-2xl md:text-3xl font-black text-neutral-900 leading-none">{s.value}</p>
                  <p className="text-[11px] text-neutral-400 mt-1 uppercase tracking-wider font-medium">{s.label}</p>
                </motion.div>
              ))}
            </motion.div>
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

      {/* ── POR QUÉ MACROCELL — editorial numerado ───────────────── */}
      <section className="py-20 md:py-32 bg-white">
        <div className="max-w-6xl mx-auto px-5 md:px-12">
          <AnimatedSection className="mb-14 md:mb-20 max-w-2xl">
            <span className="text-[#3B9DD8] text-[11px] font-bold tracking-[0.25em] uppercase mb-4 block">
              Por qué Macrocell
            </span>
            <h2 className="text-3xl md:text-6xl font-bold tracking-tight text-neutral-900 leading-[1.05]">
              Tres razones por las que más de <span className="text-[#3B9DD8]">154K</span> personas confían en nosotros.
            </h2>
          </AnimatedSection>

          <div className="space-y-0">
            {[
              {
                title: "Garantía oficial Apple",
                description:
                  "Todos los equipos nuevos vienen con un año de garantía Apple oficial. Los de exhibición, con 3.5 meses de garantía Macrocell. Sin letra pequeña, sin sorpresas.",
                icon: <ShieldCheck size={20} className="text-[#3B9DD8]" />,
              },
              {
                title: "Los mejores precios de Medellín",
                description:
                  "Sin intermediarios. Compramos directo y trasladamos el ahorro. Por eso encontrás un iPhone 14 desde $1.400.000 — precios imposibles en otro lado.",
                icon: <BadgeDollarSign size={20} className="text-[#3B9DD8]" />,
              },
              {
                title: "Asesoría humana, sin presión",
                description:
                  "Atendemos por WhatsApp todos los días. Te ayudamos a elegir el equipo ideal según tu uso y presupuesto. Si no te conviene, te lo decimos.",
                icon: <HeadphonesIcon size={20} className="text-[#3B9DD8]" />,
              },
            ].map((feature, i) => (
              <AnimatedSection
                key={feature.title}
                delay={i * 0.08}
                className="grid grid-cols-12 gap-4 md:gap-8 items-start py-10 md:py-14 border-t border-neutral-200 last:border-b last:border-neutral-200"
              >
                {/* Number */}
                <div className="col-span-2 md:col-span-2">
                  <span
                    className="font-black text-neutral-200 leading-none tabular-nums select-none"
                    style={{ fontSize: "clamp(2.6rem, 8vw, 6.5rem)" }}
                  >
                    0{i + 1}
                  </span>
                </div>
                {/* Title */}
                <div className="col-span-10 md:col-span-5 pt-3 md:pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    {feature.icon}
                    <span className="text-[10px] text-[#3B9DD8] font-bold uppercase tracking-wider">
                      Macrocell · {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-4xl font-bold tracking-tight text-neutral-900 leading-[1.1]">
                    {feature.title}
                  </h3>
                </div>
                {/* Description */}
                <div className="col-span-12 md:col-span-5 pt-1 md:pt-7">
                  <p className="text-neutral-500 text-base md:text-lg leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── TU COMPRA INCLUYE — sección oscura ────────────────────── */}
      <section className="relative py-20 md:py-32 bg-[#0C1014] text-white overflow-hidden">
        {/* ambient blue glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#3B9DD8]/10 rounded-full blur-[120px] pointer-events-none" aria-hidden />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#3B9DD8]/5 rounded-full blur-[100px] pointer-events-none" aria-hidden />

        <div className="relative max-w-7xl mx-auto px-5 md:px-12 grid md:grid-cols-12 gap-10 md:gap-16 items-start">
          <AnimatedSection className="md:col-span-5">
            <span className="text-[#3B9DD8] text-[11px] font-bold tracking-[0.25em] uppercase mb-4 block">
              Compras de contado
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.05] mb-5">
              Cada compra incluye más de lo que pagás.
            </h2>
            <p className="text-neutral-400 text-base leading-relaxed max-w-md">
              Te llevás tu equipo listo para usar. Sin gastos ocultos. Tres extras incluidos sin costo cuando pagás de contado.
            </p>
          </AnimatedSection>

          <div className="md:col-span-7 space-y-0">
            {[
              {
                icon: <Gift size={18} className="text-[#3B9DD8]" />,
                title: "Vidrio templado",
                desc: "+ Membresía 1 año para cambio de vidrio gratuito.",
              },
              {
                icon: <ShieldCheck size={18} className="text-[#3B9DD8]" />,
                title: "Estuche protector",
                desc: "Original, ajustado al modelo. Sin costo adicional.",
              },
              {
                icon: <BadgeCheck size={18} className="text-[#3B9DD8]" />,
                title: "Garantía oficial Apple",
                desc: "1 año respaldado por Apple + soporte directo nuestro.",
              },
            ].map((item, i) => (
              <AnimatedSection
                key={item.title}
                delay={i * 0.08}
                className="grid grid-cols-12 gap-4 py-6 md:py-7 border-t border-white/10 last:border-b last:border-white/10 items-center"
              >
                <span className="col-span-2 md:col-span-1 text-[#3B9DD8]/70 text-2xl md:text-3xl font-black tabular-nums">
                  0{i + 1}
                </span>
                <div className="col-span-10 md:col-span-11 flex flex-col md:flex-row md:items-center gap-1 md:gap-6">
                  <div className="flex items-center gap-3 md:min-w-[260px]">
                    {item.icon}
                    <h3 className="text-base md:text-lg font-bold">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-neutral-400 text-sm leading-relaxed flex-1">
                    {item.desc}
                  </p>
                </div>
              </AnimatedSection>
            ))}
            <p className="text-[11px] text-neutral-600 mt-5 italic">
              * Aplica para compras en efectivo. Pregunta por condiciones.
            </p>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIOS — magazine style ────────────────────────── */}
      <section className="py-20 md:py-32 bg-white">
        <div className="max-w-6xl mx-auto px-5 md:px-12">
          <AnimatedSection className="mb-12 md:mb-16">
            <span className="text-[#3B9DD8] text-[11px] font-bold tracking-[0.25em] uppercase mb-4 block">
              Lo que dicen
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-neutral-900 leading-[1.05] max-w-2xl">
              Las historias detrás de las compras.
            </h2>
          </AnimatedSection>

          {/* Featured quote */}
          <AnimatedSection className="mb-14 md:mb-20 max-w-4xl">
            <span
              className="text-[#3B9DD8] font-serif leading-none block -mb-8 md:-mb-14 select-none"
              style={{ fontSize: "clamp(8rem, 18vw, 14rem)" }}
              aria-hidden
            >
              &ldquo;
            </span>
            <p className="text-2xl md:text-4xl lg:text-5xl font-light leading-[1.2] tracking-tight text-neutral-900">
              Compré mi iPhone 16 Pro y el precio fue el mejor que encontré en Medellín. Me regalaron el vidrio y el estuche — atención impecable.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3B9DD8] to-[#2A84BE] flex items-center justify-center text-white font-bold text-sm">
                V
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-900">Valentina G.</p>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Cliente verificada · Medellín</p>
              </div>
            </div>
          </AnimatedSection>

          {/* Secondary testimonials */}
          <div className="grid md:grid-cols-2 gap-6 md:gap-10 pt-12 md:pt-16 border-t border-neutral-200">
            {[
              {
                name: "Sebastián M.",
                initial: "S",
                location: "Itagüí",
                text: "Ya llevo 3 años comprando en Macrocell. Siempre garantía real y precios que no consigo en otro lado. 100% recomendados.",
              },
              {
                name: "Camila R.",
                initial: "C",
                location: "El Poblado",
                text: "Muy buena la atención. En media hora ya tenía mi iPhone 15 listo. Servicio rapidísimo y todo original.",
              },
            ].map((review, i) => (
              <AnimatedSection
                key={review.name}
                delay={i * 0.1}
                className="flex flex-col"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} size={13} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-neutral-700 text-base md:text-lg leading-relaxed mb-6 flex-1">
                  &ldquo;{review.text}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-neutral-100">
                  <div className="w-9 h-9 rounded-full bg-neutral-900 flex items-center justify-center text-white font-bold text-xs">
                    {review.initial}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-900">{review.name}</p>
                    <p className="text-[11px] text-neutral-500 uppercase tracking-wider">{review.location}</p>
                  </div>
                </div>
              </AnimatedSection>
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
            Más de <strong className="text-white">154K seguidores</strong> confían
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
