import { describe, it, expect } from "vitest";

// Replicamos los validators del form de checkout para testearlos en aislamiento.
// Si el form los exporta en el futuro, importar directamente y borrar esta copia.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizeCoPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("57") && digits.length === 12) return digits.slice(2);
  return digits;
}

function isValidCoPhone(raw: string): boolean {
  const digits = normalizeCoPhone(raw);
  return /^3\d{9}$/.test(digits);
}

function isPlausibleAddress(raw: string): boolean {
  const a = raw.trim();
  if (a.length < 10) return false;
  if (!/\d/.test(a)) return false;
  const uniqueChars = new Set(a.toLowerCase().replace(/\s/g, "")).size;
  if (uniqueChars < 4) return false;
  if (/(.)\1{3,}/.test(a)) return false;
  if (/([a-záéíóú]{3,})\1/i.test(a)) return false;
  if (!/[aeiouáéíóú]/i.test(a)) return false;
  if (/[bcdfghjklmnñpqrstvwxyz]{6,}/i.test(a)) return false;
  return true;
}

describe("isValidCoPhone", () => {
  it("acepta celular colombiano de 10 dígitos empezando por 3", () => {
    expect(isValidCoPhone("3001234567")).toBe(true);
    expect(isValidCoPhone("300 123 4567")).toBe(true);
    expect(isValidCoPhone("+57 314 894 1200")).toBe(true);
  });

  it("rechaza fijos y números cortos", () => {
    expect(isValidCoPhone("12345")).toBe(false);
    expect(isValidCoPhone("604 444 5555")).toBe(false);
    expect(isValidCoPhone("")).toBe(false);
  });
});

describe("EMAIL_REGEX", () => {
  it("acepta emails válidos típicos", () => {
    expect(EMAIL_REGEX.test("juan@example.com")).toBe(true);
    expect(EMAIL_REGEX.test("maria.lopez@gmail.com.co")).toBe(true);
  });

  it("rechaza inputs sin arroba o sin TLD válido", () => {
    expect(EMAIL_REGEX.test("juan")).toBe(false);
    expect(EMAIL_REGEX.test("juan@")).toBe(false);
    expect(EMAIL_REGEX.test("juan@x")).toBe(false);
    expect(EMAIL_REGEX.test("juan@x.c")).toBe(false);
  });
});

describe("isPlausibleAddress", () => {
  it("acepta direcciones colombianas reales", () => {
    expect(isPlausibleAddress("Calle 10 # 43-20, Laureles")).toBe(true);
    expect(isPlausibleAddress("Cra 70 #34-12 apto 501")).toBe(true);
    expect(isPlausibleAddress("Av Las Vegas 25 sur 100, El Poblado")).toBe(true);
  });

  it("rechaza basura tipo 'asdfasdfsdf'", () => {
    expect(isPlausibleAddress("hadashdjahhdjashdjsahdjh")).toBe(false);
    expect(isPlausibleAddress("asdfasdf 123")).toBe(false);
    expect(isPlausibleAddress("xxxxxxxxxx 123")).toBe(false);
  });

  it("rechaza si no tiene número", () => {
    expect(isPlausibleAddress("Calle de la mona Laureles")).toBe(false);
  });

  it("rechaza si es muy corta", () => {
    expect(isPlausibleAddress("cra 1")).toBe(false);
  });

  it("rechaza un mismo char repetido 4+ veces", () => {
    expect(isPlausibleAddress("aaaaa 12345")).toBe(false);
    expect(isPlausibleAddress("calle 11111")).toBe(false);
  });

  it("rechaza si no tiene vocales (probablemente random)", () => {
    expect(isPlausibleAddress("kjhgfd 123")).toBe(false);
  });
});
