import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const SITE_URL = "https://macrocell.vercel.app";

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: product } = await supabase
      .from("products")
      .select("name, short_description, image, category")
      .eq("slug", slug)
      .single();

    if (!product) throw new Error("not found");

    const categoryLabel: Record<string, string> = {
      iphone: "iPhone",
      ipad: "iPad",
      watch: "Apple Watch",
      macbook: "MacBook",
      accesorios: "Accesorios Apple",
    };
    const cat = categoryLabel[product.category] ?? "Apple";
    const title = `${product.name} — precio en Medellín`;
    const description = product.short_description
      ? `${product.short_description}. Compra ${product.name} con garantía oficial en Macrocell. Envíos a toda Colombia.`
      : `Compra ${product.name} (${cat}) con garantía oficial en Macrocell. Envíos gratis a toda Colombia.`;

    return {
      title,
      description,
      alternates: { canonical: `${SITE_URL}/productos/${slug}` },
      openGraph: {
        title,
        description,
        url: `${SITE_URL}/productos/${slug}`,
        images: product.image ? [{ url: product.image, alt: product.name }] : [],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: product.image ? [product.image] : [],
      },
    };
  } catch {
    return {
      title: "Producto | Macrocell",
      description: "Productos Apple al mejor precio en Medellín.",
    };
  }
}

export default function ProductSlugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
