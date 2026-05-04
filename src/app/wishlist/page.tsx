"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import { useWishlistStore } from "@/lib/wishlist-store";
import { useCatalogStore } from "@/lib/catalog-store";
import ProductCard from "@/components/ProductCard";

export default function WishlistPage() {
  const slugs = useWishlistStore((s) => s.slugs);
  const clear = useWishlistStore((s) => s.clear);
  const products = useCatalogStore((s) => s.products);

  const wished = products.filter((p) => slugs.includes(p.slug));

  return (
    <div className="pt-24 min-h-screen bg-[#F5F5F7] pb-24">
      <div className="max-w-6xl mx-auto px-5 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
              <Heart size={22} className="fill-[#3B9DD8] text-[#3B9DD8]" />
              Favoritos
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              {wished.length === 0
                ? "Aún no tienes productos guardados."
                : `${wished.length} producto${wished.length !== 1 ? "s" : ""} guardado${wished.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          {wished.length > 0 && (
            <button
              onClick={clear}
              className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-red-600 transition-colors"
            >
              <Trash2 size={13} /> Limpiar lista
            </button>
          )}
        </motion.div>

        {wished.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white rounded-3xl p-12 text-center"
          >
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart size={28} className="text-neutral-300" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">
              Tu lista de favoritos está vacía
            </h2>
            <p className="text-sm text-neutral-500 mb-6 max-w-xs mx-auto">
              Toca el corazón en cualquier producto del catálogo para guardarlo
              aquí.
            </p>
            <Link
              href="/catalogo"
              className="inline-flex items-center gap-2 bg-[#3B9DD8] text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-[#2A84BE] transition-colors"
            >
              <ShoppingBag size={15} /> Explorar catálogo
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-5">
            {wished.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
