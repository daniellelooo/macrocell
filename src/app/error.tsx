"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    // En producción se conectaría a Sentry/Vercel Analytics; por ahora consola.
    console.error("[error.tsx]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center px-6 py-24">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={28} className="text-[#3B9DD8]" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 mb-3">
          Algo se cayó
        </h1>
        <p className="text-neutral-500 text-sm mb-8 leading-relaxed">
          Tuvimos un problema cargando esta sección. Reintenta en un segundo o
          vuelve al inicio. Si pasa de nuevo, escríbenos por WhatsApp.
        </p>
        {error.digest && (
          <p className="text-[11px] text-neutral-400 mb-6 font-mono">
            ref: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 bg-[#3B9DD8] text-white px-6 py-3 rounded-2xl text-sm font-semibold hover:bg-[#2A84BE] transition-all active:scale-95"
          >
            <RotateCcw size={15} />
            Reintentar
          </button>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 bg-white border border-neutral-200 text-neutral-800 px-6 py-3 rounded-2xl text-sm font-semibold hover:border-neutral-400 transition-all active:scale-95"
          >
            <Home size={15} />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
