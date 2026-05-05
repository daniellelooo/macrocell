"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, ShoppingBag, GitCompare } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { useWishlistStore } from "@/lib/wishlist-store";
import { useCompareStore } from "@/lib/compare-store";
import {
  type Product,
  formatPrice,
  getMinPrice,
  hasMultipleVariants,
  hasActivePromotion,
  getBestDiscountPct,
} from "@/lib/products";

type Props = {
  product: Product;
  index?: number;
};

export default function ProductCard({ product, index = 0 }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const toggle = useWishlistStore((s) => s.toggle);
  const isWished = useWishlistStore((s) => s.has(product.slug));
  const toggleCompare = useCompareStore((s) => s.toggle);
  const inCompare = useCompareStore((s) => s.has(product.slug));
  const minPrice = getMinPrice(product);
  const showFromLabel = hasMultipleVariants(product);
  const allOutOfStock = product.variants.every((v) => !v.inStock);
  const onSale = hasActivePromotion(product);
  const bestDiscount = getBestDiscountPct(product);
  // Para mostrar el "antes" tachado en la card usamos el comparePrice de la
  // variante más barata (la que aporta el `Desde`).
  const cheapestVariant = product.variants
    .slice()
    .sort((a, b) => a.price - b.price)[0];
  const compareAtMin = cheapestVariant?.comparePrice;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="group flex flex-col"
    >
      <Link href={`/productos/${product.slug}`} className="block">
        <div className="relative aspect-square mb-3 bg-[#F5F5F7] rounded-2xl overflow-hidden active:scale-[0.98] transition-transform duration-200">
          {allOutOfStock && (
            <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
              <span className="bg-neutral-900/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Sin stock
              </span>
            </div>
          )}
          {onSale && !allOutOfStock && (
            <span className="absolute top-2.5 left-2.5 z-10 bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              -{bestDiscount}%
            </span>
          )}
          {product.badge && !allOutOfStock && !onSale && (
            <span className="absolute top-2.5 left-2.5 z-10 bg-white text-neutral-600 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-neutral-200">
              {product.badge}
            </span>
          )}
          {product.isNew && !product.badge && !allOutOfStock && !onSale && (
            <span className="absolute top-2.5 left-2.5 z-10 bg-neutral-900 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Nuevo
            </span>
          )}
          <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1.5">
            <button
              onClick={(e) => { e.preventDefault(); toggle(product.slug); }}
              aria-label={isWished ? "Quitar de favoritos" : "Agregar a favoritos"}
              title={isWished ? "Quitar de favoritos" : "Agregar a favoritos"}
              className={`w-8 h-8 flex items-center justify-center rounded-full border shadow-sm transition-all hover:scale-110 ${
                isWished
                  ? "bg-red-50 border-[#3B9DD8] text-[#3B9DD8]"
                  : "bg-white border-neutral-200 text-neutral-500 hover:border-[#3B9DD8] hover:text-[#3B9DD8]"
              }`}
            >
              <Heart
                size={14}
                className={isWished ? "fill-[#3B9DD8]" : ""}
              />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                const ok = toggleCompare(product.slug);
                if (!ok && !inCompare) {
                  alert("Solo puedes comparar hasta 4 productos a la vez.");
                }
              }}
              aria-label={inCompare ? "Quitar del comparador" : "Agregar al comparador"}
              title={inCompare ? "En el comparador" : "Comparar este producto"}
              className={`w-8 h-8 flex items-center justify-center rounded-full border shadow-sm transition-all hover:scale-110 ${
                inCompare
                  ? "bg-[#3B9DD8] border-[#3B9DD8] text-white"
                  : "bg-white border-neutral-200 text-neutral-500 hover:border-[#3B9DD8] hover:text-[#3B9DD8]"
              }`}
            >
              <GitCompare size={14} />
            </button>
          </div>
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-contain p-5 group-hover:scale-[1.04] transition-transform duration-400"
            unoptimized
          />
        </div>
      </Link>

      <div className="flex flex-col flex-1">
        <Link href={`/productos/${product.slug}`}>
          <h3 className="font-semibold text-neutral-900 text-sm leading-snug mb-0.5 hover:text-[#3B9DD8] transition-colors">
            {product.name}
          </h3>
        </Link>
        <p className="text-[11px] text-neutral-400 mb-3 leading-snug">{product.shortDescription}</p>

        <div className="flex items-center justify-between mt-auto gap-2">
          <div className="min-w-0">
            {compareAtMin && compareAtMin > minPrice && (
              <p className="text-[10px] text-neutral-400 line-through leading-none mb-0.5">
                {formatPrice(compareAtMin)}
              </p>
            )}
            <p className={`text-sm font-bold ${onSale ? "text-red-600" : "text-neutral-900"}`}>
              {showFromLabel && (
                <span className="text-[10px] font-medium text-neutral-400 mr-1">
                  Desde
                </span>
              )}
              {formatPrice(minPrice)}
            </p>
          </div>
          {allOutOfStock ? (
            <span className="text-[10px] font-semibold text-neutral-400 px-3 py-1.5">
              Sin stock
            </span>
          ) : (
            <button
              onClick={() => addItem(product)}
              className="flex items-center gap-1.5 bg-neutral-100 hover:bg-[#3B9DD8] hover:text-white text-neutral-600 text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all active:scale-95"
              aria-label="Agregar al carrito"
            >
              <ShoppingBag size={12} />
              <span className="hidden sm:inline">Agregar</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
