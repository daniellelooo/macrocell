import { describe, expect, it, beforeAll } from "vitest";
import { verifyWebhookSignature } from "@/lib/wompi";

// Stub mínimo del entorno; los helpers de wompi.ts leen process.env directamente.
beforeAll(() => {
  process.env.WOMPI_EVENTS_SECRET = "test_events_secret";
  process.env.WOMPI_INTEGRITY_SECRET = "test_integrity";
  process.env.WOMPI_PRIVATE_KEY = "prv_test_x";
  process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY = "pub_test_x";
  process.env.NEXT_PUBLIC_WOMPI_ENV = "sandbox";
});

/**
 * Calcula el checksum esperado igual que verifyWebhookSignature.
 * Concatena los valores referenciados en `properties` + timestamp + secret
 * y devuelve SHA-256 hex.
 */
async function computeExpectedChecksum(
  data: Record<string, unknown>,
  properties: string[],
  timestamp: number,
  secret: string
): Promise<string> {
  const concatenated = properties
    .map((path) => {
      const parts = path.split(".");
      let cur: unknown = data;
      for (const p of parts) {
        if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
          cur = (cur as Record<string, unknown>)[p];
        } else {
          return "";
        }
      }
      return cur === null || cur === undefined ? "" : String(cur);
    })
    .join("");
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${concatenated}${timestamp}${secret}`)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

describe("verifyWebhookSignature", () => {
  const properties = ["transaction.id", "transaction.status", "transaction.amount_in_cents"];
  const timestamp = 1700000000;
  const secret = "test_events_secret";

  it("acepta un webhook con firma válida", async () => {
    const data = {
      transaction: {
        id: "abc123",
        status: "APPROVED",
        amount_in_cents: 5000000,
        reference: "MC-001",
        currency: "COP",
        created_at: new Date().toISOString(),
      },
    };
    const checksum = await computeExpectedChecksum(data, properties, timestamp, secret);

    const valid = await verifyWebhookSignature({
      event: "transaction.updated",
      data,
      signature: { properties, checksum },
      timestamp,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(valid).toBe(true);
  });

  it("rechaza un webhook con firma inválida", async () => {
    const data = {
      transaction: {
        id: "abc123",
        status: "APPROVED",
        amount_in_cents: 5000000,
        reference: "MC-001",
        currency: "COP",
        created_at: new Date().toISOString(),
      },
    };
    const valid = await verifyWebhookSignature({
      event: "transaction.updated",
      data,
      signature: { properties, checksum: "0".repeat(64) },
      timestamp,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(valid).toBe(false);
  });

  it("rechaza si manipulan los datos pero usan la firma vieja", async () => {
    const original = {
      transaction: {
        id: "abc123",
        status: "APPROVED",
        amount_in_cents: 5000000,
        reference: "MC-001",
        currency: "COP",
        created_at: new Date().toISOString(),
      },
    };
    const checksum = await computeExpectedChecksum(original, properties, timestamp, secret);
    const tampered = {
      transaction: {
        ...original.transaction,
        amount_in_cents: 1, // atacante intenta cambiar el monto a 1 centavo
      },
    };
    const valid = await verifyWebhookSignature({
      event: "transaction.updated",
      data: tampered,
      signature: { properties, checksum },
      timestamp,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(valid).toBe(false);
  });

  it("rechaza si checksum tiene longitud distinta (timing-safe early exit)", async () => {
    const data = { transaction: { id: "x", status: "APPROVED", amount_in_cents: 1 } };
    const valid = await verifyWebhookSignature({
      event: "transaction.updated",
      data,
      signature: { properties, checksum: "tooshort" },
      timestamp,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(valid).toBe(false);
  });
});
