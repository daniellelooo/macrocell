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
      <div className="max-w-7xl mx-auto">
        <div className="px-5 md:px-12 mb-7 md:mb-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-end justify-between gap-4"
          >
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#3B9DD8] mb-2">
                Compra por línea
              </p>
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-neutral-900 leading-tight">
                El ecosistema Apple,
                <br className="hidden md:inline" />
                <span className="text-neutral-400 md:text-neutral-500"> a precio reseller.</span>
              </h2>
            </div>
            <Link
              href="/catalogo"
              className="hidden sm:inline-flex items-center gap-1 text-xs md:text-sm font-semibold text-neutral-600 hover:text-[#3B9DD8] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9DD8] rounded px-1"
            >
              Ver todo el catálogo
              <ArrowUpRight size={13} aria-hidden />
            </Link>
          </motion.div>
        </div>

        {/* Mobile: scroll horizontal con snap.  Desktop: grid 5 columnas. */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-5 md:px-12 pb-2 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible snap-x snap-mandatory">
          {cards.map((card, i) =>
            card.count === 0 ? null : (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.4,
                  delay: i * 0.06,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="shrink-0 w-[58vw] sm:w-[40vw] md:w-auto snap-start"
              >
                <Link
                  href={`/catalogo?cat=${card.id}`}
                  aria-label={`Ver ${card.label} en el catálogo${
                    card.minPrice
                      ? `, desde ${formatPrice(card.minPrice)}`
                      : ""
                  }`}
                  className="group relative flex flex-col h-full bg-white border border-neutral-200 rounded-3xl overflow-hidden transition-all duration-300 hover:border-[#3B9DD8] hover:shadow-[0_10px_40px_-15px_rgba(204,0,0,0.25)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9DD8] focus-visible:ring-offset-2"
                >
                  {/* Imagen */}
                  <div className="relative aspect-[5/4] bg-[#F5F5F7] flex items-center justify-center p-5 overflow-hidden">
                    {card.image ? (
                      <Image
                        src={card.image}
                        alt={card.productName ?? card.label}
                        fill
                        className="object-contain p-6 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full bg-neutral-200 rounded-xl" />
                    )}
                    <span
                      className="absolute top-3 right-3 inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm text-neutral-700 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
                      aria-hidden
                    >
                      <ArrowUpRight size={14} />
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex flex-col flex-1 px-4 py-3.5">
                    <h3 className="text-base font-bold text-neutral-900 group-hover:text-[#3B9DD8] transition-colors">
                      {card.label}
                    </h3>
                    <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
                      {card.tag}
                    </p>
                    <div className="mt-3 flex items-baseline justify-between gap-2">
                      <div className="min-w-0">
                        {card.minPrice > 0 ? (
                          <>
                            <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold leading-none">
                              Desde
                            </p>
                            <p className="text-sm font-bold text-neutral-900 mt-0.5">
                              {formatPrice(card.minPrice)}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-neutral-400">
                            Próximamente
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {card.count} {card.count === 1 ? "modelo" : "modelos"}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          )}
        </div>

        {/* CTA móvil para ver todo */}
        <div className="px-5 mt-5 sm:hidden">
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
