"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, ExternalLink, Pencil, Tag, Trash2, AlertTriangle, Copy, Upload } from "lucide-react";
import { useCatalogStore } from "@/lib/catalog-store";
import type { Product } from "@/lib/products";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const products = useCatalogStore((s) => s.products);
  const removeProduct = useCatalogStore((s) => s.remove);
  const upsertProduct = useCatalogStore((s) => s.upsert);
  const resetCatalog = useCatalogStore((s) => s.reset);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<"todos" | ProductCategory>(
    "todos"
  );
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const lowStockThreshold = useSiteConfigStore((s) => s.stockLowThreshold);

  const handleDuplicate = async (orig: Product) => {
    setDuplicating(orig.id);
    try {
      // randSuffix se calcula dentro del handler (no en render) — eslint
      // react-hooks/purity flagged Math.random aquí porque la regla no
      // distingue handlers de event de funciones de render.
      const rand = (n: number) =>
        Math.random().toString(36).slice(2, 2 + n);
      const newId = `${orig.id}-copia-${rand(3)}`;
      const dupSuffix = (sku: string) => `${sku}-c${rand(2)}`;
      const dup: Product = {
        ...orig,
        id: newId,
        slug: newId,
        name: `${orig.name} (copia)`,
        isFeatured: false,
        variants: orig.variants.map((v) => ({
          ...v,
          sku: dupSuffix(v.sku),
        })),
      };
      await upsertProduct(dup);
      router.push(`/admin/productos/${dup.id}`);
    } catch (err) {
      alert("Error al duplicar: " + (err as Error).message);
    } finally {
      setDuplicating(null);
    }
  };

  const handleImportCsv = async (file: File) => {
    setImporting(true);
    setImportMsg(null);
    try {
      const text = await file.text();
      const result = parseProductsCsv(text);
      if (result.errors.length > 0) {
        setImportMsg(`Errores en CSV: ${result.errors.slice(0, 3).join("; ")}`);
        setImporting(false);
        return;
      }
      let okCount = 0;
      for (const p of result.products) {
        try {
          await upsertProduct(p);
          okCount++;
        } catch (err) {
          console.error("import skip", p.id, err);
        }
      }
      setImportMsg(`✓ Importados ${okCount}/${result.products.length} productos`);
      setTimeout(() => setImportMsg(null), 4000);
    } catch (err) {
      setImportMsg("Error: " + (err as Error).message);
    }
    setImporting(false);
  };

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
        <div className="flex items-center gap-2 flex-wrap">
          <label
            className="inline-flex items-center gap-2 bg-white border border-neutral-200 text-neutral-700 px-3 py-2.5 rounded-xl text-xs font-semibold hover:border-neutral-400 transition cursor-pointer"
            title="Importar CSV"
          >
            <Upload size={13} />
            {importing ? "Importando…" : "Importar CSV"}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={importing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImportCsv(f);
                if (e.target) e.target.value = "";
              }}
            />
          </label>
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

      {importMsg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${
          importMsg.startsWith("✓")
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {importMsg}
        </div>
      )}

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
                          onClick={() => handleDuplicate(p)}
                          disabled={duplicating === p.id}
                          className="p-2 text-neutral-500 hover:text-[#3B9DD8] hover:bg-blue-50 rounded-lg transition disabled:opacity-40"
                          aria-label="Duplicar"
                          title="Duplicar producto (incluye variantes)"
                        >
                          <Copy size={14} />
                        </button>
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

// ─────────────────────────────────────────────────────────────────────
// Importador CSV
// ─────────────────────────────────────────────────────────────────────
//
// Formato esperado (encabezados, una fila por VARIANTE):
//   product_id, product_name, category, family, short_description,
//   sku, storage, ram, size, color, condition, price_cop, stock,
//   commission_pct, notes
//
// Las filas con el mismo product_id se agrupan en un solo producto con
// múltiples variantes. Los productos existentes se sobrescriben (upsert).

// Encabezados esperados (solo doc — el parser lee por nombre):
//   product_id, product_name, category, family, short_description,
//   sku, storage, ram, size, color, condition, price_cop,
//   stock, commission_pct, notes

const VALID_CATEGORIES = ["iphone", "ipad", "watch", "macbook", "accesorios"];
const VALID_CONDITIONS = ["nuevo", "exhibicion", "open-box", "as-is", "preventa"];

function parseProductsCsv(text: string): {
  products: Product[];
  errors: string[];
} {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { products: [], errors: ["CSV vacío"] };

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const required = ["product_id", "product_name", "category", "sku", "condition", "price_cop"];
  for (const r of required) {
    if (!headers.includes(r)) errors.push(`Falta columna requerida: ${r}`);
  }
  if (errors.length > 0) return { products: [], errors };

  const indexOf = (col: string) => headers.indexOf(col);
  const grouped = new Map<string, Product>();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length === 0 || (cols.length === 1 && cols[0] === "")) continue;
    const get = (col: string) => {
      const idx = indexOf(col);
      return idx >= 0 ? (cols[idx] ?? "").trim() : "";
    };
    const productId = get("product_id");
    const productName = get("product_name");
    const category = get("category");
    const sku = get("sku");
    const condition = get("condition");
    const priceCop = Number(get("price_cop"));

    if (!productId || !productName) {
      errors.push(`Fila ${i + 1}: falta product_id/product_name`);
      continue;
    }
    if (!VALID_CATEGORIES.includes(category)) {
      errors.push(`Fila ${i + 1}: categoría inválida "${category}" (válidas: ${VALID_CATEGORIES.join(", ")})`);
      continue;
    }
    if (!VALID_CONDITIONS.includes(condition)) {
      errors.push(`Fila ${i + 1}: condición inválida "${condition}"`);
      continue;
    }
    if (!sku) {
      errors.push(`Fila ${i + 1}: SKU vacío`);
      continue;
    }
    if (Number.isNaN(priceCop)) {
      errors.push(`Fila ${i + 1}: price_cop inválido`);
      continue;
    }

    const stock = Math.max(0, Number(get("stock")) || 0);
    const commission = Math.max(0, Math.min(100, Number(get("commission_pct")) || 0));

    let prod = grouped.get(productId);
    if (!prod) {
      prod = {
        id: productId,
        slug: productId,
        name: productName,
        category: category as ProductCategory,
        family: get("family") || undefined,
        shortDescription: get("short_description") || "",
        description: "",
        image: "",
        images: [],
        colors: [],
        features: [],
        variants: [],
        isFeatured: false,
        isNew: false,
      };
      grouped.set(productId, prod);
    }
    prod.variants.push({
      sku,
      storage: get("storage") || undefined,
      ram: get("ram") || undefined,
      size: get("size") || undefined,
      color: get("color") || undefined,
      condition: condition as Product["variants"][number]["condition"],
      price: priceCop,
      notes: get("notes") || undefined,
      inStock: stock > 0,
      stockQuantity: stock,
      commissionPct: commission,
    });
  }

  return { products: Array.from(grouped.values()), errors };
}

/** Parse simple de CSV (soporta comillas dobles para escapar comas y "\""). */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === ',') {
        out.push(cur);
        cur = "";
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out;
}
