"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Star, Edit2, MapPin, Check, X } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Address = {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  department: string;
  notes: string | null;
  is_default: boolean;
};

const DEPARTAMENTOS = [
  "Antioquia",
  "Bogotá D.C.",
  "Valle del Cauca",
  "Cundinamarca",
  "Atlántico",
  "Bolívar",
  "Santander",
  "Otro",
];

const EMPTY: Omit<Address, "id" | "is_default"> = {
  label: "Casa",
  full_name: "",
  phone: "",
  address: "",
  city: "",
  department: "Antioquia",
  notes: null,
};

export default function AddressManager({ userId }: { userId: string }) {
  const [list, setList] = useState<Address[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<typeof EMPTY>(EMPTY);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function load() {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("customer_addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      console.warn("[addresses] read failed", error);
      setList([]);
      return;
    }
    setList(data as Address[]);
  }

  function startNew() {
    setDraft(EMPTY);
    setEditingId("__new__");
  }

  function startEdit(a: Address) {
    setDraft({
      label: a.label,
      full_name: a.full_name,
      phone: a.phone,
      address: a.address,
      city: a.city,
      department: a.department,
      notes: a.notes,
    });
    setEditingId(a.id);
  }

  async function save() {
    if (
      !draft.full_name.trim() ||
      !draft.phone.trim() ||
      !draft.address.trim() ||
      !draft.city.trim()
    ) {
      alert("Completa nombre, teléfono, ciudad y dirección.");
      return;
    }
    setBusy(true);
    const supabase = getSupabaseBrowserClient();
    if (editingId === "__new__") {
      const { error } = await supabase.from("customer_addresses").insert({
        user_id: userId,
        label: draft.label || "Casa",
        full_name: draft.full_name,
        phone: draft.phone,
        address: draft.address,
        city: draft.city,
        department: draft.department,
        notes: draft.notes ?? null,
        is_default: list?.length === 0, // primera dirección queda como default
      });
      setBusy(false);
      if (error) return alert("Error guardando: " + error.message);
    } else if (editingId) {
      const { error } = await supabase
        .from("customer_addresses")
        .update({
          label: draft.label,
          full_name: draft.full_name,
          phone: draft.phone,
          address: draft.address,
          city: draft.city,
          department: draft.department,
          notes: draft.notes,
        })
        .eq("id", editingId);
      setBusy(false);
      if (error) return alert("Error guardando: " + error.message);
    }
    setEditingId(null);
    await load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta dirección?")) return;
    const supabase = getSupabaseBrowserClient();
    await supabase.from("customer_addresses").delete().eq("id", id);
    await load();
  }

  async function setDefault(id: string) {
    const supabase = getSupabaseBrowserClient();
    // Quitar default de todas y poner en la elegida.
    await supabase
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("user_id", userId);
    await supabase
      .from("customer_addresses")
      .update({ is_default: true })
      .eq("id", id);
    await load();
  }

  if (list === null) {
    return (
      <p className="text-sm text-neutral-400 animate-pulse">Cargando direcciones…</p>
    );
  }

  return (
    <div className="space-y-3">
      {list.length === 0 && editingId !== "__new__" && (
        <div className="bg-neutral-50 border border-dashed border-neutral-200 rounded-2xl p-8 text-center">
          <MapPin size={20} className="text-neutral-400 mx-auto mb-2" />
          <p className="text-sm text-neutral-500 mb-4">
            No tienes direcciones guardadas todavía.
          </p>
          <button
            onClick={startNew}
            className="inline-flex items-center gap-1.5 bg-[#3B9DD8] hover:bg-[#2A84BE] text-white text-xs font-bold px-4 py-2 rounded-full transition"
          >
            <Plus size={12} /> Agregar dirección
          </button>
        </div>
      )}

      {list.map((a) =>
        editingId === a.id ? (
          <AddressForm
            key={a.id}
            draft={draft}
            setDraft={setDraft}
            onSave={save}
            onCancel={() => setEditingId(null)}
            busy={busy}
          />
        ) : (
          <div
            key={a.id}
            className="bg-white border border-neutral-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-neutral-900">
                  {a.label}
                </span>
                {a.is_default && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    Default
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-700">{a.full_name} · {a.phone}</p>
              <p className="text-sm text-neutral-600">
                {a.address}, {a.city}, {a.department}
              </p>
              {a.notes && (
                <p className="text-xs text-neutral-400 italic mt-1">{a.notes}</p>
              )}
            </div>
            <div className="flex gap-2">
              {!a.is_default && (
                <button
                  onClick={() => setDefault(a.id)}
                  className="text-xs font-semibold text-neutral-500 hover:text-amber-600 px-3 py-1.5 rounded-lg border border-neutral-200 hover:border-amber-300 transition flex items-center gap-1"
                >
                  <Star size={12} /> Default
                </button>
              )}
              <button
                onClick={() => startEdit(a)}
                className="text-xs font-semibold text-neutral-500 hover:text-[#3B9DD8] px-3 py-1.5 rounded-lg border border-neutral-200 hover:border-[#3B9DD8] transition flex items-center gap-1"
              >
                <Edit2 size={12} /> Editar
              </button>
              <button
                onClick={() => remove(a.id)}
                className="text-xs font-semibold text-neutral-400 hover:text-red-600 px-3 py-1.5 rounded-lg border border-neutral-200 hover:border-red-300 transition flex items-center gap-1"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        )
      )}

      {editingId === "__new__" && (
        <AddressForm
          draft={draft}
          setDraft={setDraft}
          onSave={save}
          onCancel={() => setEditingId(null)}
          busy={busy}
        />
      )}

      {list.length > 0 && editingId !== "__new__" && !editingId && (
        <button
          onClick={startNew}
          className="w-full bg-white border border-dashed border-neutral-300 hover:border-[#3B9DD8] hover:text-[#3B9DD8] text-neutral-500 rounded-2xl py-4 text-sm font-semibold flex items-center justify-center gap-2 transition"
        >
          <Plus size={14} /> Agregar otra dirección
        </button>
      )}
    </div>
  );
}

function AddressForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  busy,
}: {
  draft: typeof EMPTY;
  setDraft: (d: typeof EMPTY) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  return (
    <div className="bg-white border-2 border-[#3B9DD8] rounded-2xl p-5 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Etiqueta"
          value={draft.label}
          onChange={(v) => setDraft({ ...draft, label: v })}
          placeholder="Casa, oficina, etc."
        />
        <Input
          label="Nombre del receptor *"
          value={draft.full_name}
          onChange={(v) => setDraft({ ...draft, full_name: v })}
          placeholder="Juan Pérez"
        />
        <Input
          label="Teléfono *"
          value={draft.phone}
          onChange={(v) => setDraft({ ...draft, phone: v })}
          placeholder="3001234567"
        />
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1 block">
            Departamento
          </label>
          <select
            value={draft.department}
            onChange={(e) => setDraft({ ...draft, department: e.target.value })}
            className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
          >
            {DEPARTAMENTOS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Ciudad *"
          value={draft.city}
          onChange={(v) => setDraft({ ...draft, city: v })}
          placeholder="Medellín"
        />
        <Input
          label="Dirección *"
          value={draft.address}
          onChange={(v) => setDraft({ ...draft, address: v })}
          placeholder="Cra 10 #43-20 apto 501"
        />
      </div>
      <Input
        label="Notas (opcional)"
        value={draft.notes ?? ""}
        onChange={(v) => setDraft({ ...draft, notes: v || null })}
        placeholder="Ej: portería, código de seguridad, etc."
      />
      <div className="flex gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={busy}
          className="inline-flex items-center gap-2 bg-[#3B9DD8] hover:bg-[#2A84BE] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition disabled:opacity-50"
        >
          <Check size={14} /> Guardar
        </button>
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-900 text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <X size={14} /> Cancelar
        </button>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1 block">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
      />
    </div>
  );
}
