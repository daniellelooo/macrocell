"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Clock, Search, Sparkles, X } from "lucide-react";
import { formatPrice, getMinPrice, hasMultipleVariants } from "@/lib/products";
import { useCatalogStore } from "@/lib/catalog-store";

const RECENT_KEY = "macrocell:recent-searches";
const MAX_RECENT = 5;
const POPULAR = ["iPhone 16", "iPhone 14", "iPad A16", "MacBook Air M5", "AirPods 4"];

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function SearchModal({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const products = useCatalogStore((s) => s.products);

  // Reset query cuando el modal se abre — patrón "derivar state de props" en React 19
  // (sin setState en effect; React lo detecta y rerendea sincrónicamente).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setQuery("");
  }

  // Focus al abrir (no es state, sí va en effect)
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // Bloquear scroll + Escape para cerrar
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return [];
    return products
      .filter((p) => {
        const haystack = [p.name, p.shortDescription, p.family, p.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 6);
  }, [products, query]);

  const persistRecent = (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 2) return;
    const next = [trimmed, ...recent.filter((r) => r !== trimmed)].slice(0, MAX_RECENT);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
  };

  const submit = (term: string) => {
    persistRecent(term);
    onClose();
    router.push(`/buscar?q=${encodeURIComponent(term)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length === 0) return;
    submit(query);
  };

  const clearRecent = () => {
    setRecent([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      /* noop */
    }
  };

  // Resaltar coincidencia en el nombre
  const highlight = (text: string) => {
    const q = query.trim();
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-100 text-neutral-900 px-0.5 rounded">
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="search-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[8vh] px-4"
          onClick={onClose}
        >
          <motion.div
            key="search-panel"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit} className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100">
              <Search size={18} className="text-neutral-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Busca tu iPhone, iPad, MacBook…"
                className="flex-1 bg-transparent outline-none text-base text-neutral-900 placeholder-neutral-400"
                aria-label="Búsqueda"
              />
              {query.length > 0 && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="p-1 rounded-full hover:bg-neutral-100 transition"
                  aria-label="Limpiar"
                >
                  <X size={14} className="text-neutral-400" />
                </button>
              )}
              <kbd className="hidden md:inline-block bg-neutral-100 text-neutral-500 text-[10px] font-semibold px-2 py-1 rounded-md">
                ESC
              </kbd>
            </form>

            <div className="max-h-[60vh] overflow-y-auto">
              {/* Resultados de búsqueda */}
              {query.trim().length > 0 ? (
                results.length > 0 ? (
                  <div className="py-2">
                    {results.map((p) => (
                      <Link
                        key={p.id}
                        href={`/productos/${p.slug}`}
                        onClick={() => {
                          persistRecent(query);
                          onClose();
                        }}
                        className="flex items-center gap-4 px-5 py-3 hover:bg-neutral-50 transition-colors group"
                      >
                        <div className="relative w-12 h-12 bg-neutral-50 rounded-xl flex items-center justify-center overflow-hidden p-1.5 shrink-0">
                          <Image
                            src={p.image}
                            alt={p.name}
                            fill
                            className="object-contain p-1"
                            unoptimized
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 truncate">
                            {highlight(p.name)}
                          </p>
                          <p className="text-xs text-neutral-500 truncate">
                            {p.shortDescription}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-neutral-900">
                            {hasMultipleVariants(p) && (
                              <span className="text-[10px] font-medium text-neutral-400 mr-1">
                                Desde
                              </span>
                            )}
                            {formatPrice(getMinPrice(p))}
                          </p>
                        </div>
                        <ArrowRight
                          size={14}
                          className="text-neutral-300 group-hover:text-[#3B9DD8] group-hover:translate-x-0.5 transition-all"
                        />
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={() => submit(query)}
                      className="w-full text-left px-5 py-3 text-sm font-semibold text-[#3B9DD8] hover:bg-neutral-50 border-t border-neutral-100 transition flex items-center justify-between"
                    >
                      Ver todos los resultados para &ldquo;{query}&rdquo;
                      <ArrowRight size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="py-12 text-center px-5">
                    <p className="text-sm font-semibold text-neutral-700 mb-1">
                      Sin resultados
                    </p>
                    <p className="text-xs text-neutral-500">
                      Intenta con &ldquo;iPhone&rdquo;, &ldquo;MacBook&rdquo; o
                      escríbenos por WhatsApp.
                    </p>
                  </div>
                )
              ) : (
                /* Estado vacío: recientes + populares */
                <div className="py-3">
                  {recent.length > 0 && (
                    <div className="px-5 pt-3 pb-2">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                          <Clock size={11} /> Recientes
                        </p>
                        <button
                          type="button"
                          onClick={clearRecent}
                          className="text-[11px] text-neutral-400 hover:text-neutral-700 transition"
                        >
                          Limpiar
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recent.map((term) => (
                          <button
                            key={term}
                            type="button"
                            onClick={() => submit(term)}
                            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs px-3 py-1.5 rounded-full transition"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="px-5 pt-3 pb-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 mb-2">
                      <Sparkles size={11} /> Búsquedas populares
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => submit(term)}
                          className="bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs px-3 py-1.5 rounded-full transition"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
