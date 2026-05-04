"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { useWishlistStore } from "@/lib/wishlist-store";
import {
  type Product,
  formatPrice,
  getMinPrice,
  hasMultipleVariants,
} from "@/lib/products";

type Props = {
  product: Product;
  index?: number;
};

export default function ProductCard({ product, index = 0 }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const toggle = useWishlistStore((s) => s.toggle);
  const isWished = useWishlistStore((s) => s.has(product.slug));
  const minPrice = getMinPrice(product);
  const showFromLabel = hasMultipleVariants(product);
  const allOutOfStock = product.variants.every((v) => !v.inStock);

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
          {product.badge && !allOutOfStock && (
            <span className="absolute top-2.5 left-2.5 z-10 bg-white text-neutral-600 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-neutral-200">
              {product.badge}
            </span>
          )}
          {product.isNew && !product.badge && !allOutOfStock && (
            <span className="absolute top-2.5 left-2.5 z-10 bg-neutral-900 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Nuevo
            </span>
          )}
          <button
            onClick={(e) => { e.preventDefault(); toggle(product.slug); }}
            aria-label={isWished ? "Quitar de favoritos" : "Agregar a favoritos"}
            className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
          >
            <Heart
              size={14}
              className={isWished ? "fill-[#3B9DD8] text-[#3B9DD8]" : "text-neutral-400"}
            />
          </button>
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

        <div className="flex items-center justify-between mt-auto">
          <p className="text-sm font-bold text-neutral-900">
            {showFromLabel && (
              <span className="text-[10px] font-medium text-neutral-400 mr-1">
                Desde
              </span>
            )}
            {formatPrice(minPrice)}
          </p>
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
