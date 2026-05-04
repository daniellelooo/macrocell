"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, ArrowLeft } from "lucide-react";
import { isAuthed, login } from "@/lib/admin-auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Si ya hay sesión, mandar al panel directamente
  useEffect(() => {
    let cancelled = false;
    isAuthed().then((ok) => {
      if (!cancelled && ok) router.replace("/admin/dashboard");
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const ok = await login({ username: user, password: pass });
      if (ok) {
        router.replace("/admin/dashboard");
      } else {
        setError("Usuario o contraseña incorrectos.");
        setSubmitting(false);
      }
    } catch {
      setError("Error de conexión. Reintenta en un segundo.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0C1014] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition mb-8"
        >
          <ArrowLeft size={12} /> Volver al sitio público
        </Link>

        <div className="bg-[#13181E] border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-7">
            <Image
              src="/macrocell-logo.jpg"
              alt="Macrocell"
              width={42}
              height={42}
              className="rounded-full object-cover"
            />
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">
                Panel
              </p>
              <p className="text-base font-bold text-white">Macrocell Admin</p>
            </div>
          </div>

          <h1 className="text-xl font-bold text-white mb-2">Iniciar sesión</h1>
          <p className="text-sm text-neutral-400 mb-7 leading-relaxed">
            Acceso al gestor de catálogo, promociones y configuración.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                required
                autoFocus
                className="w-full bg-[#0C1014] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/50 focus:border-[#3B9DD8]/50 transition"
                placeholder="tu@correo.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required
                className="w-full bg-[#0C1014] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/50 focus:border-[#3B9DD8]/50 transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-[#3B9DD8] hover:bg-[#2A84BE] text-white font-semibold text-sm py-3 rounded-xl transition active:scale-95 disabled:opacity-50"
            >
              <Lock size={14} /> Entrar
            </button>
          </form>

        </div>
      </motion.div>
    </div>
  );
}
