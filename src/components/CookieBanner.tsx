"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X } from "lucide-react";

const STORAGE_KEY = "macrocell-cookie-consent-v1";
const CONSENT_EVENT = "macrocell:cookie-consent-changed";

export type ConsentStatus = "granted" | "denied" | "unknown";

/** Lee el estado actual de consentimiento (o "unknown" si nunca eligió). */
export function getCookieConsent(): ConsentStatus {
  if (typeof window === "undefined") return "unknown";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "granted" || v === "denied") return v;
  } catch {
    /* ignore */
  }
  return "unknown";
}

/** Suscribe a cambios de consent. Devuelve función de unsubscribe. */
export function onConsentChange(cb: (status: ConsentStatus) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb(getCookieConsent());
  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}

function setConsent(status: ConsentStatus) {
  try {
    localStorage.setItem(STORAGE_KEY, status);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

/**
 * Banner de consentimiento de cookies (Ley 1581 + 1266 Colombia).
 *
 * Bloquea la carga de Meta Pixel y GA4 hasta que el usuario acepta.
 * Persiste la decisión en localStorage. El usuario puede cambiar de
 * opinión desde el footer (link "Cookies").
 */
export default function CookieBanner() {
  const [status, setStatus] = useState<ConsentStatus>("unknown");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(getCookieConsent());
    return onConsentChange(setStatus);
  }, []);

  // Mientras no monte (SSR), no renderizamos nada → sin hydration mismatch.
  if (!mounted) return null;

  // Si ya eligió, no mostramos el banner.
  if (status !== "unknown") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="fixed left-3 right-3 md:left-6 md:right-6 z-[60] bottom-[80px] md:bottom-6"
      >
        <div className="bg-neutral-900 text-white rounded-2xl shadow-2xl max-w-3xl mx-auto p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-start md:items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Cookie size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold mb-0.5">
                  Usamos cookies para mejorar tu experiencia
                </p>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Cookies analíticas y de marketing nos ayudan a entender
                  qué te interesa y a mostrarte mejores ofertas. Podés
                  rechazarlas y la tienda funciona igual.{" "}
                  <Link
                    href="/privacidad"
                    className="underline hover:text-white"
                  >
                    Política de privacidad
                  </Link>
                  .
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setConsent("denied")}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/10 transition border border-white/20"
              >
                Rechazar
              </button>
              <button
                onClick={() => setConsent("granted")}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-white text-neutral-900 hover:bg-neutral-200 transition"
              >
                Aceptar todo
              </button>
            </div>
          </div>
          <button
            onClick={() => setConsent("denied")}
            className="absolute top-3 right-3 md:hidden text-neutral-500 hover:text-white"
            aria-label="Cerrar (rechaza por defecto)"
          >
            <X size={16} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Botón mini para cambiar consent desde el footer
 * (cumple el requisito legal de poder revocar).
 */
export function CookiePreferencesLink({
  className = "",
}: {
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        window.dispatchEvent(new Event(CONSENT_EVENT));
      }}
      className={className}
    >
      Preferencias de cookies
    </button>
  );
}
