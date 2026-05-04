"use client";

import { usePathname } from "next/navigation";
import { useSiteConfigStore } from "@/lib/site-config-store";
import { useCartStore } from "@/lib/store";

const SEPARATOR = "·";

export default function PriceTicker() {
  const pathname = usePathname();
  const items = useSiteConfigStore((s) => s.bannerItems);
  const enabled = useSiteConfigStore((s) => s.bannerEnabled);
  const cartOpen = useCartStore((s) => s.isOpen);

  const allowed = pathname === "/" || pathname === "/catalogo";
  if (!allowed) return null;
  if (!enabled || items.length === 0) return null;
  if (cartOpen) return null;

  const content = items.join(`   ${SEPARATOR}   `);
  const doubled = `${content}   ${SEPARATOR}   ${content}   ${SEPARATOR}   `;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-8 bg-[#3B9DD8] flex items-center overflow-hidden">
      <div className="flex whitespace-nowrap animate-marquee text-white text-xs font-semibold tracking-wide select-none">
        <span className="pr-8">{doubled}</span>
        <span className="pr-8" aria-hidden="true">
          {doubled}
        </span>
      </div>
    </div>
  );
}
