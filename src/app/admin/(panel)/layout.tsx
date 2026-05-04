"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Box,
  ExternalLink,
  FileBarChart,
  LogOut,
  MapPin,
  Settings,
  Sparkles,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
  UserCog,
  Menu,
  X,
} from "lucide-react";
import { logout } from "@/lib/admin-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSiteConfigStore } from "@/lib/site-config-store";

type NavItem = { href: string; label: string; icon: React.ElementType; badgeKey?: string };

const NAV_ADMIN: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard web", icon: BarChart3 },
  { href: "/admin/ventas-local", label: "Ventas local", icon: Store },
  { href: "/admin/reportes", label: "Reportes", icon: FileBarChart },
  { href: "/admin/productos", label: "Productos", icon: Box, badgeKey: "lowStock" },
  { href: "/admin/ordenes", label: "Pedidos", icon: ShoppingBag, badgeKey: "pending" },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/usuarios", label: "Equipo", icon: UserCog },
  { href: "/admin/promociones", label: "Promociones", icon: Sparkles },
  { href: "/admin/sedes", label: "Sedes", icon: MapPin },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

const NAV_GESTOR: NavItem[] = [
  { href: "/admin/productos", label: "Productos", icon: Box },
  { href: "/admin/ordenes", label: "Pedidos", icon: ShoppingBag },
];

const NAV_VENDEDOR: NavItem[] = [
  { href: "/admin/mis-ventas", label: "Mis ventas", icon: TrendingUp },
];

const PANEL_LABELS: Record<string, string> = {
  admin: "Admin",
  gestor_inventario: "Gestor",
  vendedor: "Vendedor",
};

function navForRole(role: string): NavItem[] {
  if (role === "admin") return NAV_ADMIN;
  if (role === "gestor_inventario") return NAV_GESTOR;
  if (role === "vendedor") return NAV_VENDEDOR;
  return [];
}

/** Rutas permitidas que no aparecen en el sidebar pero a las que el rol puede acceder. */
const EXTRA_ALLOWED: Record<string, string[]> = {
  admin: ["/admin/vendedor"],
};

function defaultRouteForRole(role: string): string {
  if (role === "vendedor") return "/admin/mis-ventas";
  if (role === "gestor_inventario") return "/admin/productos";
  return "/admin/dashboard";
}

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<string>("admin");
  const [displayName, setDisplayName] = useState<string>("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({});
  const lowStockThreshold = useSiteConfigStore((s) => s.stockLowThreshold);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;

    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!sessionData.session) {
        router.replace("/admin");
        setAuthChecked(true);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", sessionData.session.user.id)
        .single();

      if (cancelled) return;

      const userRole = profile?.role ?? "cliente";

      if (userRole === "cliente" || !profile) {
        router.replace("/");
        setAuthChecked(true);
        return;
      }

      setRole(userRole);
      setDisplayName(profile.full_name ?? sessionData.session.user.email ?? "");
      setAuthed(true);
      setAuthChecked(true);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (!session) {
        setAuthed(false);
        router.replace("/admin");
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  // Carga periódica de badges (stock crítico + pedidos pendientes)
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();
    const load = async () => {
      const [variantsRes, pendingRes] = await Promise.all([
        supabase
          .from("variants")
          .select("stock_quantity, in_stock", { count: "exact", head: false })
          .lte("stock_quantity", lowStockThreshold),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .neq("payment_provider", "local"),
      ]);
      if (cancelled) return;
      setBadges({
        lowStock: variantsRes.data?.length ?? 0,
        pending: pendingRes.count ?? 0,
      });
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [authed, lowStockThreshold]);

  // Route protection: redirect to role's default if on unauthorized route
  useEffect(() => {
    if (!authed || !pathname) return;
    const nav = navForRole(role);
    const extras = EXTRA_ALLOWED[role] ?? [];
    const allowed =
      nav.some(
        (item) => pathname === item.href || pathname.startsWith(item.href + "/")
      ) ||
      extras.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
      );
    if (!allowed) {
      router.replace(defaultRouteForRole(role));
    }
  }, [authed, role, pathname, router]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      window.location.href = "/admin";
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0C1014] flex items-center justify-center text-neutral-500 text-sm">
        Verificando sesión…
      </div>
    );
  }

  if (!authed) return null;

  const nav = navForRole(role);
  const panelLabel = PANEL_LABELS[role] ?? "Panel";

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex">
      {/* Sidebar */}
      <aside
        className={`fixed md:sticky md:top-0 md:h-screen z-40 inset-y-0 left-0 w-64 bg-[#0C1014] text-white flex flex-col transform transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-5 flex items-center gap-3 border-b border-white/10">
          <Image
            src="/macrocell-logo.jpg"
            alt="Macrocell"
            width={36}
            height={36}
            className="rounded-full object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
              {panelLabel}
            </p>
            <p className="text-sm font-bold truncate">
              {displayName || "Macrocell"}
            </p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 rounded-full hover:bg-white/10"
            aria-label="Cerrar menú"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  active
                    ? "bg-[#3B9DD8] text-white shadow-md"
                    : "text-neutral-300 hover:bg-white/5"
                }`}
              >
                <Icon size={15} />
                <span className="flex-1">{item.label}</span>
                {item.badgeKey && badges[item.badgeKey] > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      active
                        ? "bg-white/30 text-white"
                        : "bg-amber-500 text-white"
                    }`}
                  >
                    {badges[item.badgeKey]}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 space-y-1 border-t border-white/10">
          {role !== "vendedor" && (
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-400 hover:bg-white/5 transition"
            >
              <ExternalLink size={15} />
              Ver tienda pública
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-400 hover:bg-white/5 transition"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Overlay móvil */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 z-30 bg-black/40"
          aria-hidden
        />
      )}

      {/* Contenido */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-full hover:bg-neutral-100"
            aria-label="Abrir menú"
          >
            <Menu size={18} />
          </button>
          <p className="text-sm font-semibold">Macrocell {panelLabel}</p>
          {role !== "vendedor" ? (
            <Link
              href="/"
              target="_blank"
              className="p-2 rounded-full hover:bg-neutral-100"
              aria-label="Ver tienda"
            >
              <ExternalLink size={16} />
            </Link>
          ) : (
            <div className="w-9" />
          )}
        </header>

        <main className="flex-1 p-5 md:p-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
