"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Copy,
  ImagePlus,
  Plus,
  Save,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCatalogStore } from "@/lib/catalog-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  toImageObject,
  type Product,
  type ProductCategory,
  type ProductCondition,
  type ProductImage,
  type Variant,
  categories,
  conditionLabels,
} from "@/lib/products";

const CONDITIONS: ProductCondition[] = [
  "nuevo",
  "exhibicion",
  "open-box",
  "as-is",
  "preventa",
];

const CATEGORY_OPTIONS = categories.filter((c) => c.id !== "todos");

function emptyProduct(): Product {
  return {
    id: "",
    slug: "",
    name: "",
    category: "iphone",
    family: "",
    description: "",
    shortDescription: "",
    image: "",
    images: [],
    colors: [],
    features: [],
    variants: [],
    isNew: false,
    isFeatured: false,
    badge: "",
  };
}

function emptyVariant(productId?: string): Variant {
  return {
    sku: productId ? `${productId}-${Math.random().toString(36).slice(2, 6)}` : `sku-${Math.random().toString(36).slice(2, 9)}`,
    storage: "",
    ram: "",
    size: "",
    color: "",
    condition: "nuevo",
    price: 0,
    notes: "",
    inStock: true,
    stockQuantity: 1,
    commissionPct: 0,
  };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Genera un SKU determinístico: <productId>-<storage>-<condition_short>-<seq?> */
function autoSku(
  productId: string,
  variant: Pick<Variant, "storage" | "ram" | "condition" | "color">,
  existing: string[]
): string {
  const conditionShort: Record<string, string> = {
    nuevo: "nuevo",
    exhibicion: "exh",
    "open-box": "ob",
    "as-is": "asis",
    preventa: "pre",
  };
  const parts = [
    productId || "sku",
    (variant.storage ?? "").toLowerCase().replace(/\s+/g, "").replace("gb", "").replace("tb", "tb") || null,
    variant.ram ? `${(variant.ram ?? "").toLowerCase().replace(/\s+/g, "").replace("gb", "")}r` : null,
    variant.color ? slugify(variant.color).slice(0, 6) : null,
    conditionShort[variant.condition] ?? variant.condition,
  ].filter(Boolean);
  const base = parts.join("-");
  // Si colisiona, agregar sufijo
  let candidate = base;
  let i = 2;
  while (existing.includes(candidate)) {
    candidate = `${base}-${i++}`;
  }
  return candidate;
}

// ─────────────────────────────────────────────────────────────────────
// Plantillas: precargan variantes típicas según familia/categoría.
// El usuario solo ajusta precios.
// ─────────────────────────────────────────────────────────────────────
type Template = {
  id: string;
  label: string;
  description: string;
  category: ProductCategory;
  family?: string;
  shortDescription?: string;
  features?: string[];
  variantSpecs: Array<{
    storage?: string;
    ram?: string;
    size?: string;
    condition: ProductCondition;
    notes?: string;
    /** Precio sugerido (el usuario lo ajustará). 0 = vacío. */
    price?: number;
  }>;
};

const TEMPLATES: Template[] = [
  {
    id: "iphone-pro",
    label: "iPhone Pro/Pro Max",
    description: "3 almacenamientos × 2 condiciones (nuevo + exhibición) = 6 variantes",
    category: "iphone",
    shortDescription: "Chip Pro · Cámara avanzada · Titanio",
    features: ["Pantalla Super Retina XDR", "Cámara Pro", "Chip serie A Pro", "Titanio"],
    variantSpecs: [
      { storage: "256 GB", condition: "nuevo" },
      { storage: "256 GB", condition: "exhibicion", notes: "Garantía 3.5 meses" },
      { storage: "512 GB", condition: "nuevo" },
      { storage: "512 GB", condition: "exhibicion", notes: "Garantía 3.5 meses" },
      { storage: "1 TB", condition: "nuevo" },
      { storage: "1 TB", condition: "exhibicion", notes: "Garantía 3.5 meses" },
    ],
  },
  {
    id: "iphone-std",
    label: "iPhone estándar",
    description: "2 almacenamientos × 2 condiciones (nuevo + exhibición) = 4 variantes",
    category: "iphone",
    shortDescription: "Chip serie A · Cámara dual · Diseño aluminio",
    features: ["Pantalla Super Retina", "Cámara dual", "Carga MagSafe"],
    variantSpecs: [
      { storage: "128 GB", condition: "nuevo" },
      { storage: "128 GB", condition: "exhibicion", notes: "Garantía 3.5 meses" },
      { storage: "256 GB", condition: "nuevo" },
      { storage: "256 GB", condition: "exhibicion", notes: "Garantía 3.5 meses" },
    ],
  },
  {
    id: "ipad",
    label: "iPad",
    description: "2 almacenamientos × 1 condición (nuevo) = 2 variantes",
    category: "ipad",
    shortDescription: "Pantalla Retina · Compatible con Apple Pencil",
    features: ["Pantalla Liquid Retina", "Compatible con Apple Pencil", "Touch ID"],
    variantSpecs: [
      { storage: "128 GB", condition: "nuevo" },
      { storage: "256 GB", condition: "nuevo" },
    ],
  },
  {
    id: "macbook",
    label: "MacBook",
    description: "RAM × Storage × condiciones — 4 variantes",
    category: "macbook",
    shortDescription: "Chip Apple Silicon · Pantalla Retina",
    features: ["Apple Silicon", "Pantalla Liquid Retina", "Hasta 18h batería"],
    variantSpecs: [
      { storage: "256 GB", ram: "8 GB", condition: "nuevo" },
      { storage: "512 GB", ram: "8 GB", condition: "nuevo" },
      { storage: "512 GB", ram: "16 GB", condition: "nuevo" },
      { storage: "1 TB", ram: "16 GB", condition: "nuevo" },
    ],
  },
  {
    id: "watch",
    label: "Apple Watch",
    description: "1 variante única (nuevo)",
    category: "watch",
    shortDescription: "Wearable de Apple con monitoreo de salud",
    features: ["GPS", "Monitor cardíaco", "Resistente al agua"],
    variantSpecs: [{ condition: "nuevo" }],
  },
  {
    id: "accesorio",
    label: "Accesorio",
    description: "1 variante única (nuevo)",
    category: "accesorios",
    shortDescription: "",
    features: [],
    variantSpecs: [{ condition: "nuevo" }],
  },
];

export default function ProductEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const products = useCatalogStore((s) => s.products);
  const upsert = useCatalogStore((s) => s.upsert);

  const isCreating = params.id === "nuevo";
  const initial = useMemo(() => {
    if (isCreating) return emptyProduct();
    return products.find((p) => p.id === params.id);
  }, [isCreating, params.id, products]);

  // El editor mantiene un draft local; sólo se commitea al store al guardar.
  const [draft, setDraft] = useState<Product>(initial ?? emptyProduct());
  const [saved, setSaved] = useState(false);
  const [showTemplates, setShowTemplates] = useState(isCreating);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  /** Aplica una plantilla: precarga categoría, descripciones y variantes típicas. */
  const applyTemplate = (tpl: Template) => {
    setDraft((d) => {
      const productId = d.id || slugify(d.name) || `nuevo-${Date.now()}`;
      const variants: Variant[] = [];
      const skus: string[] = [];
      for (const spec of tpl.variantSpecs) {
        const sku = autoSku(productId, {
          storage: spec.storage,
          ram: spec.ram,
          condition: spec.condition,
          color: undefined,
        }, skus);
        skus.push(sku);
        variants.push({
          sku,
          storage: spec.storage,
          ram: spec.ram,
          size: spec.size,
          color: undefined,
          condition: spec.condition,
          price: spec.price ?? 0,
          notes: spec.notes,
          inStock: true,
          stockQuantity: 1,
          commissionPct: 0,
        });
      }
      return {
        ...d,
        category: tpl.category,
        family: d.family || tpl.family,
        shortDescription: d.shortDescription || tpl.shortDescription || "",
        features: d.features.length === 0 && tpl.features ? tpl.features : d.features,
        variants: [...d.variants, ...variants],
      };
    });
    setShowTemplates(false);
  };

  // Si la ruta apunta a un id que no existe (y no es "nuevo"), 404.
  if (!isCreating && !initial) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/productos"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 transition"
        >
          <ArrowLeft size={12} /> Volver a productos
        </Link>
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
          <p className="text-sm font-semibold text-neutral-700 mb-1">
            Producto no encontrado
          </p>
          <p className="text-xs text-neutral-400">
            El id <code className="font-mono">{params.id}</code> no existe.
          </p>
        </div>
      </div>
    );
  }

  // Helpers de actualización del draft
  const update = <K extends keyof Product>(key: K, value: Product[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const updateVariant = (sku: string, patch: Partial<Variant>) =>
    setDraft((d) => ({
      ...d,
      variants: d.variants.map((v) => (v.sku === sku ? { ...v, ...patch } : v)),
    }));

  const removeVariant = (sku: string) =>
    setDraft((d) => ({
      ...d,
      variants: d.variants.filter((v) => v.sku !== sku),
    }));

  const addVariant = () =>
    setDraft((d) => {
      const productId = d.id || slugify(d.name) || "sku";
      const skus = d.variants.map((v) => v.sku);
      const newV = emptyVariant(productId);
      // Si las otras variantes ya tienen condición, heredarla (suele ser igual)
      if (d.variants.length > 0) {
        newV.condition = d.variants[d.variants.length - 1].condition;
      }
      newV.sku = autoSku(productId, newV, skus);
      return { ...d, variants: [...d.variants, newV] };
    });

  const duplicateVariant = (sku: string) =>
    setDraft((d) => {
      const orig = d.variants.find((v) => v.sku === sku);
      if (!orig) return d;
      const productId = d.id || slugify(d.name) || "sku";
      const skus = d.variants.map((v) => v.sku);
      const copy: Variant = {
        ...orig,
        sku: autoSku(productId, orig, skus),
      };
      const idx = d.variants.findIndex((v) => v.sku === sku);
      const next = [...d.variants];
      next.splice(idx + 1, 0, copy);
      return { ...d, variants: next };
    });

  /** Re-generar SKU automáticamente cuando cambia un atributo identificador. */
  const updateVariantWithAutoSku = (
    sku: string,
    patch: Partial<Variant>,
    autoRegenSku = false
  ) => {
    setDraft((d) => {
      const productId = d.id || slugify(d.name) || "sku";
      return {
        ...d,
        variants: d.variants.map((v) => {
          if (v.sku !== sku) return v;
          const merged = { ...v, ...patch };
          if (autoRegenSku) {
            const otherSkus = d.variants.filter((vv) => vv.sku !== sku).map((vv) => vv.sku);
            merged.sku = autoSku(productId, merged, otherSkus);
          }
          return merged;
        }),
      };
    });
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return;
    const supabase = getSupabaseBrowserClient();
    const productId = draft.id || `nuevo-${Date.now()}`;
    const uploads = await Promise.all(
      Array.from(files).map(async (f) => {
        const ext = f.name.split(".").pop() || "jpg";
        const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
        const { error } = await supabase.storage
          .from("product-images")
          .upload(path, f, { cacheControl: "3600", upsert: false });
        if (error) {
          console.error("[upload] failed", error);
          alert(`Error subiendo ${f.name}: ${error.message}`);
          return null;
        }
        const { data } = supabase.storage
          .from("product-images")
          .getPublicUrl(path);
        return data.publicUrl;
      })
    );
    const urls = uploads.filter((u): u is string => Boolean(u));
    if (urls.length === 0) return;
    setDraft((d) => {
      const added: ProductImage[] = urls.map((u) => ({ url: u }));
      const newImages = [...d.images, ...added];
      return {
        ...d,
        images: newImages,
        image: d.image || urls[0] || "",
      };
    });
  };

  const removeImage = (idx: number) =>
    setDraft((d) => {
      const removed = d.images[idx];
      const removedUrl = removed ? toImageObject(removed).url : "";
      const newImages = d.images.filter((_, i) => i !== idx);
      const fallback = newImages[0]
        ? toImageObject(newImages[0]).url
        : "";
      return {
        ...d,
        images: newImages,
        image: d.image === removedUrl ? fallback : d.image,
      };
    });

  const setPrimaryImage = (idx: number) =>
    setDraft((d) => ({
      ...d,
      image: d.images[idx] ? toImageObject(d.images[idx]).url : d.image,
    }));

  const setImageColor = (idx: number, color: string) =>
    setDraft((d) => ({
      ...d,
      images: d.images.map((img, i) => {
        if (i !== idx) return img;
        const obj = toImageObject(img);
        if (!color) return obj.url; // sin color → forma corta
        return { url: obj.url, color };
      }),
    }));

  const handleSave = async () => {
    // Validaciones mínimas
    const cleanName = draft.name.trim();
    if (!cleanName) {
      alert("Falta el nombre del producto.");
      return;
    }
    let id = draft.id.trim();
    let slug = draft.slug.trim();
    if (!id) id = slugify(cleanName);
    if (!slug) slug = id;

    // Validar unicidad cuando es creación o si cambió el id
    const conflict = products.find(
      (p) => p.id === id && (isCreating || p.id !== params.id)
    );
    if (conflict) {
      alert(`Ya existe un producto con id "${id}". Cambia el slug o el id.`);
      return;
    }

    if (draft.variants.length === 0) {
      if (!confirm("Estás guardando sin variantes — el producto no podrá venderse hasta que agregues al menos una. ¿Continuar?")) {
        return;
      }
    }

    const sanitized: Product = {
      ...draft,
      id,
      slug,
      name: cleanName,
      family: draft.family?.trim() || undefined,
      image:
        draft.image ||
        (draft.images[0] ? toImageObject(draft.images[0]).url : "") ||
        "",
      images:
        draft.images.length > 0
          ? draft.images
          : draft.image
            ? [draft.image]
            : [],
      badge: draft.badge?.trim() || undefined,
      colors: draft.colors.filter((c) => c.name.trim()),
      features: draft.features.filter((f) => f.trim()),
      variants: draft.variants.map((v) => ({
        ...v,
        sku: v.sku || `sku-${Math.random().toString(36).slice(2, 9)}`,
        storage: v.storage?.trim() || undefined,
        ram: v.ram?.trim() || undefined,
        size: v.size?.trim() || undefined,
        color: v.color?.trim() || undefined,
        notes: v.notes?.trim() || undefined,
        price: Number(v.price) || 0,
        stockQuantity: Math.max(0, Number(v.stockQuantity ?? 1)),
        inStock: Math.max(0, Number(v.stockQuantity ?? 1)) > 0,
      })),
    };

    try {
      await upsert(sanitized);
    } catch (err) {
      alert("Error al guardar: " + (err as Error).message);
      return;
    }
    setSaved(true);
    if (isCreating) {
      router.replace(`/admin/productos/${sanitized.id}`);
    } else {
      setTimeout(() => setSaved(false), 1800);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Link
            href="/admin/productos"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 transition mb-3"
          >
            <ArrowLeft size={12} /> Productos
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900">
            {isCreating ? "Crear producto" : draft.name || "Editar producto"}
          </h1>
          {!isCreating && (
            <p className="text-xs text-neutral-400 font-mono mt-1">
              id: {draft.id}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/productos"
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-neutral-700 bg-white border border-neutral-200 hover:border-neutral-400 transition"
          >
            Cancelar
          </Link>
          <button
            onClick={handleSave}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition active:scale-95 ${
              saved
                ? "bg-green-500"
                : "bg-[#3B9DD8] hover:bg-[#2A84BE]"
            }`}
          >
            {saved ? (
              <>
                <Check size={15} /> Guardado
              </>
            ) : (
              <>
                <Save size={15} /> Guardar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Plantillas (sólo al crear) */}
      {isCreating && showTemplates && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#3B9DD8]/5 to-transparent rounded-2xl border border-[#3B9DD8]/20 p-5"
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#3B9DD8]" /> Empezar desde una plantilla
              </h2>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Cada plantilla precarga categoría, descripción y variantes típicas.
                Solo ajustas precios y guardas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTemplates(false)}
              className="text-[11px] text-neutral-500 hover:text-neutral-900"
            >
              Crear desde cero
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className="text-left p-3 bg-white rounded-xl border border-neutral-200 hover:border-[#3B9DD8] hover:shadow-sm transition group"
              >
                <p className="text-sm font-bold text-neutral-900 group-hover:text-[#3B9DD8]">
                  {tpl.label}
                </p>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  {tpl.description}
                </p>
                <p className="text-[10px] text-neutral-400 mt-1.5">
                  {tpl.variantSpecs.length} variante{tpl.variantSpecs.length === 1 ? "" : "s"}
                </p>
              </button>
            ))}
          </div>
        </motion.section>
      )}

      {/* Galería de imágenes */}
      <Section
        title="Imágenes"
        desc="La primera imagen es la portada. Arrastra imágenes para subirlas. Asocia cada imagen a un color."
      >
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const files = e.dataTransfer.files;
            if (files && files.length > 0) handleImageUpload(files);
          }}
          className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 rounded-xl transition ${
            dragOver ? "ring-2 ring-[#3B9DD8] ring-offset-4 bg-[#3B9DD8]/5" : ""
          }`}
        >
          {draft.images.map((img, i) => {
            const obj = toImageObject(img);
            return (
              <div
                key={`${obj.url.slice(0, 30)}-${i}`}
                className="relative group rounded-xl bg-white border border-neutral-200 overflow-hidden hover:border-neutral-300 transition flex flex-col"
              >
                <div className="relative aspect-square bg-neutral-100">
                  <Image
                    src={obj.url}
                    alt={`Imagen ${i + 1}${obj.color ? ` ${obj.color}` : ""}`}
                    fill
                    className="object-contain p-3"
                    unoptimized
                  />
                  {draft.image === obj.url && (
                    <span className="absolute top-1.5 left-1.5 bg-yellow-400 text-yellow-900 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5">
                      <Star size={9} className="fill-yellow-900" /> Portada
                    </span>
                  )}
                  {obj.color && (
                    <span className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur-sm text-neutral-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-neutral-200">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor:
                            draft.colors.find((c) => c.name === obj.color)
                              ?.hex ?? "#888",
                        }}
                        aria-hidden
                      />
                      {obj.color}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    {draft.image !== obj.url && (
                      <button
                        onClick={() => setPrimaryImage(i)}
                        className="p-1.5 bg-white text-neutral-900 rounded-full hover:bg-yellow-100 transition"
                        aria-label="Hacer portada"
                        title="Hacer portada"
                      >
                        <Star size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => removeImage(i)}
                      className="p-1.5 bg-white text-[#3B9DD8] rounded-full hover:bg-red-50 transition"
                      aria-label="Eliminar imagen"
                      title="Eliminar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {/* Selector de color */}
                <div className="px-2 py-2 border-t border-neutral-100 bg-neutral-50">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Asociar color
                  </label>
                  <select
                    value={obj.color ?? ""}
                    onChange={(e) => setImageColor(i, e.target.value)}
                    className="w-full text-xs px-1.5 py-1 bg-white border border-neutral-200 rounded focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
                  >
                    <option value="">— Genérica —</option>
                    {draft.colors.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 hover:bg-neutral-100 hover:border-[#3B9DD8] transition flex flex-col items-center justify-center gap-1.5 text-neutral-500 hover:text-[#3B9DD8]"
          >
            <Upload size={18} />
            <span className="text-[11px] font-semibold">Subir</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleImageUpload(e.target.files);
              if (e.target) e.target.value = "";
            }}
          />
        </div>
        <div className="mt-3 flex items-center gap-3 text-[11px] text-neutral-500">
          <span className="flex items-center gap-1">
            <ImagePlus size={11} /> Tamaño recomendado 800×800 px o más
          </span>
          <span className="text-neutral-300">·</span>
          <span>
            {draft.images.length} imagen{draft.images.length === 1 ? "" : "es"}
          </span>
        </div>
      </Section>

      {/* Información básica */}
      <Section title="Información">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre *">
            <Input
              value={draft.name}
              onChange={(v) => {
                update("name", v);
                if (!draft.id || isCreating) {
                  const newSlug = slugify(v);
                  setDraft((d) => ({ ...d, name: v, id: newSlug, slug: newSlug }));
                }
              }}
              placeholder="iPhone 17 Pro"
            />
          </Field>
          <Field label="Familia">
            <Input
              value={draft.family ?? ""}
              onChange={(v) => update("family", v)}
              placeholder="iPhone 17"
            />
          </Field>

          <Field label="ID / Slug *">
            <Input
              value={draft.id}
              onChange={(v) => {
                const s = slugify(v);
                setDraft((d) => ({ ...d, id: s, slug: s }));
              }}
              placeholder="iphone-17-pro"
              mono
            />
          </Field>
          <Field label="Categoría *">
            <select
              value={draft.category}
              onChange={(e) =>
                update("category", e.target.value as ProductCategory)
              }
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Descripción corta" className="md:col-span-2">
            <Input
              value={draft.shortDescription}
              onChange={(v) => update("shortDescription", v)}
              placeholder="Chip A19 Pro · Cámara 48 MP · Titanio"
            />
          </Field>

          <Field label="Descripción larga" className="md:col-span-2">
            <textarea
              value={draft.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              placeholder="Texto descriptivo que aparece en la ficha del producto."
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30 resize-none"
            />
          </Field>
        </div>
      </Section>

      {/* Flags */}
      <Section title="Visibilidad y badges">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Toggle
            label="Destacado en home"
            description="Aparece en la sección 'Los más buscados'"
            value={!!draft.isFeatured}
            onChange={(v) => update("isFeatured", v)}
          />
          <Toggle
            label="Marcar como nuevo"
            description="Etiqueta 'Nuevo' en la tarjeta"
            value={!!draft.isNew}
            onChange={(v) => update("isNew", v)}
          />
          <Field label="Badge custom">
            <Input
              value={draft.badge ?? ""}
              onChange={(v) => update("badge", v)}
              placeholder="Mega descuento, Popular, …"
            />
          </Field>
        </div>
      </Section>

      {/* Variantes — grilla editable */}
      <Section
        title={`Variantes (${draft.variants.length})`}
        desc="Cada SKU es una variante con precio y stock propios. Al cambiar Storage/RAM/Color/Condición el SKU se regenera automáticamente."
      >
        {draft.variants.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-neutral-200 rounded-xl">
            <p className="text-sm font-semibold text-neutral-700 mb-1">
              Aún no hay variantes
            </p>
            <p className="text-xs text-neutral-400 mb-4">
              Agrega al menos una para que el producto sea comprable.
            </p>
            <button
              type="button"
              onClick={addVariant}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#3B9DD8] hover:bg-blue-50 px-3 py-2 rounded-lg transition"
            >
              <Plus size={14} /> Agregar primera variante
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-neutral-50 border-y border-neutral-200">
                <tr className="text-left text-[10px] uppercase tracking-wider text-neutral-500">
                  <th className="px-2 py-2 font-semibold">Almacen.</th>
                  <th className="px-2 py-2 font-semibold">RAM</th>
                  <th className="px-2 py-2 font-semibold">Tamaño</th>
                  <th className="px-2 py-2 font-semibold">Color</th>
                  <th className="px-2 py-2 font-semibold">Condición</th>
                  <th className="px-2 py-2 font-semibold text-right">Precio</th>
                  <th className="px-2 py-2 font-semibold text-right">Stock</th>
                  <th className="px-2 py-2 font-semibold text-right">Com %</th>
                  <th className="px-2 py-2 font-semibold">Notas</th>
                  <th className="px-2 py-2 font-semibold w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {draft.variants.map((v) => {
                  const qty = Math.max(0, Number(v.stockQuantity ?? 0));
                  const lowStock = qty === 0
                    ? "border-l-red-400"
                    : qty <= 2
                      ? "border-l-amber-400"
                      : "border-l-green-400";
                  return (
                    <tr key={v.sku} className={`group hover:bg-neutral-50 border-l-2 ${lowStock}`}>
                      <td className="px-1 py-1.5">
                        <CellInput
                          value={v.storage ?? ""}
                          onChange={(val) => updateVariantWithAutoSku(v.sku, { storage: val }, true)}
                          placeholder="256 GB"
                          className="w-20"
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <CellInput
                          value={v.ram ?? ""}
                          onChange={(val) => updateVariantWithAutoSku(v.sku, { ram: val }, true)}
                          placeholder="16 GB"
                          className="w-16"
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <CellInput
                          value={v.size ?? ""}
                          onChange={(val) => updateVariant(v.sku, { size: val })}
                          placeholder='14"'
                          className="w-12"
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        {draft.colors.length > 0 ? (
                          <select
                            value={v.color ?? ""}
                            onChange={(e) =>
                              updateVariantWithAutoSku(v.sku, { color: e.target.value || undefined }, true)
                            }
                            className="w-24 px-2 py-1.5 rounded border border-neutral-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#3B9DD8]"
                          >
                            <option value="">—</option>
                            {draft.colors.map((c) => (
                              <option key={c.name} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        ) : (
                          <CellInput
                            value={v.color ?? ""}
                            onChange={(val) => updateVariantWithAutoSku(v.sku, { color: val }, true)}
                            placeholder="Negro"
                            className="w-20"
                          />
                        )}
                      </td>
                      <td className="px-1 py-1.5">
                        <select
                          value={v.condition}
                          onChange={(e) =>
                            updateVariantWithAutoSku(v.sku, { condition: e.target.value as ProductCondition }, true)
                          }
                          className="w-28 px-2 py-1.5 rounded border border-neutral-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#3B9DD8]"
                        >
                          {CONDITIONS.map((c) => (
                            <option key={c} value={c}>{conditionLabels[c]}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-1 py-1.5">
                        <CellInput
                          type="number"
                          value={String(v.price)}
                          onChange={(val) => updateVariant(v.sku, { price: Number(val) || 0 })}
                          placeholder="0"
                          className="w-24 text-right"
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <CellInput
                          type="number"
                          value={String(v.stockQuantity ?? 0)}
                          onChange={(val) => updateVariant(v.sku, {
                            stockQuantity: Math.max(0, Number(val) || 0),
                          })}
                          placeholder="0"
                          className="w-14 text-right"
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <CellInput
                          type="number"
                          value={String(v.commissionPct ?? 0)}
                          onChange={(val) => updateVariant(v.sku, {
                            commissionPct: Math.max(0, Math.min(100, Number(val) || 0)),
                          })}
                          placeholder="0"
                          className="w-12 text-right"
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <CellInput
                          value={v.notes ?? ""}
                          onChange={(val) => updateVariant(v.sku, { notes: val })}
                          placeholder="—"
                          className="w-40"
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={() => duplicateVariant(v.sku)}
                            className="p-1 rounded text-neutral-400 hover:text-neutral-900 hover:bg-white transition"
                            title="Duplicar"
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeVariant(v.sku)}
                            className="p-1 rounded text-neutral-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Eliminar"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Resumen y acciones bajo la tabla */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 px-1">
              <div className="text-[11px] text-neutral-500">
                {draft.variants.filter((v) => (v.stockQuantity ?? 0) > 0).length} con stock ·{" "}
                {draft.variants.filter((v) => (v.stockQuantity ?? 0) === 0).length} agotadas ·
                Total stock: {draft.variants.reduce((s, v) => s + (v.stockQuantity ?? 0), 0)}
              </div>
              <button
                type="button"
                onClick={addVariant}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3B9DD8] hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
              >
                <Plus size={13} /> Agregar variante
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* Colores */}
      <Section title="Colores" desc="Solo para mostrar al cliente. No afectan el precio.">
        {draft.colors.length === 0 ? (
          <p className="text-xs text-neutral-400 mb-3">Sin colores cargados.</p>
        ) : (
          <div className="space-y-2 mb-3">
            {draft.colors.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <input
                  type="color"
                  value={c.hex}
                  onChange={(e) => {
                    const next = [...draft.colors];
                    next[i] = { ...next[i], hex: e.target.value };
                    update("colors", next);
                  }}
                  className="w-10 h-10 rounded-lg border border-neutral-200 cursor-pointer"
                />
                <Input
                  value={c.name}
                  onChange={(v) => {
                    const next = [...draft.colors];
                    next[i] = { ...next[i], name: v };
                    update("colors", next);
                  }}
                  placeholder="Titanio negro"
                />
                <button
                  type="button"
                  onClick={() =>
                    update(
                      "colors",
                      draft.colors.filter((_, idx) => idx !== i)
                    )
                  }
                  className="p-2 text-neutral-400 hover:text-[#3B9DD8] hover:bg-red-50 rounded-lg transition shrink-0"
                  aria-label="Eliminar color"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() =>
            update("colors", [...draft.colors, { name: "", hex: "#888888" }])
          }
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#3B9DD8] hover:bg-red-50 px-3 py-2 rounded-lg transition"
        >
          <Plus size={14} /> Agregar color
        </button>
      </Section>

      {/* Features */}
      <Section title="Características destacadas" desc="Aparecen como bullets en la ficha de producto.">
        {draft.features.length === 0 ? (
          <p className="text-xs text-neutral-400 mb-3">Sin features cargados.</p>
        ) : (
          <div className="space-y-2 mb-3">
            {draft.features.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={f}
                  onChange={(v) => {
                    const next = [...draft.features];
                    next[i] = v;
                    update("features", next);
                  }}
                  placeholder="Chip A19 Pro con Neural Engine"
                />
                <button
                  type="button"
                  onClick={() =>
                    update(
                      "features",
                      draft.features.filter((_, idx) => idx !== i)
                    )
                  }
                  className="p-2 text-neutral-400 hover:text-[#3B9DD8] hover:bg-red-50 rounded-lg transition shrink-0"
                  aria-label="Eliminar feature"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => update("features", [...draft.features, ""])}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#3B9DD8] hover:bg-red-50 px-3 py-2 rounded-lg transition"
        >
          <Plus size={14} /> Agregar feature
        </button>
      </Section>

      {/* Footer actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Link
          href="/admin/productos"
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-neutral-700 bg-white border border-neutral-200 hover:border-neutral-400 transition"
        >
          Cancelar
        </Link>
        <button
          onClick={handleSave}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition active:scale-95 ${
            saved ? "bg-green-500" : "bg-[#3B9DD8] hover:bg-[#2A84BE]"
          }`}
        >
          {saved ? (
            <>
              <Check size={15} /> Guardado
            </>
          ) : (
            <>
              <Save size={15} /> {isCreating ? "Crear producto" : "Guardar cambios"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── UI helpers ──────────────────────────────────────────────────────────

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-white rounded-2xl border border-neutral-200 p-5"
    >
      <div className="mb-4">
        <h2 className="text-sm font-bold text-neutral-900">{title}</h2>
        {desc && <p className="text-[11px] text-neutral-500 mt-0.5">{desc}</p>}
      </div>
      {children}
    </motion.section>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  mono = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "number";
  mono?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30 ${
        mono ? "font-mono text-xs" : ""
      }`}
    />
  );
}

/** Input compacto para usar dentro de la grilla de variantes. */
function CellInput({
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "number";
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`px-2 py-1.5 rounded border border-neutral-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#3B9DD8] ${className}`}
    />
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`text-left p-3 rounded-xl border transition ${
        value
          ? "border-[#3B9DD8] bg-red-50/50"
          : "border-neutral-200 bg-white hover:border-neutral-400"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-900">{label}</p>
          {description && (
            <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
              {description}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 w-10 h-6 rounded-full p-0.5 transition ${
            value ? "bg-[#3B9DD8]" : "bg-neutral-300"
          }`}
        >
          <span
            className={`block w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
              value ? "translate-x-4" : ""
            }`}
          />
        </span>
      </div>
    </button>
  );
}
