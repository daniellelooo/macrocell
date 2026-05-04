"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { categories, getMinPrice } from "@/lib/products";
import { useCatalogStore } from "@/lib/catalog-store";

function BuscarContent() {
  const params = useSearchParams();
  const router = useRouter();
  const initialQ = params.get("q") ?? "";
  const products = useCatalogStore((s) => s.products);
  const [query, setQuery] = useState(initialQ);
  const [activeCategory, setActiveCategory] = useState("todos");
  const [sortBy, setSortBy] = useState("relevance");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = products;
    if (q.length > 0) {
      list = list.filter((p) => {
        const haystack = [
          p.name,
          p.shortDescription,
          p.description,
          p.family,
          p.category,
          ...p.features,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    if (activeCategory !== "todos") {
      list = list.filter((p) => p.category === activeCategory);
    }
    list = [...list].sort((a, b) => {
      if (sortBy === "price-asc") return getMinPrice(a) - getMinPrice(b);
      if (sortBy === "price-desc") return getMinPrice(b) - getMinPrice(a);
      // relevance: prioriza coincidencia exacta del nombre
      if (q.length === 0) return 0;
      const aExact = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bExact = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      return aExact - bExact;
    });
    return list;
  }, [products, query, activeCategory, sortBy]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    const url = q.length > 0 ? `/buscar?q=${encodeURIComponent(q)}` : "/buscar";
    router.replace(url);
  };

  return (
    <>
      <section className="pt-28 pb-6 px-5 md:px-12 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-neutral-900 mb-2">
              {query ? `Resultados para "${query}"` : "Buscar"}
            </h1>
            <p className="text-sm md:text-base text-neutral-500 mb-6">
              {query
                ? `${results.length} producto${results.length === 1 ? "" : "s"} encontrado${results.length === 1 ? "" : "s"}`
                : "Encuentra tu próximo iPhone, iPad, MacBook o accesorio."}
            </p>

            <form onSubmit={handleSubmit} className="relative max-w-2xl">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="iPhone 16, MacBook Air, AirPods…"
                className="w-full pl-11 pr-12 py-3.5 bg-neutral-100 rounded-2xl text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30"
                autoFocus={!initialQ}
              />
              {query.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    router.replace("/buscar");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-neutral-200 transition"
                  aria-label="Limpiar búsqueda"
                >
                  <X size={14} className="text-neutral-500" />
                </button>
              )}
            </form>
          </motion.div>
        </div>
      </section>

      {/* Filtros */}
      <section className="sticky top-[96px] z-30 bg-white/90 backdrop-blur-xl border-b border-neutral-100 px-5 md:px-12 py-3">
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? "bg-neutral-900 text-white shadow-sm"
                    : "bg-neutral-100 text-neutral-600 active:bg-neutral-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="ml-auto appearance-none bg-neutral-100 text-neutral-700 text-xs py-1.5 pl-3 pr-7 rounded-full focus:outline-none focus:ring-2 focus:ring-[#3B9DD8]/30 shrink-0"
            >
              <option value="relevance">Relevancia</option>
              <option value="price-asc">Menor precio</option>
              <option value="price-desc">Mayor precio</option>
            </select>
          </div>
        </div>
      </section>

      {/* Resultados */}
      <section className="py-8 px-5 md:px-12 bg-[#F5F5F7] min-h-[60vh]">
        <div className="max-w-7xl mx-auto">
          {results.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-5">
                <Search size={22} className="text-neutral-300" />
              </div>
              <p className="text-lg font-semibold text-neutral-700 mb-2">
                {query
                  ? `No encontramos productos para "${query}"`
                  : "Empieza a escribir para ver resultados"}
              </p>
              <p className="text-sm text-neutral-400 mb-6 max-w-sm mx-auto">
                Prueba con otro modelo o escríbenos por WhatsApp y te
                conseguimos lo que buscas.
              </p>
              {query && (
                <a
                  href={`https://wa.me/573148941200?text=${encodeURIComponent(
                    `Hola, busco un ${query} pero no apareció en la web. ¿Tienen disponibilidad?`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-[#25D366] text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-[#1ebe5d] transition"
                >
                  Pregúntanos por WhatsApp
                </a>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-8 md:gap-y-12">
              {results.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default function BuscarPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-32 px-5 text-center text-neutral-400 text-sm">
          Cargando…
        </div>
      }
    >
      <BuscarContent />
    </Suspense>
  );
}
