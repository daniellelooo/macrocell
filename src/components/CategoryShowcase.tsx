"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useCatalogStore } from "@/lib/catalog-store";
import {
  formatPrice,
  getMinPrice,
  type ProductCategory,
} from "@/lib/products";

type CategoryDef = {
  id: ProductCategory;
  label: string;
  /** Sublabel corto debajo del nombre. */
  tag: string;
};

const CATEGORIES: CategoryDef[] = [
  { id: "iphone", label: "iPhone", tag: "Nuevos y exhibición" },
  { id: "ipad", label: "iPad", tag: "Estudio y trabajo" },
  { id: "watch", label: "Apple Watch", tag: "Salud y deporte" },
  { id: "macbook", label: "MacBook", tag: "Pro y Air" },
  { id: "accesorios", label: "Accesorios", tag: "Cargadores · audio" },
];

export default function CategoryShowcase() {
  const products = useCatalogStore((s) => s.products);

  const cards = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const inCat = products.filter((p) => p.category === cat.id);
      // Foto: primero un destacado, si no, el primero a secas.
      const cover =
        inCat.find((p) => p.isFeatured) ?? inCat.find((p) => p.isNew) ?? inCat[0];
      const minPrice = inCat.reduce<number>((acc, p) => {
        const m = getMinPrice(p);
        return m > 0 && (acc === 0 || m < acc) ? m : acc;
      }, 0);
      return {
        ...cat,
        image: cover?.image ?? null,
        productName: cover?.name ?? null,
        count: inCat.length,
        minPrice,
      };
    });
  }, [products]);

  return (
    <section
      aria-labelledby="category-showcase-heading"
      className="py-14 md:py-20 bg-white border-y border-neutral-100"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-end justify-between gap-4 mb-8 md:mb-12"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#3B9DD8] mb-2">
              Compra por línea
            </p>
            <h2
              id="category-showcase-heading"
              className="text-3xl md:text-5xl font-bold tracking-tight text-neutral-900 leading-[1.05]"
            >
              El ecosistema Apple,
              <br className="hidden md:inline" />
              <span className="text-neutral-400 md:text-neutral-500"> a precio reseller.</span>
            </h2>
          </div>
          <Link
            href="/catalogo"
            className="hidden sm:inline-flex items-center gap-1 text-xs md:text-sm font-semibold text-neutral-600 hover:text-[#3B9DD8] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9DD8] rounded px-1 shrink-0"
          >
            Ver todo el catálogo
            <ArrowUpRight size={13} aria-hidden />
          </Link>
        </motion.div>

        {/* Desktop: grid asimétrico tipo Apple — iPhone destacado grande + 4 tiles. Mobile: scroll horizontal. */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:grid-rows-2 md:gap-4 md:overflow-visible snap-x snap-mandatory">
          {cards.map((card, i) => {
            if (card.count === 0) return null;
            const isFeatured = card.id === "iphone";
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.45,
                  delay: i * 0.06,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={
                  isFeatured
                    ? "shrink-0 w-[78vw] sm:w-[55vw] md:w-auto snap-start md:col-span-2 md:row-span-2"
                    : "shrink-0 w-[58vw] sm:w-[38vw] md:w-auto snap-start"
                }
              >
                <Link
                  href={`/catalogo?cat=${card.id}`}
                  aria-label={`Ver ${card.label} en el catálogo${
                    card.minPrice
                      ? `, desde ${formatPrice(card.minPrice)}`
                      : ""
                  }`}
                  className="group relative flex flex-col h-full bg-white border border-neutral-200 rounded-3xl overflow-hidden transition-all duration-300 hover:border-[#3B9DD8] hover:shadow-[0_18px_50px_-20px_rgba(59,157,216,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9DD8] focus-visible:ring-offset-2"
                >
                  {/* Imagen */}
                  <div
                    className={`relative bg-[#F5F5F7] flex items-center justify-center overflow-hidden ${
                      isFeatured
                        ? "aspect-[5/4] md:aspect-auto md:flex-1 md:min-h-[320px] p-8 md:p-12"
                        : "aspect-[5/4] p-5"
                    }`}
                  >
                    {card.image ? (
                      <Image
                        src={card.image}
                        alt={card.productName ?? card.label}
                        fill
                        sizes={isFeatured ? "(min-width: 768px) 50vw, 78vw" : "(min-width: 768px) 25vw, 58vw"}
                        className={`object-contain transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06] ${
                          isFeatured ? "p-8 md:p-14" : "p-6"
                        }`}
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full bg-neutral-200 rounded-xl" />
                    )}

                    {isFeatured && (
                      <span className="absolute top-4 left-4 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#3B9DD8] bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full">
                        Destacado
                      </span>
                    )}

                    <span
                      className="absolute top-3 right-3 inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm text-neutral-700 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
                      aria-hidden
                    >
                      <ArrowUpRight size={14} />
                    </span>
                  </div>

                  {/* Info */}
                  <div
                    className={`flex flex-col ${
                      isFeatured ? "px-6 py-5 md:px-8 md:py-6" : "flex-1 px-4 py-3.5"
                    }`}
                  >
                    <h3
                      className={`font-bold text-neutral-900 group-hover:text-[#3B9DD8] transition-colors ${
                        isFeatured ? "text-xl md:text-2xl" : "text-base"
                      }`}
                    >
                      {card.label}
                    </h3>
                    <p
                      className={`text-neutral-500 leading-snug ${
                        isFeatured ? "text-sm mt-1" : "text-[11px] mt-0.5"
                      }`}
                    >
                      {card.tag}
                    </p>
                    <div
                      className={`flex items-baseline justify-between gap-2 ${
                        isFeatured ? "mt-4 md:mt-5" : "mt-3"
                      }`}
                    >
                      <div className="min-w-0">
                        {card.minPrice > 0 ? (
                          <>
                            <p
                              className={`uppercase tracking-wider text-neutral-400 font-semibold leading-none ${
                                isFeatured ? "text-[11px]" : "text-[10px]"
                              }`}
                            >
                              Desde
                            </p>
                            <p
                              className={`font-bold text-neutral-900 mt-0.5 ${
                                isFeatured ? "text-lg md:text-xl" : "text-sm"
                              }`}
                            >
                              {formatPrice(card.minPrice)}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-neutral-400">
                            Próximamente
                          </p>
                        )}
                      </div>
                      <span
                        className={`font-semibold text-neutral-500 bg-neutral-100 rounded-full whitespace-nowrap ${
                          isFeatured
                            ? "text-[11px] px-2.5 py-1"
                            : "text-[10px] px-2 py-0.5"
                        }`}
                      >
                        {card.count} {card.count === 1 ? "modelo" : "modelos"}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* CTA móvil para ver todo */}
        <div className="mt-5 sm:hidden">
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#3B9DD8] hover:text-[#2A84BE] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9DD8] rounded px-1"
          >
            Ver todo el catálogo
            <ArrowUpRight size={12} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
