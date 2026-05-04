"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, MapPin, Save, Trash2, Check } from "lucide-react";
import { useSiteConfigStore, type Sede } from "@/lib/site-config-store";

function emptySede(): Sede {
  return {
    id: `sede-${Math.random().toString(36).slice(2, 9)}`,
    name: "",
    area: "",
    detail: "",
  };
}

export default function AdminSedesPage() {
  const sedes = useSiteConfigStore((s) => s.sedes);
  const upsertSede = useSiteConfigStore((s) => s.upsertSede);
  const removeSede = useSiteConfigStore((s) => s.removeSede);
  const update = useSiteConfigStore((s) => s.update);
  const hoursWeek = useSiteConfigStore((s) => s.hoursWeek);
  const hoursWeekend = useSiteConfigStore((s) => s.hoursWeekend);

  const [draftSedes, setDraftSedes] = useState<Sede[]>(sedes);
  const [draftHoursWeek, setDraftHoursWeek] = useState(hoursWeek);
  const [draftHoursWeekend, setDraftHoursWeekend] = useState(hoursWeekend);
  const [saved, setSaved] = useState(false);

  const handleSedeChange = (id: string, patch: Partial<Sede>) => {
    setDraftSedes((d) => d.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const handleAdd = () => {
    setDraftSedes((d) => [...d, emptySede()]);
  };

  const handleRemove = (id: string) => {
    if (confirm("¿Eliminar esta sede del sitio?")) {
      setDraftSedes((d) => d.filter((s) => s.id !== id));
    }
  };

  const handleSave = async () => {
    try {
      const validSedes = draftSedes.filter((s) => s.name.trim());
      // Eliminar las que ya no están
      for (const existing of sedes) {
        if (!validSedes.some((s) => s.id === existing.id)) {
          await removeSede(existing.id);
        }
      }
      // Upsert las restantes
      for (const s of validSedes) {
        await upsertSede(s);
      }
      await update({
        hoursWeek: draftHoursWeek.trim(),
        hoursWeekend: draftHoursWeekend.trim(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      alert("Error guardando sedes: " + (err as Error).message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900">
            Sedes
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Las sedes aparecen en la sección &ldquo;Nuestras Sedes&rdquo; del
            home y en el footer.
          </p>
        </div>
        <button
          onClick={handleSave}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition active:scale-95 ${
            saved ? "bg-green-500" : "bg-[#3B9DD8] hover:bg-[#2A84BE]"
          }`}
        >
          {saved ? (
            <>
              <Check size={15} /> Guardado
            </>
          ) : (
            <>
              <Save size={15} /> Guardar cambios
            </>
          )}
        </button>
      </motion.div>

      {/* Lista editable de sedes */}
      <div className="space-y-3">
        {draftSedes.map((sede) => (
          <div
            key={sede.id}
            className="bg-white rounded-2xl border border-neutral-200 p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
          >
            <div className="md:col-span-1 flex md:justify-center">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <MapPin size={16} className="text-[#3B9DD8]" />
              </div>
            </div>
            <div className="md:col-span-4">
              <Label>Nombre del local</Label>
              <Input
                value={sede.name}
                onChange={(v) => handleSedeChange(sede.id, { name: v })}
                placeholder="C.C. Monterrey"
              />
            </div>
            <div className="md:col-span-3">
              <Label>Zona / Ciudad</Label>
              <Input
                value={sede.area}
                onChange={(v) => handleSedeChange(sede.id, { area: v })}
                placeholder="El Poblado, Medellín"
              />
            </div>
            <div className="md:col-span-3">
              <Label>Detalle (local)</Label>
              <Input
                value={sede.detail}
                onChange={(v) => handleSedeChange(sede.id, { detail: v })}
                placeholder="Local 206"
              />
            </div>
            <div className="md:col-span-1 flex md:justify-end">
              <button
                onClick={() => handleRemove(sede.id)}
                className="p-2 text-neutral-400 hover:text-[#3B9DD8] hover:bg-red-50 rounded-lg transition"
                aria-label="Eliminar sede"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={handleAdd}
          className="w-full py-3 border-2 border-dashed border-neutral-300 rounded-2xl text-sm font-semibold text-neutral-500 hover:bg-white hover:border-[#3B9DD8] hover:text-[#3B9DD8] transition flex items-center justify-center gap-1.5"
        >
          <Plus size={14} />
          Agregar sede
        </button>
      </div>

      {/* Horarios */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4">
        <h2 className="text-sm font-bold text-neutral-900">Horarios de atención</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Lunes a sábado</Label>
            <Input
              value={draftHoursWeek}
              onChange={setDraftHoursWeek}
              placeholder="Lunes–Sábado 10am–7:30pm"
            />
          </div>
          <div>
            <Label>Domingos y festivos</Label>
            <Input
              value={draftHoursWeekend}
              onChange={setDraftHoursWeekend}
              placeholder="Domingos y festivos 11am–5pm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1.5">
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
    />
  );
}
