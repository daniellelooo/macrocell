"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Save,
  Check,
  MessageCircle,
  AtSign,
  Image as ImageIcon,
  Search,
  BarChart3,
  Trash2,
  Upload,
  Type,
  Building2,
  Package,
  Plus,
} from "lucide-react";
import Image from "next/image";
import { useSiteConfigStore } from "@/lib/site-config-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AdminConfiguracionPage() {
  const cfg = useSiteConfigStore();
  const update = useSiteConfigStore((s) => s.update);

  const [draftWA, setDraftWA] = useState(cfg.whatsappNumber);
  const [draftWAMsg, setDraftWAMsg] = useState(cfg.whatsappDefaultMessage);
  const [draftIG, setDraftIG] = useState(cfg.instagramUrl);
  const [draftTT, setDraftTT] = useState(cfg.tiktokUrl);
  const [draftFB, setDraftFB] = useState(cfg.facebookUrl);

  const [draftHoursWeek, setDraftHoursWeek] = useState(cfg.hoursWeek);
  const [draftHoursWeekend, setDraftHoursWeekend] = useState(cfg.hoursWeekend);
  const [draftFooter, setDraftFooter] = useState(cfg.footerTagline);

  const [draftSeoTitle, setDraftSeoTitle] = useState(cfg.seoTitle);
  const [draftSeoDesc, setDraftSeoDesc] = useState(cfg.seoDescription);
  const [draftOgImage, setDraftOgImage] = useState(cfg.ogImageUrl);

  const [draftPixel, setDraftPixel] = useState(cfg.metaPixelId);
  const [draftGa, setDraftGa] = useState(cfg.gaMeasurementId);

  const [draftLowStock, setDraftLowStock] = useState(cfg.stockLowThreshold);

  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const flash = (key: string) => {
    setSavedKey(key);
    setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 1800);
  };

  const trySave = async (key: string, fn: () => Promise<void>) => {
    setErrorMsg(null);
    try {
      await fn();
      flash(key);
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900">
          Configuración del sitio
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Header, redes sociales, SEO, pixels de marketing e inventario.
        </p>
      </motion.div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* WhatsApp */}
      <Section
        icon={<MessageCircle size={16} className="text-[#25D366]" />}
        title="WhatsApp"
        desc="Aparece en navbar, bottom nav, footer, ficha de producto, carrito y checkout."
        onSave={() =>
          trySave("wa", async () => {
            const sanitized = draftWA.replace(/\D/g, "");
            if (sanitized.length < 10) {
              throw new Error(
                "El número debe incluir el código de país (ej: 573148941200)"
              );
            }
            await update({
              whatsappNumber: sanitized,
              whatsappDefaultMessage: draftWAMsg.trim(),
            });
          })
        }
        saved={savedKey === "wa"}
      >
        <div className="space-y-3">
          <div>
            <Label>Número (con código país, sin espacios ni +)</Label>
            <input
              value={draftWA}
              onChange={(e) => setDraftWA(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
              placeholder="573148941200"
            />
            <p className="text-[11px] text-neutral-400 mt-1.5">
              Formato wa.me — solo dígitos. Ejemplo Colombia: 573148941200
            </p>
          </div>
          <div>
            <Label>Mensaje por defecto</Label>
            <textarea
              value={draftWAMsg}
              onChange={(e) => setDraftWAMsg(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30 resize-none"
              placeholder="Hola, me interesa un producto de Macrocell…"
            />
          </div>
          <a
            href={`https://wa.me/${draftWA.replace(/\D/g, "")}${
              draftWAMsg ? `?text=${encodeURIComponent(draftWAMsg)}` : ""
            }`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-[#25D366] font-semibold hover:underline"
          >
            <MessageCircle size={12} />
            Probar enlace
          </a>
        </div>
      </Section>

      {/* Redes sociales */}
      <Section
        icon={<AtSign size={16} className="text-pink-500" />}
        title="Redes sociales"
        desc="URLs completas. Aparecen en footer y links del sitio."
        onSave={() =>
          trySave("redes", () =>
            update({
              instagramUrl: draftIG.trim(),
              tiktokUrl: draftTT.trim(),
              facebookUrl: draftFB.trim(),
            })
          )
        }
        saved={savedKey === "redes"}
      >
        <div className="space-y-3">
          <div>
            <Label>Instagram</Label>
            <input
              value={draftIG}
              onChange={(e) => setDraftIG(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
              placeholder="https://www.instagram.com/macrocellm1/"
            />
          </div>
          <div>
            <Label>TikTok</Label>
            <input
              value={draftTT}
              onChange={(e) => setDraftTT(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
              placeholder="https://www.tiktok.com/@macrocellm1"
            />
          </div>
          <div>
            <Label>Facebook</Label>
            <input
              value={draftFB}
              onChange={(e) => setDraftFB(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
              placeholder="https://facebook.com/macrocellm1"
            />
          </div>
        </div>
      </Section>

      {/* Horarios + footer */}
      <Section
        icon={<Building2 size={16} className="text-neutral-500" />}
        title="Horarios y footer"
        desc="Aparecen en footer, contacto y página de sedes."
        onSave={() =>
          trySave("hours", () =>
            update({
              hoursWeek: draftHoursWeek.trim(),
              hoursWeekend: draftHoursWeekend.trim(),
              footerTagline: draftFooter.trim(),
            })
          )
        }
        saved={savedKey === "hours"}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Horario lun-sáb</Label>
              <input
                value={draftHoursWeek}
                onChange={(e) => setDraftHoursWeek(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
              />
            </div>
            <div>
              <Label>Horario fin de semana / festivos</Label>
              <input
                value={draftHoursWeekend}
                onChange={(e) => setDraftHoursWeekend(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
              />
            </div>
          </div>
          <div>
            <Label>Tagline del footer</Label>
            <input
              value={draftFooter}
              onChange={(e) => setDraftFooter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
              placeholder="Reseller Apple en Medellín, Colombia."
            />
          </div>
        </div>
      </Section>

      {/* SEO */}
      <Section
        icon={<Search size={16} className="text-blue-500" />}
        title="SEO"
        desc="Título, descripción e imagen Open Graph para Google y previsualizaciones en redes."
        onSave={() =>
          trySave("seo", () =>
            update({
              seoTitle: draftSeoTitle.trim(),
              seoDescription: draftSeoDesc.trim(),
              ogImageUrl: draftOgImage.trim(),
            })
          )
        }
        saved={savedKey === "seo"}
      >
        <div className="space-y-3">
          <div>
            <Label>Título por defecto (≤ 60 caracteres ideal)</Label>
            <input
              value={draftSeoTitle}
              onChange={(e) => setDraftSeoTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
            />
            <p className="text-[10px] text-neutral-400 mt-1">
              {draftSeoTitle.length}/60
            </p>
          </div>
          <div>
            <Label>Meta descripción (≤ 160 caracteres ideal)</Label>
            <textarea
              value={draftSeoDesc}
              onChange={(e) => setDraftSeoDesc(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30 resize-none"
            />
            <p className="text-[10px] text-neutral-400 mt-1">
              {draftSeoDesc.length}/160
            </p>
          </div>
          <div>
            <Label>Imagen Open Graph (1200×630)</Label>
            <input
              value={draftOgImage}
              onChange={(e) => setDraftOgImage(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
              placeholder="https://… o /og.png"
            />
          </div>
        </div>
      </Section>

      {/* Marketing pixels */}
      <Section
        icon={<BarChart3 size={16} className="text-purple-500" />}
        title="Pixels de marketing"
        desc="Se cargan automáticamente en todas las páginas. Solo se inyectan si pones un ID."
        onSave={() =>
          trySave("pixels", () =>
            update({
              metaPixelId: draftPixel.trim(),
              gaMeasurementId: draftGa.trim(),
            })
          )
        }
        saved={savedKey === "pixels"}
      >
        <div className="space-y-3">
          <div>
            <Label>Meta Pixel ID</Label>
            <input
              value={draftPixel}
              onChange={(e) => setDraftPixel(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
              placeholder="123456789012345"
            />
            <p className="text-[11px] text-neutral-400 mt-1.5">
              Lo encuentras en Meta Business Suite → Píxeles. Las ventas web
              aquí coinciden con las del dashboard (no se mezclan con local).
            </p>
          </div>
          <div>
            <Label>Google Analytics 4 (Measurement ID)</Label>
            <input
              value={draftGa}
              onChange={(e) => setDraftGa(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
              placeholder="G-XXXXXXXXXX"
            />
          </div>
        </div>
      </Section>

      {/* Inventario */}
      <Section
        icon={<Package size={16} className="text-amber-500" />}
        title="Inventario"
        desc="Configuración de alertas de stock."
        onSave={() =>
          trySave("inv", () =>
            update({
              stockLowThreshold: Math.max(0, Number(draftLowStock) || 0),
            })
          )
        }
        saved={savedKey === "inv"}
      >
        <div>
          <Label>Umbral de stock crítico (unidades)</Label>
          <input
            type="number"
            min={0}
            value={draftLowStock}
            onChange={(e) => setDraftLowStock(Number(e.target.value) || 0)}
            className="w-32 px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
          />
          <p className="text-[11px] text-neutral-400 mt-1.5">
            Variantes con stock ≤ este valor se marcan como críticas en
            productos y aparecen como alerta.
          </p>
        </div>
      </Section>
    </div>
  );
}

/* ─── Subcomponentes ─────────────────────────────────────────── */

function Section({
  icon,
  title,
  desc,
  children,
  onSave,
  saved,
}: {
  icon?: React.ReactNode;
  title: string;
  desc?: string;
  children: React.ReactNode;
  onSave?: () => void;
  saved?: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-white rounded-2xl border border-neutral-200 p-5"
    >
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-sm font-bold text-neutral-900">{title}</h2>
          </div>
          {desc && <p className="text-[11px] text-neutral-500 mt-0.5">{desc}</p>}
        </div>
        {onSave && (
          <button
            onClick={onSave}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition active:scale-95 ${
              saved ? "bg-green-500" : "bg-[#3B9DD8] hover:bg-[#2A84BE]"
            }`}
          >
            {saved ? (
              <>
                <Check size={12} /> Guardado
              </>
            ) : (
              <>
                <Save size={12} /> Guardar
              </>
            )}
          </button>
        )}
      </div>
      {children}
    </motion.section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1.5">
      {children}
    </label>
  );
}

function ImageGallery({
  label,
  images,
  onChange,
  saved,
}: {
  label: string;
  images: string[];
  onChange: (imgs: string[]) => void;
  saved?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pasteUrl, setPasteUrl] = useState("");

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const uploaded: string[] = [];
      for (const f of Array.from(files)) {
        const ext = f.name.split(".").pop() || "jpg";
        const path = `site/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
        const { error } = await supabase.storage
          .from("product-images")
          .upload(path, f, { cacheControl: "3600", upsert: false });
        if (error) {
          alert(`Error: ${error.message}`);
          continue;
        }
        const { data } = supabase.storage
          .from("product-images")
          .getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      if (uploaded.length > 0) onChange([...images, ...uploaded]);
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (i: number) =>
    onChange(images.filter((_, idx) => idx !== i));

  const move = (i: number, dir: -1 | 1) => {
    const next = [...images];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/40">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
          <ImageIcon size={11} /> {label}
        </p>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-[11px] font-semibold text-green-600 inline-flex items-center gap-1">
              <Check size={11} /> Guardado
            </span>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3B9DD8] hover:bg-red-50 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
          >
            <Upload size={12} /> {uploading ? "Subiendo…" : "Subir imágenes"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleUpload(e.target.files);
              if (e.target) e.target.value = "";
            }}
          />
        </div>
      </div>

      {images.length === 0 ? (
        <p className="text-xs text-neutral-400 text-center py-6">
          Sin imágenes — sube al menos una.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {images.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="relative group aspect-square rounded-lg bg-white border border-neutral-200 overflow-hidden"
            >
              <Image
                src={url}
                alt={`${label} ${i + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="p-1.5 bg-white text-neutral-700 rounded-full disabled:opacity-30 hover:bg-neutral-100"
                  title="Mover arriba"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === images.length - 1}
                  className="p-1.5 bg-white text-neutral-700 rounded-full disabled:opacity-30 hover:bg-neutral-100"
                  title="Mover abajo"
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="p-1.5 bg-white text-[#3B9DD8] rounded-full hover:bg-red-50"
                  title="Eliminar"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <span className="absolute top-1 left-1 bg-white/90 text-neutral-700 text-[9px] font-bold px-1.5 py-0.5 rounded">
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <input
          value={pasteUrl}
          onChange={(e) => setPasteUrl(e.target.value)}
          placeholder="Pegar URL de imagen…"
          className="flex-1 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
        />
        <button
          type="button"
          onClick={() => {
            const u = pasteUrl.trim();
            if (!u) return;
            onChange([...images, u]);
            setPasteUrl("");
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 hover:border-neutral-400 px-3 py-1.5 rounded-lg transition"
        >
          <Plus size={11} /> Agregar
        </button>
      </div>

      <p className="mt-2 text-[10px] text-neutral-400 inline-flex items-center gap-1">
        <Type size={10} /> El orden es el orden del carrusel. Hover sobre una
        imagen para reordenar o eliminar.
      </p>
    </div>
  );
}
