"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { useCatalogStore } from "@/lib/catalog-store";
import { getMinPrice, type Product } from "@/lib/products";

type Props = {
  current: Product;
  limit?: number;
};

/**
 * Sección "También te puede interesar".
 *
 * Estrategia de relacionamiento (sin ML, sin tabla aparte):
 * 1. Misma `family` excluyendo el actual (ej: iPhone 16 Pro y iPhone 16 Pro Max).
 * 2. Si quedan huecos, productos de la misma `category`.
 * 3. Si aún quedan huecos, productos `isFeatured` para llenar.
 * 4. Sort por proximidad de precio (similar al actual primero).
 */
export default function RelatedProducts({ current, limit = 4 }: Props) {
  const products = useCatalogStore((s) => s.products);

  const related = useMemo(() => {
    const others = products.filter((p) => p.id !== current.id);
    const currentMin = getMinPrice(current);

    const sameFamily = current.family
      ? others.filter((p) => p.family === current.family)
      : [];
    const sameCategory = others.filter(
      (p) => p.category === current.category && !sameFamily.includes(p)
    );
    const featured = others.filter(
      (p) =>
        p.isFeatured && !sameFamily.includes(p) && !sameCategory.includes(p)
    );

    const byProximity = (a: Product, b: Product) =>
      Math.abs(getMinPrice(a) - currentMin) -
      Math.abs(getMinPrice(b) - currentMin);

    const ordered = [
      ...sameFamily.sort(byProximity),
      ...sameCategory.sort(byProximity),
      ...featured.sort(byProximity),
    ];

    return ordered.slice(0, limit);
  }, [products, current, limit]);

  if (related.length === 0) return null;

  return (
    <section
      aria-labelledby="related-products-heading"
      className="border-t border-neutral-100 pt-10 mt-12"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-end justify-between mb-6"
      >
        <div>
          <h2
            id="related-products-heading"
            className="text-xl md:text-2xl font-bold tracking-tight text-neutral-900"
          >
            También te puede interesar
          </h2>
          <p className="text-xs md:text-sm text-neutral-500 mt-0.5">
            Productos similares al {current.name}
          </p>
        </div>
        <Link
          href={`/catalogo?cat=${current.category}`}
          className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-[#3B9DD8] hover:text-[#2A84BE] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9DD8] rounded px-1"
        >
          Ver todos <ArrowRight size={12} aria-hidden />
        </Link>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10">
        {related.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
    </section>
  );
}
