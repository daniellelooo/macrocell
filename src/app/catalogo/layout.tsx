import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    "Explora iPhone, iPad, Apple Watch, MacBook y accesorios en Macrocell. Filtra por condición, precio, storage y color. Envíos a toda Colombia.",
  alternates: { canonical: "/catalogo" },
  openGraph: {
    title: "Catálogo Apple | Macrocell",
    description:
      "iPhone nuevos, de exhibición, open box y AS-IS al mejor precio en Medellín. Garantía oficial y envíos gratis.",
  },
};

export default function CatalogoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
