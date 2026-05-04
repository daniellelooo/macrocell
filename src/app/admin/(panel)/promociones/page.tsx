"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Save, Check, Trash2, Star, Sparkles, Tag, EyeOff } from "lucide-react";
import { useSiteConfigStore } from "@/lib/site-config-store";
import { useCatalogStore } from "@/lib/catalog-store";

export default function AdminPromocionesPage() {
  const bannerEnabled = useSiteConfigStore((s) => s.bannerEnabled);
  const bannerItems = useSiteConfigStore((s) => s.bannerItems);
  const setBannerItems = useSiteConfigStore((s) => s.setBannerItems);
  const updateConfig = useSiteConfigStore((s) => s.update);

  const products = useCatalogStore((s) => s.products);
  const updateFlags = useCatalogStore((s) => s.updateFlags);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleFlag = async (
    id: string,
    flags: { isFeatured?: boolean; isNew?: boolean; badge?: string | null }
  ) => {
    setSavingId(id);
    setErrorMsg(null);
    try {
      await updateFlags(id, flags);
    } catch (err) {
      setErrorMsg(`No se pudo guardar: ${(err as Error).message}`);
    } finally {
      setSavingId(null);
    }
  };

  const [draftItems, setDraftItems] = useState<string[]>(bannerItems);
  const [draftEnabled, setDraftEnabled] = useState<boolean>(bannerEnabled);
  const [savedBanner, setSavedBanner] = useState(false);

  const handleBannerSave = async () => {
    try {
      await setBannerItems(draftItems.filter((x) => x.trim()));
      await updateConfig({ bannerEnabled: draftEnabled });
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 1800);
    } catch (err) {
      alert("Error: " + (err as Error).message);
    }
  };

  const featuredCount = products.filter((p) => p.isFeatured).length;
  const newCount = products.filter((p) => p.isNew).length;

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900">
          Promociones
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Banner del top, productos destacados, nuevos y badges custom.
        </p>
      </motion.div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Banner ticker */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="bg-white rounded-2xl border border-neutral-200 p-5"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Sparkles size={14} className="text-[#3B9DD8]" />
              Banner del top (ticker)
            </h2>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Frases que rotan en el banner rojo arriba del navbar.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDraftEnabled((v) => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                draftEnabled
                  ? "bg-green-100 text-green-700"
                  : "bg-neutral-200 text-neutral-700"
              }`}
            >
              {draftEnabled ? "Visible" : "Oculto"}
            </button>
            <button
              onClick={handleBannerSave}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition active:scale-95 ${
                savedBanner ? "bg-green-500" : "bg-[#3B9DD8] hover:bg-[#2A84BE]"
              }`}
            >
              {savedBanner ? (
                <>
                  <Check size={12} /> Guardado
                </>
              ) : (
                <>
                  <Save size={12} /> Guardar
                </>
              )}
            </button>
          </div>
        </div>

        {/* Preview del ticker */}
        {draftEnabled && draftItems.filter((x) => x.trim()).length > 0 && (
          <div className="rounded-lg overflow-hidden mb-4 border border-neutral-200">
            <div className="bg-[#3B9DD8] text-white text-[11px] font-semibold tracking-wide select-none px-3 py-1.5 truncate">
              {draftItems
                .filter((x) => x.trim())
                .join("   ·   ")}
            </div>
            <p className="text-[10px] text-neutral-400 px-3 py-1.5 bg-neutral-50">
              Vista previa — en el sitio se desliza horizontal con animación.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {draftItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-neutral-400 w-5 text-center">
                {i + 1}
              </span>
              <input
                value={item}
                onChange={(e) =>
                  setDraftItems((d) => {
                    const next = [...d];
                    next[i] = e.target.value;
                    return next;
                  })
                }
                className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
                placeholder="Texto del banner…"
              />
              <button
                onClick={() =>
                  setDraftItems((d) => d.filter((_, idx) => idx !== i))
                }
                className="p-2 text-neutral-400 hover:text-[#3B9DD8] hover:bg-red-50 rounded-lg transition"
                aria-label="Eliminar"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() => setDraftItems((d) => [...d, ""])}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#3B9DD8] hover:bg-red-50 px-3 py-1.5 rounded-lg transition"
        >
          <Plus size={13} /> Agregar línea
        </button>
      </motion.section>

      {/* Flags por producto */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="bg-white rounded-2xl border border-neutral-200 overflow-hidden"
      >
        <div className="p-5 border-b border-neutral-100">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <Star size={14} className="text-yellow-500" />
                Productos destacados y badges
              </h2>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Cambios se guardan al instante por producto. {featuredCount}{" "}
                destacado{featuredCount === 1 ? "" : "s"} en home, {newCount}{" "}
                marcado{newCount === 1 ? "" : "s"} como nuevo.
              </p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr className="text-left text-[11px] uppercase tracking-wider text-neutral-500">
                <th className="px-4 py-2.5 font-semibold">Producto</th>
                <th className="px-4 py-2.5 font-semibold text-center w-32">
                  Destacado
                </th>
                <th className="px-4 py-2.5 font-semibold text-center w-32">
                  Nuevo
                </th>
                <th className="px-4 py-2.5 font-semibold w-56">Badge custom</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50/50 transition">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="relative w-9 h-9 bg-neutral-100 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          className="object-contain p-1"
                          unoptimized
                        />
                      </div>
                      <p className="text-sm font-semibold text-neutral-900 truncate max-w-[260px]">
                        {p.name}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      onClick={() => toggleFlag(p.id, { isFeatured: !p.isFeatured })}
                      disabled={savingId === p.id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition disabled:opacity-50 ${
                        p.isFeatured
                          ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                          : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"
                      }`}
                    >
                      {p.isFeatured ? (
                        <>
                          <Star size={10} className="fill-current" /> Sí
                        </>
                      ) : (
                        <>
                          <EyeOff size={10} /> No
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      onClick={() => toggleFlag(p.id, { isNew: !p.isNew })}
                      disabled={savingId === p.id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition disabled:opacity-50 ${
                        p.isNew
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                          : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"
                      }`}
                    >
                      {p.isNew ? "Sí" : "No"}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="relative">
                      <Tag
                        size={11}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400"
                      />
                      <input
                        defaultValue={p.badge ?? ""}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (p.badge ?? "")) {
                            void toggleFlag(p.id, { badge: v || null });
                          }
                        }}
                        placeholder="—"
                        className="w-full pl-7 pr-2 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2.5 text-[11px] text-neutral-400 bg-neutral-50/50">
          El badge se guarda al perder el foco del input.
        </p>
      </motion.section>
    </div>
  );
}
