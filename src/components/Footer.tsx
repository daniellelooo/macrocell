"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Phone } from "lucide-react";
import { useSiteConfigStore, getWhatsappUrl } from "@/lib/site-config-store";
import { CookiePreferencesLink } from "@/components/CookieBanner";

export default function Footer() {
  const pathname = usePathname();
  const sedes = useSiteConfigStore((s) => s.sedes);
  const whatsappNumber = useSiteConfigStore((s) => s.whatsappNumber);
  const instagramUrl = useSiteConfigStore((s) => s.instagramUrl);
  const hoursWeek = useSiteConfigStore((s) => s.hoursWeek);
  const hoursWeekend = useSiteConfigStore((s) => s.hoursWeekend);
  const waUrl = getWhatsappUrl(whatsappNumber);
  const waLabel = whatsappNumber.startsWith("57")
    ? `+${whatsappNumber.slice(0, 2)} ${whatsappNumber.slice(2, 5)} ${whatsappNumber.slice(5, 8)} ${whatsappNumber.slice(8)}`
    : whatsappNumber;
  const igHandle = (() => {
    try {
      const u = new URL(instagramUrl);
      return `@${u.pathname.replace(/\//g, "")}`;
    } catch {
      return "@macrocellm1";
    }
  })();

  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="bg-neutral-50 border-t border-neutral-200">
      <div className="max-w-7xl mx-auto px-5 md:px-12 py-10 md:py-16">

        {/* Top: brand + CTA */}
        <div className="flex items-center justify-between mb-8 md:hidden">
          <div className="flex items-center gap-2.5">
            <Image
              src="/macrocell-logo.jpg"
              alt="Macrocell"
              width={38}
              height={38}
              className="rounded-full object-cover"
            />
            <span className="font-bold text-neutral-900 text-base">Macrocell</span>
          </div>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-[#3B9DD8] text-white px-4 py-2 rounded-full text-xs font-semibold"
          >
            <Phone size={12} />
            WhatsApp
          </a>
        </div>

        {/* Desktop grid */}
        <div className="hidden md:grid md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/macrocell-logo.jpg"
                alt="Macrocell"
                width={44}
                height={44}
                className="rounded-full object-cover"
              />
              <h3 className="text-lg font-bold text-neutral-900 tracking-tight">
                Macrocell
              </h3>
            </div>
            <p className="text-sm text-neutral-500 max-w-xs leading-relaxed mb-5">
              Los mejores precios en smartphones y accesorios en Colombia. Garantía oficial,
              crédito disponible y envíos a todo el país.
            </p>
            <div className="flex flex-col gap-2 mb-5">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                <Phone size={14} className="text-[#3B9DD8]" />
                {waLabel}
              </a>
            </div>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-neutral-600 hover:text-[#3B9DD8] transition-colors font-medium"
            >
              {igHandle}
            </a>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-neutral-900 mb-4">Productos</h4>
            <ul className="space-y-2">
              {["iPhone", "iPad", "Apple Watch", "MacBook", "Accesorios"].map((item) => (
                <li key={item}>
                  <Link
                    href={`/catalogo?cat=${item.toLowerCase().replace(" ", "")}`}
                    className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-neutral-900 mb-4">Nuestras Sedes</h4>
            <ul className="space-y-3">
              {sedes.map((sede) => (
                <li key={sede.id} className="flex items-start gap-2">
                  <MapPin size={13} className="text-[#3B9DD8] mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs text-neutral-700 block leading-snug">
                      {sede.name}
                      {sede.detail ? ` – ${sede.detail}` : ""}
                    </span>
                    <span className="text-xs text-neutral-500">{sede.area}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Mobile: compact links + sedes */}
        <div className="md:hidden">
          {/* Quick links */}
          <div className="flex flex-wrap gap-3 mb-6">
            {["iPhone", "iPad", "Watch", "MacBook", "Accesorios"].map((item) => (
              <Link
                key={item}
                href={`/catalogo?cat=${item.toLowerCase().replace(" ", "")}`}
                className="text-xs font-medium text-neutral-600 bg-neutral-100 px-3 py-1.5 rounded-full"
              >
                {item}
              </Link>
            ))}
          </div>

          {/* Sedes compact */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {sedes.map((sede) => (
              <div key={sede.id} className="flex items-start gap-1.5 bg-white rounded-xl p-3 border border-neutral-100">
                <MapPin size={12} className="text-[#3B9DD8] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[11px] font-semibold text-neutral-800 leading-tight">
                    {sede.name}
                    {sede.detail ? ` – ${sede.detail}` : ""}
                  </p>
                  <p className="text-[10px] text-neutral-500">{sede.area}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-neutral-400 mb-2">
            {hoursWeek} · {hoursWeekend}
          </p>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-neutral-200 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-xs text-neutral-400">
            © {new Date().getFullYear()} Macrocell. Todos los derechos reservados.
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center md:justify-end">
            <Link href="/faqs" className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors">FAQs</Link>
            <Link href="/wishlist" className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors">Favoritos</Link>
            <Link href="/cuenta" className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors">Mi cuenta</Link>
            <Link href="/catalogo" className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors">Catálogo</Link>
            <Link href="/privacidad" className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors">Privacidad</Link>
            <Link href="/terminos" className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors">Términos</Link>
            <CookiePreferencesLink className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors text-left" />
          </div>
        </div>
      </div>
    </footer>
  );
}
