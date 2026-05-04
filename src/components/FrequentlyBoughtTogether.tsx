"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, ShoppingBag, Check } from "lucide-react";
import {
  formatPrice,
  getDefaultVariant,
  getMinPrice,
  type Product,
} from "@/lib/products";
import { useCatalogStore } from "@/lib/catalog-store";
import { useCartStore } from "@/lib/store";
import { track } from "@/lib/analytics";

type Props = { current: Product };

/**
 * Mapping de accesorios sugeridos por categoría del producto principal.
 * Si no hay match, el componente no se renderiza.
 */
const ACCESSORY_IDS_BY_CATEGORY: Record<string, string[]> = {
  iphone: [
    "cargador-usbc-20w",
    "magsafe-charger",
    "airpods-4",
    "cable-usbc-lightning",
  ],
  ipad: ["apple-pencil-usbc", "cargador-usbc-20w"],
  mac: ["cargador-usbc-20w"],
  watch: [],
  accesorios: [], // si ya estás viendo un accesorio, no sugerimos cross-sell
};

export default function FrequentlyBoughtTogether({ current }: Props) {
  const allProducts = useCatalogStore((s) => s.products);
  const addItem = useCartStore((s) => s.addItem);
  const [mounted, setMounted] = useState(false);
  const [adding, setAdding] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Productos sugeridos: filtrados por mapping + en stock + no es el actual.
  const suggestions = useMemo(() => {
    const ids = ACCESSORY_IDS_BY_CATEGORY[current.category] ?? [];
    return ids
      .map((id) => allProducts.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p))
      .filter((p) => p.id !== current.id)
      .filter((p) => p.variants.some((v) => v.inStock))
      .slice(0, 3); // máximo 3 sugerencias para no saturar
  }, [allProducts, current]);

  // Estado de selección: { [productId]: bool }
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    // Por defecto: producto actual ON, sugerencias ON.
    const init: Record<string, boolean> = { [current.id]: true };
    return init;
  });

  // Asegurar que las sugerencias arranquen marcadas cuando llegan async.
  useEffect(() => {
    setSelected((prev) => {
      const next = { ...prev };
      for (const s of suggestions) {
        if (next[s.id] === undefined) next[s.id] = true;
      }
      return next;
    });
  }, [suggestions]);

  if (!mounted) return null;
  if (suggestions.length === 0) return null;

  const all: Product[] = [current, ...suggestions];

  const total = all.reduce((sum, p) => {
    if (!selected[p.id]) return sum;
    return sum + getMinPrice(p);
  }, 0);

  const selectedCount = all.filter((p) => selected[p.id]).length;

  const toggle = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddAll = () => {
    setAdding(true);
    const itemsAdded: { id: string; name: string; category: string; price: number; quantity: number }[] = [];

    for (const p of all) {
      if (!selected[p.id]) continue;
      const variant = getDefaultVariant(p);
      if (!variant) continue;
      const result = addItem(p, { variant });
      if (result.ok) {
        itemsAdded.push({
          id: p.id,
          name: p.name,
          category: p.category,
          price: variant.price,
          quantity: 1,
        });
      }
    }

    // Tracking — un evento "agregar todo" con todos los items
    if (itemsAdded.length > 0) {
      track("add_to_cart", {
        value: itemsAdded.reduce((s, i) => s + i.price * i.quantity, 0),
        contentName: `Bundle: ${current.name}`,
        contentIds: itemsAdded.map((i) => i.id),
        items: itemsAdded,
      });
    }

    setDone(true);
    setTimeout(() => {
      setDone(false);
      setAdding(false);
    }, 2000);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="border-t border-neutral-100 pt-10 mt-12"
    >
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-neutral-900">
          Frecuentemente comprados juntos
        </h2>
        <p className="text-xs md:text-sm text-neutral-500 mt-0.5">
          Aprovecha y completa tu compra con accesorios originales.
        </p>
      </div>

      <div className="bg-neutral-50 rounded-2xl border border-neutral-100 p-4 md:p-6">
        {/* Visual: imágenes con + entre ellas */}
        <div className="flex items-center justify-center gap-2 md:gap-4 mb-6 overflow-x-auto no-scrollbar">
          {all.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2 md:gap-4 shrink-0">
              <div
                className={`relative w-20 h-20 md:w-28 md:h-28 rounded-xl bg-white border-2 transition shrink-0 ${
                  selected[p.id]
                    ? "border-[#3B9DD8]"
                    : "border-neutral-200 opacity-40"
                }`}
              >
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  className="object-contain p-2"
                  unoptimized
                />
                {selected[p.id] && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#3B9DD8] text-white rounded-full flex items-center justify-center">
                    <Check size={12} />
                  </span>
                )}
              </div>
              {i < all.length - 1 && (
                <Plus size={18} className="text-neutral-400 shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Lista con checkboxes */}
        <ul className="space-y-2.5 mb-5">
          {all.map((p, i) => {
            const isCurrent = p.id === current.id;
            return (
              <li key={p.id}>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!selected[p.id]}
                    onChange={() => toggle(p.id)}
                    className="mt-1 w-4 h-4 rounded border-neutral-300 text-[#3B9DD8] focus:ring-2 focus:ring-[#3B9DD8]/30 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-neutral-900 group-hover:text-[#3B9DD8] transition">
                        {p.name}
                      </p>
                      {isCurrent && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded-full">
                          Este producto
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">
                      {p.shortDescription}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-neutral-900 shrink-0 ml-2">
                    {i === 0 && getMinPrice(p) > getMinPrice(current) === false
                      ? formatPrice(getMinPrice(p))
                      : formatPrice(getMinPrice(p))}
                  </p>
                </label>
              </li>
            );
          })}
        </ul>

        {/* Total + CTA */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-neutral-200 flex-wrap">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">
              Total {selectedCount > 0 ? `(${selectedCount} producto${selectedCount === 1 ? "" : "s"})` : ""}
            </p>
            <p className="text-2xl font-bold text-neutral-900">
              {formatPrice(total)}
            </p>
          </div>
          <button
            onClick={handleAddAll}
            disabled={selectedCount === 0 || adding}
            className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
              done
                ? "bg-green-500 text-white"
                : "bg-[#3B9DD8] text-white hover:bg-[#2A84BE]"
            }`}
          >
            {done ? (
              <>
                <Check size={16} /> Agregado al carrito
              </>
            ) : (
              <>
                <ShoppingBag size={16} />
                Agregar {selectedCount === all.length ? "todo" : `(${selectedCount})`}
              </>
            )}
          </button>
        </div>
      </div>
    </motion.section>
  );
}
