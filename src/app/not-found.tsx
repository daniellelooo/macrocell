"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, Search, ShoppingBag } from "lucide-react";
import { useSiteConfigStore, getWhatsappUrl } from "@/lib/site-config-store";

export default function NotFound() {
  const { whatsappNumber, whatsappDefaultMessage } = useSiteConfigStore();
  const waUrl = getWhatsappUrl(whatsappNumber, whatsappDefaultMessage);

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-xl w-full text-center"
      >
        {/* Ilustración: 404 grande con tornillo de iPhone */}
        <div className="relative mb-10 select-none">
          <motion.p
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-[8rem] md:text-[11rem] font-bold tracking-tighter text-neutral-200 leading-none"
          >
            404
          </motion.p>
          <motion.div
            initial={{ y: -10, rotate: -8, opacity: 0 }}
            animate={{ y: 0, rotate: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="bg-[#3B9DD8] text-white text-xs md:text-sm font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
              Página agotada
            </div>
          </motion.div>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.45 }}
          className="text-2xl md:text-4xl font-bold tracking-tight text-neutral-900 mb-3"
        >
          Esta página no la tenemos en stock
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.55 }}
          className="text-neutral-500 text-sm md:text-base mb-10 max-w-md mx-auto leading-relaxed"
        >
          La URL que buscas no existe o el producto se quedó sin existencias.
          Mira el catálogo, búscanos por modelo o escríbenos por WhatsApp.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.65 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto mb-8"
        >
          <Link
            href="/"
            className="flex items-center justify-center gap-2 bg-white border border-neutral-200 text-neutral-800 px-5 py-3 rounded-2xl text-sm font-semibold hover:border-neutral-400 transition-all active:scale-95"
          >
            <Home size={16} />
            Inicio
          </Link>
          <Link
            href="/catalogo"
            className="flex items-center justify-center gap-2 bg-[#3B9DD8] text-white px-5 py-3 rounded-2xl text-sm font-semibold hover:bg-[#2A84BE] transition-all active:scale-95"
          >
            <ShoppingBag size={16} />
            Ver catálogo
          </Link>
          <Link
            href="/buscar"
            className="flex items-center justify-center gap-2 bg-white border border-neutral-200 text-neutral-800 px-5 py-3 rounded-2xl text-sm font-semibold hover:border-neutral-400 transition-all active:scale-95"
          >
            <Search size={16} />
            Buscar
          </Link>
        </motion.div>

        <motion.a
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.85 }}
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[#25D366] font-semibold hover:underline"
        >
          ¿No encuentras tu modelo? Escríbenos por WhatsApp →
        </motion.a>
      </motion.div>
    </div>
  );
}
