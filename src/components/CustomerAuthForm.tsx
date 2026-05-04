"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, Phone, User } from "lucide-react";
import {
  loginCustomer,
  registerCustomer,
  sendPasswordReset,
} from "@/lib/customer-auth";

type Mode = "login" | "register" | "reset";

type Props = {
  onSuccess?: () => void;
  initialMode?: Mode;
  compact?: boolean;
};

export default function CustomerAuthForm({
  onSuccess,
  initialMode = "login",
  compact = false,
}: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    if (mode === "login") {
      const r = await loginCustomer(email.trim(), password);
      if (r.ok) {
        onSuccess?.();
      } else {
        setError(translateAuthError(r.error));
      }
    } else if (mode === "register") {
      if (password.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres.");
        setSubmitting(false);
        return;
      }
      const r = await registerCustomer({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
      });
      if (r.ok) {
        // El trigger auto_confirm_user_email_trigger en Supabase confirma
        // el email automáticamente, así que el login posterior funciona.
        const auto = await loginCustomer(email.trim(), password);
        if (auto.ok) {
          onSuccess?.();
        } else {
          // Caso borde: signup OK pero login falla (probablemente porque el
          // email ya existía). El usuario va al modo login con el email
          // pre-rellenado.
          setInfo(
            "Cuenta creada. Inicia sesión con tu email y contraseña."
          );
          setMode("login");
        }
      } else {
        setError(translateAuthError(r.error));
      }
    } else {
      const r = await sendPasswordReset(email.trim());
      if (r.ok) {
        setInfo(
          "Te enviamos un correo con el enlace para restablecer tu contraseña."
        );
      } else {
        setError(translateAuthError(r.error));
      }
    }

    setSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`bg-white ${
        compact ? "rounded-2xl p-6" : "rounded-3xl p-7 md:p-9"
      } shadow-sm`}
    >
      <div className="mb-6">
        <h1
          className={`${
            compact ? "text-xl" : "text-2xl md:text-3xl"
          } font-bold tracking-tight text-neutral-900`}
        >
          {mode === "login"
            ? "Inicia sesión"
            : mode === "register"
            ? "Crea tu cuenta"
            : "Recuperar contraseña"}
        </h1>
        <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
          {mode === "login"
            ? "Accede a tus pedidos, direcciones y compras anteriores."
            : mode === "register"
            ? "Solo necesitas tu correo. Sin tarjeta, sin compromisos."
            : "Te enviamos un enlace para restablecerla."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <AnimatePresence initial={false}>
          {mode === "register" && (
            <motion.div
              key="register-fields"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden space-y-3"
            >
              <Field icon={<User size={13} aria-hidden />} label="Nombre completo">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={mode === "register"}
                  autoComplete="name"
                  placeholder="Juan Pérez"
                  className="w-full pl-9 pr-3 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
                />
              </Field>
              <Field
                icon={<Phone size={13} aria-hidden />}
                label="Teléfono (opcional)"
              >
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  placeholder="300 000 0000"
                  className="w-full pl-9 pr-3 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
                />
              </Field>
            </motion.div>
          )}
        </AnimatePresence>

        <Field icon={<Mail size={13} aria-hidden />} label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
            placeholder="tu@correo.com"
            className="w-full pl-9 pr-3 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
          />
        </Field>

        {mode !== "reset" && (
          <Field icon={<Lock size={13} aria-hidden />} label="Contraseña">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              placeholder="••••••••"
              className="w-full pl-9 pr-3 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
            />
            {mode === "register" && (
              <p className="text-[11px] text-neutral-400 mt-1.5">
                Mínimo 6 caracteres.
              </p>
            )}
          </Field>
        )}

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
            role="alert"
          >
            {error}
          </motion.p>
        )}
        {info && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2"
            role="status"
          >
            {info}
          </motion.p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#3B9DD8] hover:bg-[#2A84BE] text-white font-semibold py-3 rounded-xl text-sm transition active:scale-[0.98] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9DD8] focus-visible:ring-offset-2"
        >
          {submitting
            ? "Procesando…"
            : mode === "login"
            ? "Iniciar sesión"
            : mode === "register"
            ? "Crear cuenta"
            : "Enviar enlace"}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-neutral-100 text-center text-xs text-neutral-500 space-y-2">
        {mode === "login" && (
          <>
            <p>
              ¿No tienes cuenta?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
                className="font-semibold text-[#3B9DD8] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9DD8] rounded"
              >
                Regístrate
              </button>
            </p>
            <p>
              <button
                type="button"
                onClick={() => {
                  setMode("reset");
                  setError(null);
                }}
                className="text-neutral-400 hover:text-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9DD8] rounded"
              >
                Olvidé mi contraseña
              </button>
            </p>
          </>
        )}
        {mode === "register" && (
          <p>
            ¿Ya tienes cuenta?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className="font-semibold text-[#3B9DD8] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9DD8] rounded"
            >
              Inicia sesión
            </button>
          </p>
        )}
        {mode === "reset" && (
          <p>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className="font-semibold text-[#3B9DD8] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9DD8] rounded"
            >
              ← Volver a iniciar sesión
            </button>
          </p>
        )}
      </div>
    </motion.div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid") && m.includes("credentials"))
    return "Email o contraseña incorrectos.";
  if (
    m.includes("user already registered") ||
    m.includes("already") ||
    m.includes("exists")
  )
    return "Ya existe una cuenta con ese correo. Inicia sesión.";
  if (
    (m.includes("password") && m.includes("6")) ||
    m.includes("weak password")
  )
    return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("email_address_invalid") || m.includes("invalid email"))
    return "El correo no es válido. Usa un email real (gmail, hotmail, etc).";
  if (m.includes("rate limit"))
    return "Muchos intentos en poco tiempo. Espera un minuto y reintenta.";
  return message;
}
