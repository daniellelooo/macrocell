"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, ShoppingBag, Search, LayoutGrid, User } from "lucide-react";
import { useCartStore } from "@/lib/store";
import SearchModal from "@/components/SearchModal";

export default function BottomNav() {
  const pathname = usePathname();
  const toggleCart = useCartStore((s) => s.toggleCart);
  const itemCountRaw = useCartStore((s) => s.itemCount());
  const [searchOpen, setSearchOpen] = useState(false);
  // Evitar hydration mismatch (cart persiste en localStorage)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  const itemCount = mounted ? itemCountRaw : 0;

  // Ocultar la barra durante el checkout (compite con el formulario) y en /admin
  const hide =
    pathname?.startsWith("/checkout") || pathname?.startsWith("/admin");

  // Bloquear el scroll del body al abrir search ya lo maneja SearchModal
  useEffect(() => {
    /* noop — solo para asegurar que el componente queda listo en cliente */
  }, []);

  if (hide) return null;

  const isActive = (match: (p: string) => boolean) =>
    pathname ? match(pathname) : false;

  const items: {
    key: string;
    label: string;
    icon: React.ReactNode;
    onClick?: () => void;
    href?: string;
    target?: string;
    rel?: string;
    active?: boolean;
    badge?: number;
    accent?: boolean;
  }[] = [
    {
      key: "inicio",
      label: "Inicio",
      icon: <Home size={20} />,
      href: "/",
      active: isActive((p) => p === "/"),
    },
    {
      key: "catalogo",
      label: "Catálogo",
      icon: <LayoutGrid size={20} />,
      href: "/catalogo",
      active: isActive((p) => p.startsWith("/catalogo") || p.startsWith("/productos")),
    },
    {
      key: "buscar",
      label: "Buscar",
      icon: <Search size={20} />,
      onClick: () => setSearchOpen(true),
      active: isActive((p) => p.startsWith("/buscar")),
    },
    {
      key: "carrito",
      label: "Carrito",
      icon: <ShoppingBag size={20} />,
      onClick: toggleCart,
      active: isActive((p) => p.startsWith("/carrito")),
      badge: itemCount,
    },
    {
      key: "cuenta",
      label: "Cuenta",
      icon: <User size={20} />,
      href: "/cuenta",
      active: isActive((p) => p.startsWith("/cuenta")),
    },
  ];

  return (
    <>
      <nav
        className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 backdrop-blur-xl border-t border-neutral-200 pb-[env(safe-area-inset-bottom)]"
        aria-label="Navegación inferior"
      >
        <div className="flex items-stretch justify-between px-1">
          {items.map((item) => {
            const content = (
              <span
                className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 text-[10px] font-medium transition ${
                  item.accent
                    ? "text-[#25D366]"
                    : item.active
                    ? "text-[#3B9DD8]"
                    : "text-neutral-500"
                }`}
              >
                <span className="relative">
                  {item.icon}
                  {typeof item.badge === "number" && item.badge > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-[#3B9DD8] text-white text-[9px] font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </span>
                <span>{item.label}</span>
              </span>
            );

            if (item.href && !item.onClick) {
              return item.target ? (
                <a
                  key={item.key}
                  href={item.href}
                  target={item.target}
                  rel={item.rel}
                  className="flex-1 active:opacity-60 transition"
                >
                  {content}
                </a>
              ) : (
                <Link
                  key={item.key}
                  href={item.href}
                  className="flex-1 active:opacity-60 transition"
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={item.key}
                onClick={item.onClick}
                className="flex-1 active:opacity-60 transition"
                aria-label={item.label}
              >
                {content}
              </button>
            );
          })}
        </div>
      </nav>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
