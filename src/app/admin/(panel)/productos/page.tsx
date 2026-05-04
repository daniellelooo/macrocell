"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, ExternalLink, Pencil, Tag, Trash2, AlertTriangle } from "lucide-react";
import { useCatalogStore } from "@/lib/catalog-store";
import { useSiteConfigStore } from "@/lib/site-config-store";
import {
  formatPrice,
  getMinPrice,
  getMaxPrice,
  conditionLabels,
  categories,
  type ProductCategory,
} from "@/lib/products";

export default function AdminProductosPage() {
  const products = useCatalogStore((s) => s.products);
  const removeProduct = useCatalogStore((s) => s.remove);
  const resetCatalog = useCatalogStore((s) => s.reset);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<"todos" | ProductCategory>(
    "todos"
  );
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const lowStockThreshold = useSiteConfigStore((s) => s.stockLowThreshold);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat = activeCategory === "todos" || p.category === activeCategory;
      const matchSearch =
        search.trim() === "" ||
        [p.name, p.id, p.family, p.shortDescription]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchLow =
        !onlyLowStock ||
        p.variants.some(
          (v) => (v.stockQuantity ?? 0) <= lowStockThreshold
        );
      return matchCat && matchSearch && matchLow;
    });
  }, [products, search, activeCategory, onlyLowStock, lowStockThreshold]);

  const lowStockCount = useMemo(() => {
    return products.reduce(
      (sum, p) =>
        sum +
        p.variants.filter((v) => (v.stockQuantity ?? 0) <= lowStockThreshold)
          .length,
      0
    );
  }, [products, lowStockThreshold]);

  // Métricas rápidas
  const totalSKUs = products.reduce((sum, p) => sum + p.variants.length, 0);
  const inStockSKUs = products.reduce(
    (sum, p) => sum + p.variants.filter((v) => v.inStock).length,
    0
  );
  const featuredCount = products.filter((p) => p.isFeatured).length;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900">
            Productos
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Gestiona el catálogo: precios, variantes, stock y condición.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (
                confirm(
                  "¿Restaurar el catálogo a los valores por defecto?\n\nEsto borra todo lo editado en Supabase y vuelve al catálogo de fábrica del código."
                )
              ) {
                try {
                  await resetCatalog();
                } catch (err) {
                  alert("Error al restaurar: " + (err as Error).message);
                }
              }
            }}
            className="inline-flex items-center gap-2 bg-white border border-neutral-200 text-neutral-700 px-3 py-2.5 rounded-xl text-xs font-semibold hover:border-neutral-400 transition"
            title="Restaurar catálogo a defaults"
          >
            Restaurar defaults
          </button>
          <Link
            href="/admin/productos/nuevo"
            className="inline-flex items-center gap-2 bg-[#3B9DD8] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2A84BE] active:scale-95 transition"
          >
            <Plus size={15} />
            Crear producto
          </Link>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Productos" value={String(products.length)} />
        <Kpi label="SKUs totales" value={String(totalSKUs)} />
        <Kpi label="En stock" value={`${inStockSKUs}/${totalSKUs}`} />
        <Kpi label="Destacados home" value={String(featuredCount)} />
      </div>

      {/* Alerta de stock crítico */}
      {lowStockCount > 0 && (
        <button
          onClick={() => setOnlyLowStock((v) => !v)}
          className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
            onlyLowStock
              ? "bg-amber-100 border-amber-300"
              : "bg-amber-50 border-amber-200 hover:bg-amber-100"
          }`}
        >
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-900">
              {lowStockCount} variante{lowStockCount === 1 ? "" : "s"} con stock crítico
            </p>
            <p className="text-[11px] text-amber-700">
              Stock ≤ {lowStockThreshold} unidades · Click para{" "}
              {onlyLowStock ? "ver todo" : "filtrar solo críticos"}
            </p>
          </div>
          <span className="text-[11px] font-bold text-amber-800">
            {onlyLowStock ? "Quitar filtro" : "Filtrar"}
          </span>
        </button>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 space-y-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, id, familia…"
            className="w-full pl-9 pr-4 py-2.5 bg-neutral-100 rounded-xl text-sm text-neutral-700 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as "todos" | ProductCategory)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                activeCategory === cat.id
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr className="text-left text-[11px] uppercase tracking-wider text-neutral-500">
                <th className="px-4 py-3 font-semibold">Producto</th>
                <th className="px-4 py-3 font-semibold">Categoría</th>
                <th className="px-4 py-3 font-semibold">Variantes</th>
                <th className="px-4 py-3 font-semibold">Rango precio</th>
                <th className="px-4 py-3 font-semibold">Stock</th>
                <th className="px-4 py-3 font-semibold">Flags</th>
                <th className="px-4 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((p) => {
                const min = getMinPrice(p);
                const max = getMaxPrice(p);
                const inStock = p.variants.filter((v) => v.inStock).length;
                const conds = Array.from(new Set(p.variants.map((v) => v.condition)));
                return (
                  <tr key={p.id} className="hover:bg-neutral-50/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 bg-neutral-100 rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={p.image}
                            alt={p.name}
                            fill
                            className="object-contain p-1"
                            unoptimized
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 truncate max-w-[200px]">
                            {p.name}
                          </p>
                          <p className="text-[11px] text-neutral-400 font-mono truncate max-w-[200px]">
                            {p.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-neutral-600 bg-neutral-100 px-2 py-1 rounded-full capitalize">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-neutral-900">
                          {p.variants.length} {p.variants.length === 1 ? "SKU" : "SKUs"}
                        </span>
                        <div className="flex gap-1 flex-wrap">
                          {conds.map((c) => (
                            <span
                              key={c}
                              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                c === "nuevo"
                                  ? "bg-green-100 text-green-700"
                                  : c === "exhibicion"
                                  ? "bg-blue-100 text-blue-700"
                                  : c === "open-box"
                                  ? "bg-purple-100 text-purple-700"
                                  : c === "preventa"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-neutral-200 text-neutral-700"
                              }`}
                            >
                              {conditionLabels[c]}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-neutral-900 whitespace-nowrap">
                        {min === max
                          ? formatPrice(min)
                          : `${formatPrice(min)} – ${formatPrice(max)}`}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold ${
                          inStock === 0
                            ? "text-red-600"
                            : inStock < p.variants.length
                            ? "text-amber-600"
                            : "text-green-600"
                        }`}
                      >
                        {inStock}/{p.variants.length}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.isFeatured && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 uppercase tracking-wider">
                            Destacado
                          </span>
                        )}
                        {p.isNew && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 uppercase tracking-wider">
                            Nuevo
                          </span>
                        )}
                        {p.badge && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#3B9DD8]/10 text-[#3B9DD8] uppercase tracking-wider flex items-center gap-1">
                            <Tag size={9} /> {p.badge}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/productos/${p.slug}`}
                          target="_blank"
                          className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition"
                          aria-label="Ver en sitio público"
                          title="Ver en sitio público"
                        >
                          <ExternalLink size={14} />
                        </Link>
                        <Link
                          href={`/admin/productos/${p.id}`}
                          className="p-2 text-neutral-500 hover:text-[#0071E3] hover:bg-blue-50 rounded-lg transition"
                          aria-label="Editar"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </Link>
                        <button
                          onClick={() => setConfirmDelete(p.id)}
                          className="p-2 text-neutral-500 hover:text-[#3B9DD8] hover:bg-red-50 rounded-lg transition"
                          aria-label="Eliminar"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-semibold text-neutral-700 mb-1">
              No hay productos que coincidan
            </p>
            <p className="text-xs text-neutral-400">
              Cambia los filtros o limpia la búsqueda.
            </p>
          </div>
        )}
      </div>

      <p className="text-[11px] text-neutral-400">
        Cambios persisten en el navegador (localStorage). &ldquo;Restaurar
        defaults&rdquo; vuelve al catálogo de fábrica.
      </p>

      {/* Modal de confirmación de eliminación */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <Trash2 size={20} className="text-[#3B9DD8]" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-2">
              Eliminar producto
            </h3>
            <p className="text-sm text-neutral-500 mb-6 leading-relaxed">
              Vas a eliminar{" "}
              <strong className="text-neutral-900">
                {products.find((p) => p.id === confirmDelete)?.name}
              </strong>{" "}
              del catálogo. Esto se reflejará en el sitio público en este
              navegador. Puedes restaurar todo con &ldquo;Restaurar
              defaults&rdquo;.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 py-2.5 rounded-xl text-sm font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  try {
                    await removeProduct(confirmDelete);
                  } catch (err) {
                    alert("Error al eliminar: " + (err as Error).message);
                  }
                  setConfirmDelete(null);
                }}
                className="flex-1 bg-[#3B9DD8] hover:bg-[#2A84BE] text-white py-2.5 rounded-xl text-sm font-semibold transition"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 px-4 py-3.5">
      <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold mb-1">
        {label}
      </p>
      <p className="text-xl font-bold text-neutral-900">{value}</p>
    </div>
  );
}
