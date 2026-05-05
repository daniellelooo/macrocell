"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Menu, X, Search, User, Heart, LayoutDashboard, Store as StoreIcon } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { useSiteConfigStore, getWhatsappUrl } from "@/lib/site-config-store";
import { useWishlistStore } from "@/lib/wishlist-store";
import SearchModal from "@/components/SearchModal";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type StaffSession = {
  role: "admin" | "vendedor" | "gestor_inventario";
  panelHref: string;
  panelLabel: string;
} | null;

const PANEL_FOR_ROLE: Record<string, { href: string; label: string }> = {
  admin: { href: "/admin/dashboard", label: "Panel Admin" },
  vendedor: { href: "/vendedor", label: "Panel Vendedor" },
  gestor_inventario: { href: "/admin/productos", label: "Panel Gestor" },
};

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const toggleCart = useCartStore((s) => s.toggleCart);
  const itemCountRaw = useCartStore((s) => s.itemCount());
  const wishlistCountRaw = useWishlistStore((s) => s.slugs.length);
  // Evitamos hydration mismatch: en SSR los stores con persist son 0,
  // pero localStorage en cliente puede tener valores. Renderizamos los
  // badges solo después del primer mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  const itemCount = mounted ? itemCountRaw : 0;
  const wishlistCount = mounted ? wishlistCountRaw : 0;
  const [staff, setStaff] = useState<StaffSession>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;
    const loadFromUserId = async (userId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      if (cancelled) return;
      const role = profile?.role;
      if (role && PANEL_FOR_ROLE[role]) {
        setStaff({
          role: role as "admin" | "vendedor" | "gestor_inventario",
          panelHref: PANEL_FOR_ROLE[role].href,
          panelLabel: PANEL_FOR_ROLE[role].label,
        });
      } else {
        setStaff(null);
      }
    };
    // getSession() lee de localStorage sin lock — no compite con otros consumidores.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user) loadFromUserId(session.user.id);
      else setStaff(null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_OUT") setStaff(null);
      else if (event === "SIGNED_IN" && session?.user) loadFromUserId(session.user.id);
      // TOKEN_REFRESHED y otros: no recargar; el rol no cambia entre refreshes.
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);
  const whatsappNumber = useSiteConfigStore((s) => s.whatsappNumber);
  const whatsappMsg = useSiteConfigStore((s) => s.whatsappDefaultMessage);
  const waUrl = getWhatsappUrl(whatsappNumber, whatsappMsg);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Atajo Cmd/Ctrl+K abre el buscador (estándar)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // El navbar público no aparece en /admin (tiene su propio shell)
  if (pathname?.startsWith("/admin")) return null;

  // La PriceTicker solo se muestra en / y /catalogo. En las demás rutas el
  // navbar debe ir pegado al top (top-0) para no dejar una franja vacía
  // por la que el contenido se vea al hacer scroll.
  const hasTickerSpace = pathname === "/" || pathname === "/catalogo";

  const navLinks = [
    { href: "/catalogo?cat=iphone", label: "iPhone" },
    { href: "/catalogo?cat=ipad", label: "iPad" },
    { href: "/catalogo?cat=watch", label: "Watch" },
    { href: "/catalogo?cat=accesorios", label: "Accesorios" },
    { href: "/#sedes", label: "Sedes" },
  ];

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed ${hasTickerSpace ? "top-8" : "top-0"} left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/85 backdrop-blur-2xl border-b border-neutral-200/60 shadow-sm"
            : "bg-white/60 backdrop-blur-xl"
        }`}
      >
        <nav className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 hover:opacity-85 transition-opacity"
          >
            <Image
              src="/macrocell-logo.jpg"
              alt="Macrocell"
              width={36}
              height={36}
              className="rounded-full object-cover"
            />
            <span className="text-lg font-bold tracking-tight text-neutral-900">
              Macrocell
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-1 md:gap-3">
            {/* Desktop: search pill */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100/80 hover:bg-neutral-200/70 transition-colors text-neutral-500 text-xs"
              aria-label="Buscar"
            >
              <Search size={14} />
              <span>Buscar…</span>
              <kbd className="bg-white/80 text-neutral-500 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                ⌘K
              </kbd>
            </button>

            {/* Desktop only: cuenta y favoritos */}
            <Link
              href="/cuenta"
              className="hidden md:flex p-2 rounded-full hover:bg-neutral-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9DD8]"
              aria-label="Mi cuenta"
              title="Mi cuenta"
            >
              <User size={20} className="text-neutral-700" />
            </Link>

            <Link
              href="/wishlist"
              className="hidden md:flex relative p-2 rounded-full hover:bg-neutral-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9DD8]"
              aria-label="Favoritos"
              title="Favoritos"
            >
              <Heart size={20} className="text-neutral-700" />
              <AnimatePresence>
                {wishlistCount > 0 && (
                  <motion.span
                    key="wish-badge"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-[#3B9DD8] text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] min-h-[18px] px-[3px]"
                  >
                    {wishlistCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            {/* Carrito — visible en todos los tamaños */}
            <button
              onClick={toggleCart}
              className="relative p-2 rounded-full hover:bg-neutral-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9DD8]"
              aria-label="Carrito"
            >
              <ShoppingBag size={20} className="text-neutral-700" />
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span
                    key="badge"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-[#3B9DD8] text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] min-h-[18px] px-[3px]"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Botón al panel del rol (solo si hay sesión staff) */}
            {staff && (
              <Link
                href={staff.panelHref}
                className="hidden md:flex items-center gap-1.5 bg-neutral-900 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-neutral-800 active:scale-95 transition-all duration-200"
                title={`Ir al ${staff.panelLabel.toLowerCase()}`}
              >
                {staff.role === "vendedor" ? <StoreIcon size={14} /> : <LayoutDashboard size={14} />}
                {staff.panelLabel}
              </Link>
            )}

            {/* Desktop: botón WhatsApp */}
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex bg-[#3B9DD8] text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-[#2A84BE] active:scale-95 transition-all duration-200"
            >
              WhatsApp
            </a>

            {/* Mobile: hamburger */}
            <button
              className="md:hidden p-2 rounded-full hover:bg-neutral-100 transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menú"
            >
              {mobileOpen ? (
                <X size={20} className="text-neutral-700" />
              ) : (
                <Menu size={20} className="text-neutral-700" />
              )}
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed top-24 inset-x-0 z-40 bg-white/95 backdrop-blur-2xl border-b border-neutral-200 shadow-lg md:hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="py-3 text-base font-medium text-neutral-800 border-b border-neutral-100 last:border-0"
                >
                  {link.label}
                </Link>
              ))}
              {staff && (
                <Link
                  href={staff.panelHref}
                  onClick={() => setMobileOpen(false)}
                  className="mt-3 bg-neutral-900 text-white px-5 py-3 rounded-full text-sm font-semibold text-center inline-flex items-center justify-center gap-1.5"
                >
                  {staff.role === "vendedor" ? <StoreIcon size={14} /> : <LayoutDashboard size={14} />}
                  {staff.panelLabel}
                </Link>
              )}
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${staff ? "mt-2" : "mt-3"} bg-[#3B9DD8] text-white px-5 py-3 rounded-full text-sm font-medium text-center`}
              >
                Contactar por WhatsApp
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
