"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  UserPlus,
  RefreshCw,
  Shield,
  ShoppingBag,
  Package,
  User,
  Eye,
  EyeOff,
  Copy,
  Check,
  Key,
  TrendingUp,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Mail,
  Phone,
  X,
  Plus,
  Clock,
  ChevronDown,
} from "lucide-react";

type TeamMember = {
  id: string;
  fullName: string;
  phone: string;
  role: string;
  isAdmin: boolean;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
};

type CreatedCreds = {
  email: string;
  password: string;
  name: string;
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  vendedor: "Vendedor",
  gestor_inventario: "Gestor de inventario",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  vendedor: "bg-blue-100 text-blue-700",
  gestor_inventario: "bg-purple-100 text-purple-700",
};

const ROLE_ICONS: Record<string, React.ElementType> = {
  admin: Shield,
  vendedor: ShoppingBag,
  gestor_inventario: Package,
};

export default function UsuariosPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Crear
  const [showCreate, setShowCreate] = useState(false);
  const [fullName, setFullName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [createRole, setCreateRole] = useState("vendedor");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [lastCreds, setLastCreds] = useState<CreatedCreds | null>(null);
  const [credsCopied, setCredsCopied] = useState(false);

  // Editar
  const [editTarget, setEditTarget] = useState<TeamMember | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editing, setEditing] = useState(false);
  const [editMsg, setEditMsg] = useState<string | null>(null);

  // Reset password
  const [resetTarget, setResetTarget] = useState<TeamMember | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPw, setShowResetPw] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [resetCopied, setResetCopied] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [meRes, teamRes] = await Promise.all([
        fetch("/api/admin/list-team", { credentials: "include" }),
        Promise.resolve(null),
      ]);
      void teamRes;
      const json = await meRes.json();
      if (meRes.ok) {
        setTeam(json.team as TeamMember[]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Capturar el id del usuario logueado (para evitar self-delete)
    (async () => {
      const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getUser();
      setMeId(data.user?.id ?? null);
    })();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return team;
    return team.filter(
      (t) =>
        t.fullName.toLowerCase().includes(q) ||
        (t.email ?? "").toLowerCase().includes(q) ||
        t.phone.includes(q) ||
        t.role.includes(q)
    );
  }, [team, search]);

  const changeRole = async (id: string, role: string) => {
    setSavingId(id);
    try {
      const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
      const supabase = getSupabaseBrowserClient();
      await supabase
        .from("profiles")
        .update({ role, is_admin: role === "admin" })
        .eq("id", id);
      setTeam((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, role, isAdmin: role === "admin" } : p
        )
      );
      flash("Rol actualizado");
    } finally {
      setSavingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEmail.trim() || !createPassword.trim()) return;
    setCreating(true);
    setCreateMsg(null);
    try {
      const res = await fetch("/api/admin/invite-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createEmail.trim(),
          password: createPassword.trim(),
          full_name: fullName.trim(),
          role: createRole,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setLastCreds({
          email: createEmail.trim(),
          password: createPassword.trim(),
          name: fullName.trim(),
        });
        setFullName("");
        setCreateEmail("");
        setCreatePassword("");
        setShowCreate(false);
        flash("Usuario creado");
        load();
      } else {
        setCreateMsg(json.error ?? "Error al crear usuario");
      }
    } catch {
      setCreateMsg("Error de red");
    }
    setCreating(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditing(true);
    setEditMsg(null);
    try {
      const res = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editTarget.id,
          full_name: editName.trim(),
          phone: editPhone.trim(),
          email:
            editEmail.trim() && editEmail.trim() !== (editTarget.email ?? "")
              ? editEmail.trim()
              : undefined,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setEditTarget(null);
        flash("Datos actualizados");
        load();
      } else {
        setEditMsg(json.error ?? "Error");
      }
    } catch {
      setEditMsg("Error de red");
    }
    setEditing(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget || !resetPassword.trim()) return;
    setResetting(true);
    setResetMsg(null);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: resetTarget.id,
          newPassword: resetPassword.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setResetMsg({ ok: true, text: "Contraseña actualizada." });
      } else {
        setResetMsg({ ok: false, text: json.error ?? "Error" });
      }
    } catch {
      setResetMsg({ ok: false, text: "Error de red" });
    }
    setResetting(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteMsg(null);
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deleteTarget.id }),
      });
      const json = await res.json();
      if (res.ok) {
        setDeleteTarget(null);
        flash("Usuario eliminado");
        load();
      } else {
        setDeleteMsg(json.error ?? "Error");
      }
    } catch {
      setDeleteMsg("Error de red");
    }
    setDeleting(false);
  };

  const copy = (text: string, after?: () => void) => {
    navigator.clipboard.writeText(text).then(() => after?.());
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
          <Check size={14} className="text-green-400" /> {toast}
        </div>
      )}

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900">
            Equipo
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Admins, vendedores y gestores. Los clientes registrados están en{" "}
            <Link href="/admin/clientes" className="text-[#3B9DD8] underline">
              Clientes
            </Link>
            .
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 transition"
            title="Recargar"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="inline-flex items-center gap-1.5 bg-[#3B9DD8] hover:bg-[#2A84BE] text-white px-3.5 py-2 rounded-xl text-sm font-semibold transition"
          >
            {showCreate ? (
              <>
                <X size={14} /> Cancelar
              </>
            ) : (
              <>
                <Plus size={14} /> Nuevo miembro
              </>
            )}
          </button>
        </div>
      </div>

      {/* Credenciales del último usuario creado */}
      {lastCreds && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-blue-900">
              Credenciales del usuario creado
              {lastCreds.name ? ` — ${lastCreds.name}` : ""}
            </p>
            <button
              onClick={() => setLastCreds(null)}
              className="text-xs text-blue-500 hover:text-blue-800"
            >
              Cerrar
            </button>
          </div>
          <div className="bg-white rounded-xl border border-blue-100 px-4 py-3 font-mono text-sm space-y-1">
            <p>
              <span className="text-neutral-500">Usuario:</span> {lastCreds.email}
            </p>
            <p>
              <span className="text-neutral-500">Contraseña:</span>{" "}
              {lastCreds.password}
            </p>
          </div>
          <button
            onClick={() =>
              copy(
                `Usuario: ${lastCreds.email}\nContraseña: ${lastCreds.password}`,
                () => {
                  setCredsCopied(true);
                  setTimeout(() => setCredsCopied(false), 2000);
                }
              )
            }
            className="flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 border border-blue-200 px-3 py-1.5 rounded-lg transition"
          >
            {credsCopied ? (
              <Check size={13} className="text-green-600" />
            ) : (
              <Copy size={13} />
            )}
            {credsCopied ? "¡Copiado!" : "Copiar credenciales"}
          </button>
          <p className="text-[11px] text-blue-600">
            Guarda esta información — no se volverá a mostrar al cerrar.
          </p>
        </div>
      )}

      {/* Crear miembro */}
      {showCreate && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <h2 className="text-sm font-bold text-neutral-800 mb-4 flex items-center gap-2">
            <UserPlus size={15} className="text-[#3B9DD8]" />
            Crear nuevo miembro
          </h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nombre completo"
                className="px-3 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
              />
              <input
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                required
                className="px-3 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative sm:col-span-2">
                <input
                  type={showPassword ? "text" : "password"}
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Contraseña (mín. 8 caracteres)"
                  required
                  minLength={8}
                  className="w-full pr-10 px-3 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <select
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30 bg-white"
              >
                <option value="vendedor">Vendedor</option>
                <option value="gestor_inventario">Gestor de inventario</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2.5 bg-[#3B9DD8] text-white rounded-xl text-sm font-semibold hover:bg-[#2A84BE] transition disabled:opacity-50"
            >
              {creating ? "Creando…" : "Crear usuario"}
            </button>
          </form>
          {createMsg && (
            <div className="mt-3 bg-red-50 text-red-600 border border-red-100 rounded-xl px-4 py-3 text-sm font-medium">
              {createMsg}
            </div>
          )}
        </div>
      )}

      {/* Búsqueda + lista */}
      <div className="bg-white rounded-2xl border border-neutral-200">
        <div className="px-4 py-3 border-b border-neutral-100">
          <div className="relative">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Buscar entre ${team.length} miembros…`}
              className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-neutral-400">
            Cargando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-400">
            {team.length === 0
              ? "Sin miembros aún. Click en \"Nuevo miembro\"."
              : "Ningún miembro coincide con la búsqueda."}
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {filtered.map((p) => (
              <TeamRow
                key={p.id}
                p={p}
                isMe={p.id === meId}
                saving={savingId === p.id}
                onChangeRole={(role) => changeRole(p.id, role)}
                onEdit={() => {
                  setEditTarget(p);
                  setEditName(p.fullName);
                  setEditPhone(p.phone);
                  setEditEmail(p.email ?? "");
                  setEditMsg(null);
                }}
                onResetPassword={() => {
                  setResetTarget(p);
                  setResetPassword("");
                  setResetMsg(null);
                  setShowResetPw(false);
                }}
                onDelete={() => {
                  setDeleteTarget(p);
                  setDeleteMsg(null);
                }}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Modal: Editar */}
      {editTarget && (
        <Modal
          title="Editar miembro"
          subtitle={editTarget.fullName || "Miembro del equipo"}
          onClose={() => setEditTarget(null)}
        >
          <form onSubmit={handleEdit} className="space-y-3">
            <Field label="Nombre completo">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
              />
            </Field>
            <Field label="Teléfono">
              <input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+57 314 894 1200"
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                Cambiar el email afecta el login del usuario.
              </p>
            </Field>
            {editMsg && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">
                {editMsg}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={editing}
                className="flex-1 py-2.5 bg-[#3B9DD8] text-white rounded-xl text-sm font-semibold hover:bg-[#2A84BE] transition disabled:opacity-50"
              >
                {editing ? "Guardando…" : "Guardar cambios"}
              </button>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="px-4 py-2.5 border border-neutral-200 rounded-xl text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Reset password */}
      {resetTarget && (
        <Modal
          title="Cambiar contraseña"
          subtitle={`${resetTarget.fullName || "Usuario"} · ${ROLE_LABELS[resetTarget.role] ?? resetTarget.role}`}
          onClose={() => setResetTarget(null)}
        >
          <form onSubmit={handleReset} className="space-y-3">
            <div className="relative">
              <input
                type={showResetPw ? "text" : "password"}
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Nueva contraseña (mín. 8 caracteres)"
                required
                minLength={8}
                className="w-full pr-10 px-3 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
              />
              <button
                type="button"
                onClick={() => setShowResetPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition"
              >
                {showResetPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {resetMsg && (
              <div
                className={`rounded-xl px-4 py-3 text-sm font-medium ${
                  resetMsg.ok
                    ? "bg-green-50 text-green-700 border border-green-100"
                    : "bg-red-50 text-red-600 border border-red-100"
                }`}
              >
                {resetMsg.text}
              </div>
            )}
            {resetMsg?.ok && resetPassword && (
              <button
                type="button"
                onClick={() =>
                  copy(resetPassword, () => {
                    setResetCopied(true);
                    setTimeout(() => setResetCopied(false), 2000);
                  })
                }
                className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 border border-neutral-200 px-3 py-1.5 rounded-lg transition"
              >
                {resetCopied ? (
                  <Check size={13} className="text-green-600" />
                ) : (
                  <Copy size={13} />
                )}
                {resetCopied ? "¡Copiado!" : "Copiar contraseña"}
              </button>
            )}
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={resetting}
                className="flex-1 py-2.5 bg-[#3B9DD8] text-white rounded-xl text-sm font-semibold hover:bg-[#2A84BE] transition disabled:opacity-50"
              >
                {resetting ? "Guardando…" : "Actualizar contraseña"}
              </button>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="px-4 py-2.5 border border-neutral-200 rounded-xl text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition"
              >
                Cerrar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Delete */}
      {deleteTarget && (
        <Modal
          title="Eliminar miembro"
          subtitle={deleteTarget.fullName || "Sin nombre"}
          onClose={() => setDeleteTarget(null)}
        >
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 leading-relaxed">
              <p className="font-semibold mb-1">Esta acción es permanente.</p>
              <p>
                El usuario perderá acceso inmediatamente. Las ventas y pedidos
                ya registrados <strong>no se borran</strong> — solo se elimina
                el acceso al sistema.
              </p>
            </div>
            {deleteMsg && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">
                {deleteMsg}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-[#3B9DD8] text-white rounded-xl text-sm font-semibold hover:bg-[#2A84BE] transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                <Trash2 size={14} />
                {deleting ? "Eliminando…" : "Sí, eliminar"}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 border border-neutral-200 rounded-xl text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── Subcomponentes ─────────────────────────────────────────────── */

function TeamRow({
  p,
  isMe,
  saving,
  onChangeRole,
  onEdit,
  onResetPassword,
  onDelete,
}: {
  p: TeamMember;
  isMe: boolean;
  saving: boolean;
  onChangeRole: (role: string) => void;
  onEdit: () => void;
  onResetPassword: () => void;
  onDelete: () => void;
}) {
  const RoleIcon = ROLE_ICONS[p.role] ?? User;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const lastSignIn = p.lastSignInAt
    ? formatRelative(new Date(p.lastSignInAt))
    : "Nunca ingresó";

  return (
    <li className="px-4 md:px-5 py-4 flex items-center gap-3 md:gap-4">
      <div className="w-10 h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center text-sm font-bold shrink-0">
        {initials(p.fullName)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-neutral-900 truncate">
            {p.fullName || "(sin nombre)"}
          </p>
          {isMe && (
            <span className="text-[9px] uppercase tracking-wider font-bold bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded-full">
              Tú
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[p.role] ?? "bg-neutral-100 text-neutral-600"}`}
          >
            <RoleIcon size={10} />
            {ROLE_LABELS[p.role] ?? p.role}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-neutral-500 mt-0.5">
          {p.email && (
            <span className="inline-flex items-center gap-1 truncate max-w-[260px]">
              <Mail size={10} /> {p.email}
            </span>
          )}
          {p.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone size={10} /> {p.phone}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-neutral-400">
            <Clock size={10} /> {lastSignIn}
          </span>
        </div>
      </div>

      {/* Select de rol estilizado */}
      <div className="relative shrink-0 hidden md:block">
        <select
          value={p.role}
          onChange={(e) => onChangeRole(e.target.value)}
          disabled={saving || isMe}
          className="appearance-none pr-7 pl-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
          title={isMe ? "No puedes cambiar tu propio rol" : "Cambiar rol"}
        >
          <option value="admin">Admin</option>
          <option value="vendedor">Vendedor</option>
          <option value="gestor_inventario">Gestor inv.</option>
        </select>
        <ChevronDown
          size={12}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
        />
      </div>

      {/* Botones inline */}
      {p.role === "vendedor" && (
        <Link
          href={`/admin/vendedor/${p.id}`}
          className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white text-[11px] font-semibold text-neutral-700 hover:border-[#3B9DD8] hover:text-[#3B9DD8] hover:bg-red-50 transition shrink-0"
          title="Ver historial de ventas"
        >
          <TrendingUp size={12} /> Ventas
        </Link>
      )}

      <button
        onClick={onDelete}
        disabled={isMe}
        title={isMe ? "No puedes eliminarte a ti mismo" : "Eliminar miembro"}
        className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white text-[11px] font-semibold text-neutral-500 hover:border-[#3B9DD8] hover:text-[#3B9DD8] hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-neutral-200 disabled:hover:text-neutral-500 disabled:hover:bg-white shrink-0"
      >
        <Trash2 size={12} />
        <span className="hidden lg:inline">Eliminar</span>
      </button>

      {/* Menú adicional con acciones secundarias */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="p-2 rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition"
          aria-label="Más acciones"
          title="Más acciones"
        >
          <MoreVertical size={14} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 z-30 bg-white rounded-xl border border-neutral-200 shadow-lg w-52 py-1">
            <MenuItem
              icon={<Pencil size={13} />}
              label="Editar datos"
              onClick={() => {
                setMenuOpen(false);
                onEdit();
              }}
            />
            <MenuItem
              icon={<Key size={13} />}
              label="Cambiar contraseña"
              onClick={() => {
                setMenuOpen(false);
                onResetPassword();
              }}
            />
            {/* Versión mobile de las acciones inline */}
            <div className="sm:hidden">
              <div className="my-1 border-t border-neutral-100" />
              {p.role === "vendedor" && (
                <Link
                  href={`/admin/vendedor/${p.id}`}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50 transition"
                  onClick={() => setMenuOpen(false)}
                >
                  <TrendingUp size={13} />
                  Ver ventas
                </Link>
              )}
              <MenuItem
                icon={<Trash2 size={13} />}
                label="Eliminar"
                danger
                disabled={isMe}
                onClick={() => {
                  if (isMe) return;
                  setMenuOpen(false);
                  onDelete();
                }}
              />
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs transition ${
        disabled
          ? "text-neutral-300 cursor-not-allowed"
          : danger
            ? "text-[#3B9DD8] hover:bg-red-50"
            : "text-neutral-700 hover:bg-neutral-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-neutral-900">{title}</h2>
            {subtitle && (
              <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-100 -m-1"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "hace un momento";
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} día${days === 1 ? "" : "s"}`;
  if (days < 30) return `hace ${Math.floor(days / 7)} sem`;
  if (days < 365) return `hace ${Math.floor(days / 30)} meses`;
  return `hace ${Math.floor(days / 365)} año${Math.floor(days / 365) === 1 ? "" : "s"}`;
}
