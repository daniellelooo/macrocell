import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import PriceTicker from "@/components/PriceTicker";
import BottomNav from "@/components/BottomNav";
import { Suspense } from "react";
import CatalogHydrator from "@/components/CatalogHydrator";
import MarketingPixels from "@/components/MarketingPixels";
import CookieBanner from "@/components/CookieBanner";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const SITE_URL = "https://macrocell.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Macrocell | Smartphones y accesorios al mejor precio",
    template: "%s | Macrocell",
  },
  description:
    "Los mejores precios en smartphones y accesorios en Colombia. Garantía oficial, crédito disponible y envíos gratis a todo el país.",
  keywords: [
    "smartphones Colombia precios baratos",
    "comprar iPhone Colombia",
    "mejor precio celular Colombia",
    "Macrocell",
    "accesorios celular Colombia",
    "celulares crédito Colombia",
  ],
  authors: [{ name: "Macrocell" }],
  creator: "Macrocell",
  openGraph: {
    type: "website",
    siteName: "Macrocell",
    locale: "es_CO",
    url: SITE_URL,
    title: "Macrocell | Smartphones y accesorios al mejor precio",
    description:
      "Los mejores precios en smartphones y accesorios en Colombia. Garantía oficial, crédito disponible y envíos a todo el país.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Macrocell | Smartphones al mejor precio",
    description:
      "Los mejores precios en smartphones y accesorios en Colombia.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: "Macrocell",
  description: "Tienda especializada en smartphones y accesorios en Colombia.",
  url: SITE_URL,
  telephone: "",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Medellín",
    addressRegion: "Antioquia",
    addressCountry: "CO",
  },
  sameAs: ["https://www.instagram.com/macrocellm1"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={outfit.variable} suppressHydrationWarning>
      <body
        className="min-h-screen bg-[#f9f9f9] text-neutral-900 antialiased pb-[68px] md:pb-0"
        suppressHydrationWarning
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <CatalogHydrator />
        <Suspense fallback={null}>
          <MarketingPixels />
        </Suspense>
        <PriceTicker />
        <Navbar />
        <CartDrawer />
        <main>{children}</main>
        <Footer />
        <BottomNav />
        <CookieBanner />
      </body>
    </html>
  );
}
