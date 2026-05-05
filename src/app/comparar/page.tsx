"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowLeft, X, ShoppingBag, Check, Minus } from "lucide-react";
import { useCompareStore } from "@/lib/compare-store";
import { useCatalogStore } from "@/lib/catalog-store";
import { useCartStore } from "@/lib/store";
import {
  formatPrice,
  getMinPrice,
  getDefaultVariant,
  type Product,
  conditionLabels,
} from "@/lib/products";

/**
 * /comparar — comparador de productos lado a lado.
 * Soporta hasta 4 productos. Las filas comparan: precio, condiciones,
 * almacenamientos, colores, batería (exhibición), garantía, features.
 */
export default function CompararPage() {
  const slugs = useCompareStore((s) => s.slugs);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);
  const products = useCatalogStore((s) => s.products);
  const addItem = useCartStore((s) => s.addItem);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const items = mounted
    ? slugs
        .map((slug) => products.find((p) => p.slug === slug))
        .filter((p): p is Product => !!p)
    : [];

  if (mounted && items.length === 0) {
    return (
      <div className="pt-24 min-h-screen bg-[#F5F5F7] px-6 pb-24">
        <div className="max-w-3xl mx-auto text-center py-20">
          <h1 className="text-3xl font-bold text-neutral-900 mb-3">
            Comparador vacío
          </h1>
          <p className="text-neutral-500 mb-8">
            Agrega hasta 4 productos desde el catálogo para verlos lado a lado.
          </p>
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-2 bg-[#3B9DD8] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#2A84BE] transition"
          >
            Ir al catálogo
          </Link>
        </div>
      </div>
    );
  }

  // Filas de comparación. Cada una tiene `label` y `getValue(p)`.
  const rows: { label: string; getValue: (p: Product) => React.ReactNode }[] = [
    {
      label: "Precio desde",
      getValue: (p) => (
        <span className="font-bold text-neutral-900">
          {formatPrice(getMinPrice(p))}
        </span>
      ),
    },
    {
      label: "Categoría",
      getValue: (p) => (
        <span className="capitalize text-neutral-700">{p.category}</span>
      ),
    },
    {
      label: "Condiciones disponibles",
      getValue: (p) => {
        const set = new Set(p.variants.map((v) => conditionLabels[v.condition]));
        return Array.from(set).join(" · ");
      },
    },
    {
      label: "Almacenamientos",
      getValue: (p) => {
        const set = new Set(
          p.variants.map((v) => v.storage).filter(Boolean) as string[]
        );
        return set.size > 0 ? Array.from(set).join(" / ") : "—";
      },
    },
    {
      label: "Colores",
      getValue: (p) =>
        p.colors.length > 0 ? (
          <span className="flex gap-1.5 flex-wrap">
            {p.colors.map((c) => (
              <span
                key={c.name}
                title={c.name}
                style={{ backgroundColor: c.hex }}
                className="w-4 h-4 rounded-full border border-neutral-200"
              />
            ))}
          </span>
        ) : (
          "—"
        ),
    },
    {
      label: "Stock",
      getValue: (p) => {
        const total = p.variants.reduce(
          (acc, v) => acc + (v.stockQuantity ?? 0),
          0
        );
        return total > 0 ? (
          <span className="text-green-700 font-semibold">{total} u.</span>
        ) : (
          <span className="text-red-600 font-semibold">Sin stock</span>
        );
      },
    },
    {
      label: "Características",
      getValue: (p) =>
        p.features.length > 0 ? (
          <ul className="space-y-1 text-xs text-neutral-700 list-none">
            {p.features.slice(0, 5).map((f, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <Check size={11} className="text-[#3B9DD8] shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
            {p.features.length > 5 && (
              <li className="text-[10px] text-neutral-400 italic">
                +{p.features.length - 5} más en la ficha
              </li>
            )}
          </ul>
        ) : (
          <Minus size={14} className="text-neutral-300" />
        ),
    },
  ];

  return (
    <div className="pt-24 min-h-screen bg-[#F5F5F7] px-6 pb-24">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-neutral-500 mb-6">
          <Link
            href="/catalogo"
            className="hover:text-neutral-900 transition flex items-center gap-1"
          >
            <ArrowLeft size={14} /> Catálogo
          </Link>
        </div>

        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-1">
              Comparar productos
            </h1>
            <p className="text-neutral-500 text-sm">
              {items.length} producto{items.length === 1 ? "" : "s"} seleccionado
              {items.length === 1 ? "" : "s"}
            </p>
          </div>
          {items.length > 0 && (
            <button
              onClick={clear}
              className="text-sm text-neutral-500 hover:text-red-600 transition"
            >
              Limpiar todo
            </button>
          )}
        </div>

        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full bg-white rounded-3xl shadow-sm border-separate border-spacing-0 overflow-hidden">
            <thead>
              <tr>
                <th className="bg-neutral-50 text-left text-[10px] uppercase tracking-wider text-neutral-500 font-semibold px-5 py-4 sticky left-0 z-10 w-44">
                  Producto
                </th>
                {items.map((p) => (
                  <th
                    key={p.slug}
                    className="px-4 py-5 align-bottom text-left min-w-[200px] border-l border-neutral-100"
                  >
                    <div className="relative">
                      <button
                        onClick={() => remove(p.slug)}
                        aria-label={`Quitar ${p.name}`}
                        className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white border border-neutral-200 hover:border-red-300 hover:text-red-600 text-neutral-500 transition flex items-center justify-center"
                      >
                        <X size={14} />
                      </button>
                      <Link href={`/productos/${p.slug}`} className="block group">
                        <div className="aspect-square bg-neutral-50 rounded-2xl mb-3 p-4 flex items-center justify-center">
                          <Image
                            src={p.image}
                            alt={p.name}
                            width={140}
                            height={140}
                            className="object-contain w-full h-full group-hover:scale-105 transition"
                            unoptimized
                          />
                        </div>
                        <p className="text-sm font-bold text-neutral-900 leading-tight mb-1 line-clamp-2 group-hover:text-[#3B9DD8] transition">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-neutral-500 line-clamp-2">
                          {p.shortDescription}
                        </p>
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? "bg-neutral-50/40" : ""}>
                  <td className="px-5 py-3 text-[11px] uppercase tracking-wider text-neutral-500 font-semibold sticky left-0 bg-white">
                    {row.label}
                  </td>
                  {items.map((p) => (
                    <td
                      key={p.slug}
                      className="px-4 py-3 text-sm text-neutral-800 align-top border-l border-neutral-100"
                    >
                      {row.getValue(p)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="px-5 py-4 sticky left-0 bg-white" />
                {items.map((p) => {
                  const v = getDefaultVariant(p);
                  const inStock = !!v?.inStock;
                  return (
                    <td
                      key={p.slug}
                      className="px-4 py-4 align-top border-l border-neutral-100"
                    >
                      <button
                        onClick={() => v && addItem(p, { variant: v })}
                        disabled={!inStock}
                        className="w-full flex items-center justify-center gap-2 bg-[#3B9DD8] text-white py-2.5 rounded-xl font-semibold text-xs hover:bg-[#2A84BE] transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ShoppingBag size={13} />
                        {inStock ? "Agregar" : "Sin stock"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
