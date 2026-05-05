import type { Database } from "@/lib/database.types";
import {
  toImageObject,
  type Product,
  type ProductCategory,
  type ProductCondition,
  type Variant,
} from "@/lib/products";
import type { Sede, SiteConfig } from "@/lib/site-config-store";
import { DEFAULT_SITE_CONFIG } from "@/lib/site-config-store";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type VariantRow = Database["public"]["Tables"]["variants"]["Row"];
type ImageRow = Database["public"]["Tables"]["product_images"]["Row"];
type SedeRow = Database["public"]["Tables"]["sedes"]["Row"];
type ConfigRow = Database["public"]["Tables"]["site_config"]["Row"];

export function rowToVariant(v: VariantRow): Variant {
  return {
    sku: v.sku,
    storage: v.storage ?? undefined,
    ram: v.ram ?? undefined,
    size: v.size ?? undefined,
    color: v.color ?? undefined,
    condition: v.condition as ProductCondition,
    price: v.price_cop,
    notes: v.notes ?? undefined,
    inStock: v.in_stock,
    stockQuantity: v.stock_quantity ?? (v.in_stock ? 1 : 0),
    commissionPct: v.commission_pct ?? 0,
    batteryHealth: v.battery_health ?? undefined,
    conditionDetails: v.condition_details ?? undefined,
  };
}

export function rowToProduct(
  p: ProductRow,
  variants: VariantRow[],
  images: ImageRow[]
): Product {
  const sortedVariants = [...variants].sort((a, b) => a.sort_order - b.sort_order);
  const sortedImages = [...images].sort((a, b) => a.position - b.position);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category as ProductCategory,
    family: p.family ?? undefined,
    description: p.description,
    shortDescription: p.short_description,
    image: p.image,
    images: sortedImages.map((i) =>
      i.color ? { url: i.url, color: i.color } : i.url
    ),
    colors: (p.colors as { name: string; hex: string }[]) ?? [],
    features: (p.features as string[]) ?? [],
    variants: sortedVariants.map(rowToVariant),
    isFeatured: p.is_featured,
    isNew: p.is_new,
    badge: p.badge ?? undefined,
  };
}

export function rowToSede(s: SedeRow): Sede {
  return {
    id: s.id,
    name: s.name,
    area: s.area,
    detail: s.detail,
  };
}

export function configRowsToSiteConfig(
  rows: ConfigRow[],
  sedes: Sede[]
): SiteConfig {
  const map = new Map<string, unknown>();
  rows.forEach((r) => map.set(r.key, r.value));
  const get = <T>(key: string, fallback: T): T =>
    (map.has(key) ? (map.get(key) as T) : fallback);
  return {
    whatsappNumber: get("whatsapp_number", DEFAULT_SITE_CONFIG.whatsappNumber),
    whatsappDefaultMessage: get(
      "whatsapp_default_message",
      DEFAULT_SITE_CONFIG.whatsappDefaultMessage
    ),
    instagramUrl: get("instagram_url", DEFAULT_SITE_CONFIG.instagramUrl),
    tiktokUrl: get("tiktok_url", DEFAULT_SITE_CONFIG.tiktokUrl),
    facebookUrl: get("facebook_url", DEFAULT_SITE_CONFIG.facebookUrl),
    bannerEnabled: get("banner_enabled", DEFAULT_SITE_CONFIG.bannerEnabled),
    bannerItems: get("banner_items", DEFAULT_SITE_CONFIG.bannerItems),
    hoursWeek: get("hours_week", DEFAULT_SITE_CONFIG.hoursWeek),
    hoursWeekend: get("hours_weekend", DEFAULT_SITE_CONFIG.hoursWeekend),
    heroImagesDesktop: get(
      "hero_images_desktop",
      DEFAULT_SITE_CONFIG.heroImagesDesktop
    ),
    heroImagesMobile: get(
      "hero_images_mobile",
      DEFAULT_SITE_CONFIG.heroImagesMobile
    ),
    heroTitle: get("hero_title", DEFAULT_SITE_CONFIG.heroTitle),
    heroSubtitle: get("hero_subtitle", DEFAULT_SITE_CONFIG.heroSubtitle),
    seoTitle: get("seo_title", DEFAULT_SITE_CONFIG.seoTitle),
    seoDescription: get("seo_description", DEFAULT_SITE_CONFIG.seoDescription),
    ogImageUrl: get("og_image_url", DEFAULT_SITE_CONFIG.ogImageUrl),
    metaPixelId: get("meta_pixel_id", DEFAULT_SITE_CONFIG.metaPixelId),
    gaMeasurementId: get(
      "ga_measurement_id",
      DEFAULT_SITE_CONFIG.gaMeasurementId
    ),
    footerTagline: get("footer_tagline", DEFAULT_SITE_CONFIG.footerTagline),
    stockLowThreshold: get(
      "stock_low_threshold",
      DEFAULT_SITE_CONFIG.stockLowThreshold
    ),
    sedes,
  };
}

// Inversa: convierte Product (UI) a filas para upsert
export function productToRows(p: Product): {
  product: Database["public"]["Tables"]["products"]["Insert"];
  variants: Database["public"]["Tables"]["variants"]["Insert"][];
  images: Database["public"]["Tables"]["product_images"]["Insert"][];
} {
  return {
    product: {
      id: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category,
      family: p.family ?? null,
      description: p.description,
      short_description: p.shortDescription,
      image: p.image,
      is_featured: !!p.isFeatured,
      is_new: !!p.isNew,
      badge: p.badge ?? null,
      colors: p.colors,
      features: p.features,
    },
    variants: p.variants.map((v, i) => ({
      sku: v.sku,
      product_id: p.id,
      storage: v.storage ?? null,
      ram: v.ram ?? null,
      size: v.size ?? null,
      color: v.color ?? null,
      condition: v.condition,
      price_cop: v.price,
      in_stock: v.inStock,
      stock_quantity: v.stockQuantity ?? 1,
      notes: v.notes ?? null,
      commission_pct: v.commissionPct ?? 0,
      battery_health: v.batteryHealth ?? null,
      condition_details: v.conditionDetails ?? null,
      sort_order: i,
    })),
    images: p.images.map((img, i) => {
      const obj = toImageObject(img);
      return {
        product_id: p.id,
        url: obj.url,
        position: i,
        color: obj.color ?? null,
      };
    }),
  };
}
