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
  formatPrice,
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

function emptyVariant(): Variant {
  return {
    sku: `sku-${Math.random().toString(36).slice(2, 9)}`,
    storage: "",
    ram: "",
    size: "",
    color: "",
    condition: "nuevo",
    price: 0,
    notes: "",
    inStock: true,
    stockQuantity: 1,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setDraft((d) => ({ ...d, variants: [...d.variants, emptyVariant()] }));

  const duplicateVariant = (sku: string) =>
    setDraft((d) => {
      const orig = d.variants.find((v) => v.sku === sku);
      if (!orig) return d;
      const copy: Variant = {
        ...orig,
        sku: `sku-${Math.random().toString(36).slice(2, 9)}`,
      };
      const idx = d.variants.findIndex((v) => v.sku === sku);
      const next = [...d.variants];
      next.splice(idx + 1, 0, copy);
      return { ...d, variants: next };
    });

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

      {/* Galería de imágenes */}
      <Section
        title="Imágenes"
        desc="La primera imagen es la portada. Asocia cada imagen a un color para que el cliente vea fotos del color que selecciona."
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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

      {/* Variantes */}
      <Section
        title="Variantes (precio + condición)"
        desc="Cada combinación de almacenamiento, RAM, tamaño o condición se vende como una variante con su propio precio y stock."
      >
        {draft.variants.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-neutral-200 rounded-xl">
            <p className="text-sm font-semibold text-neutral-700 mb-1">
              Aún no hay variantes
            </p>
            <p className="text-xs text-neutral-400 mb-4">
              Agrega al menos una para que el producto sea comprable.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {draft.variants.map((v) => {
              const qty = Math.max(0, Number(v.stockQuantity ?? 0));
              const stockBadge =
                qty === 0
                  ? { label: "Agotado", cls: "bg-red-100 text-red-700" }
                  : qty <= 2
                    ? { label: `${qty} en stock`, cls: "bg-amber-100 text-amber-700" }
                    : { label: `${qty} en stock`, cls: "bg-green-100 text-green-700" };
              return (
                <div
                  key={v.sku}
                  className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 space-y-3"
                >
                  {/* Fila 1: especificaciones */}
                  <div className="grid grid-cols-2 md:grid-cols-12 gap-3">
                    <Field label="Almacenamiento" className="md:col-span-3">
                      <Input
                        value={v.storage ?? ""}
                        onChange={(val) => updateVariant(v.sku, { storage: val })}
                        placeholder="256 GB"
                      />
                    </Field>
                    <Field label="RAM" className="md:col-span-2">
                      <Input
                        value={v.ram ?? ""}
                        onChange={(val) => updateVariant(v.sku, { ram: val })}
                        placeholder="16 GB"
                      />
                    </Field>
                    <Field label="Tamaño" className="md:col-span-2">
                      <Input
                        value={v.size ?? ""}
                        onChange={(val) => updateVariant(v.sku, { size: val })}
                        placeholder='14"'
                      />
                    </Field>
                    <Field label="Color" className="md:col-span-2">
                      {draft.colors.length > 0 ? (
                        <select
                          value={v.color ?? ""}
                          onChange={(e) =>
                            updateVariant(v.sku, { color: e.target.value || undefined })
                          }
                          className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
                        >
                          <option value="">— sin color —</option>
                          {draft.colors.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          value={v.color ?? ""}
                          onChange={(val) => updateVariant(v.sku, { color: val })}
                          placeholder="Negro"
                        />
                      )}
                    </Field>
                    <Field label="Condición" className="md:col-span-3">
                      <select
                        value={v.condition}
                        onChange={(e) =>
                          updateVariant(v.sku, {
                            condition: e.target.value as ProductCondition,
                          })
                        }
                        className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
                      >
                        {CONDITIONS.map((c) => (
                          <option key={c} value={c}>
                            {conditionLabels[c]}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {/* Fila 2: precio · stock · notas */}
                  <div className="grid grid-cols-2 md:grid-cols-12 gap-3">
                    <Field label="Precio (COP)" className="md:col-span-3">
                      <Input
                        type="number"
                        value={String(v.price)}
                        onChange={(val) =>
                          updateVariant(v.sku, { price: Number(val) || 0 })
                        }
                        placeholder="2950000"
                      />
                    </Field>
                    <Field label="Stock (unidades)" className="md:col-span-2">
                      <Input
                        type="number"
                        value={String(v.stockQuantity ?? 0)}
                        onChange={(val) =>
                          updateVariant(v.sku, {
                            stockQuantity: Math.max(0, Number(val) || 0),
                          })
                        }
                        placeholder="1"
                      />
                    </Field>
                    <Field label="Notas" className="md:col-span-7">
                      <Input
                        value={v.notes ?? ""}
                        onChange={(val) => updateVariant(v.sku, { notes: val })}
                        placeholder="Sim física, batería 100%, …"
                      />
                    </Field>
                  </div>

                  {/* Footer: badge stock · resumen · acciones */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-neutral-200">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${stockBadge.cls}`}
                      >
                        {stockBadge.label}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-400">
                        {v.sku}
                      </span>
                      <span className="text-[11px] font-semibold text-neutral-600">
                        {formatPrice(v.price)} · {conditionLabels[v.condition]}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => duplicateVariant(v.sku)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-white transition"
                        title="Duplicar variante"
                        aria-label="Duplicar variante"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeVariant(v.sku)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-[#3B9DD8] hover:bg-red-50 transition"
                        aria-label="Eliminar variante"
                        title="Eliminar variante"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <button
          type="button"
          onClick={addVariant}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#3B9DD8] hover:bg-red-50 px-3 py-2 rounded-lg transition"
        >
          <Plus size={14} /> Agregar variante
        </button>
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
