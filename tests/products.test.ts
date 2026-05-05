import { describe, it, expect } from "vitest";
import {
  getDiscountPct,
  hasActivePromotion,
  getBestDiscountPct,
  getMinPrice,
  formatPrice,
  type Product,
  type Variant,
} from "@/lib/products";

function variant(partial: Partial<Variant>): Variant {
  return {
    sku: "test-sku",
    condition: "nuevo",
    price: 1_000_000,
    inStock: true,
    stockQuantity: 1,
    ...partial,
  };
}

function product(variants: Variant[]): Product {
  return {
    id: "p",
    slug: "p",
    name: "Test",
    category: "iphone",
    description: "",
    shortDescription: "",
    image: "",
    images: [],
    colors: [],
    features: [],
    variants,
  };
}

describe("getDiscountPct", () => {
  it("devuelve null si no hay comparePrice", () => {
    expect(getDiscountPct(variant({ price: 1000 }))).toBeNull();
  });

  it("devuelve null si comparePrice es <= price (caso inválido)", () => {
    expect(getDiscountPct(variant({ price: 1000, comparePrice: 1000 }))).toBeNull();
    expect(getDiscountPct(variant({ price: 1000, comparePrice: 500 }))).toBeNull();
  });

  it("calcula el porcentaje correcto", () => {
    // 1000 → 800 = 20% off
    expect(getDiscountPct(variant({ price: 800, comparePrice: 1000 }))).toBe(20);
    // 5_000_000 → 4_500_000 = 10% off
    expect(
      getDiscountPct(variant({ price: 4_500_000, comparePrice: 5_000_000 }))
    ).toBe(10);
  });

  it("redondea hacia abajo (no muestra 100% por error)", () => {
    expect(getDiscountPct(variant({ price: 4, comparePrice: 1000 }))).toBe(99);
  });
});

describe("hasActivePromotion / getBestDiscountPct", () => {
  it("detecta promo en cualquier variante del producto", () => {
    const p = product([
      variant({ sku: "a", price: 1000 }),
      variant({ sku: "b", price: 800, comparePrice: 1000 }),
    ]);
    expect(hasActivePromotion(p)).toBe(true);
    expect(getBestDiscountPct(p)).toBe(20);
  });

  it("retorna 0% si ninguna variante está en promo", () => {
    const p = product([variant({ price: 1000 }), variant({ price: 2000 })]);
    expect(hasActivePromotion(p)).toBe(false);
    expect(getBestDiscountPct(p)).toBe(0);
  });

  it("toma el descuento más fuerte cuando hay varias promos", () => {
    const p = product([
      variant({ sku: "a", price: 900, comparePrice: 1000 }), // 10%
      variant({ sku: "b", price: 700, comparePrice: 1000 }), // 30%
      variant({ sku: "c", price: 500, comparePrice: 1000 }), // 50%
    ]);
    expect(getBestDiscountPct(p)).toBe(50);
  });
});

describe("getMinPrice", () => {
  it("devuelve el precio más bajo de las variantes", () => {
    const p = product([
      variant({ price: 5_000_000 }),
      variant({ price: 4_500_000 }),
      variant({ price: 6_000_000 }),
    ]);
    expect(getMinPrice(p)).toBe(4_500_000);
  });
});

describe("formatPrice", () => {
  it("formatea con separadores en es-CO sin decimales", () => {
    const v = formatPrice(5_400_000);
    // En es-CO los miles van con punto, decimales con coma. No debe haber decimales.
    expect(v).toMatch(/5[.,]?400[.,]?000/);
    expect(v).not.toMatch(/,\d/); // sin coma decimal seguida de dígito
  });
});
