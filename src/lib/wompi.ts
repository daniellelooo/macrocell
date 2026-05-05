/**
 * Helper Wompi (Colombia).
 *
 * Manejamos dos flujos:
 *
 * 1. Web Checkout (redirect): generamos una URL firmada que abre la
 *    UI de Wompi. El cliente termina redirigido a `redirect-url` con
 *    `id` y `status`.
 *
 * 2. Webhook: Wompi POSTea a /api/wompi/webhook con el evento.
 *    Validamos `signature.checksum` y actualizamos la orden en DB.
 *
 * https://docs.wompi.co/docs/colombia/checkout-web/
 * https://docs.wompi.co/docs/colombia/eventos/
 */

const SANDBOX_BASE = "https://api-sandbox.co.uat.wompi.dev/v1";
const PROD_BASE = "https://production.wompi.co/v1";
const SANDBOX_CHECKOUT = "https://checkout.wompi.co/p/";
const PROD_CHECKOUT = "https://checkout.wompi.co/p/";

export function isSandbox(): boolean {
  return (process.env.NEXT_PUBLIC_WOMPI_ENV ?? "sandbox") === "sandbox";
}

export function getApiBase(): string {
  return isSandbox() ? SANDBOX_BASE : PROD_BASE;
}

export function getCheckoutBase(): string {
  return isSandbox() ? SANDBOX_CHECKOUT : PROD_CHECKOUT;
}

export function getPublicKey(): string {
  return process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY ?? "";
}

function getServerKey(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `[wompi] env var ${name} no está configurada. Setear con \`vercel env add\` o en .env.local.`
    );
  }
  return value;
}

export function getPrivateKey(): string {
  return getServerKey("WOMPI_PRIVATE_KEY", process.env.WOMPI_PRIVATE_KEY);
}

export function getIntegritySecret(): string {
  return getServerKey(
    "WOMPI_INTEGRITY_SECRET",
    process.env.WOMPI_INTEGRITY_SECRET
  );
}

export function getEventsSecret(): string {
  return getServerKey("WOMPI_EVENTS_SECRET", process.env.WOMPI_EVENTS_SECRET);
}

// ─────────────────────────────────────────────────────────────────────────
// SHA-256 helpers (Web Crypto, disponible en Node 24+ y en Edge runtime).
// ─────────────────────────────────────────────────────────────────────────

const encoder = new TextEncoder();

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─────────────────────────────────────────────────────────────────────────
// Web Checkout
// ─────────────────────────────────────────────────────────────────────────

/**
 * Wompi y su WAF de CloudFront esperan teléfonos en formato E.164
 * (`+57XXXXXXXXXX` para Colombia). Si recibimos solo dígitos los
 * convertimos; si ya viene con + lo dejamos. Si no podemos formatear,
 * devolvemos undefined para no enviar un valor que el WAF rechace.
 */
function toE164Co(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("3")) return `+57${digits}`;
  if (digits.length === 12 && digits.startsWith("57")) return `+${digits}`;
  return undefined;
}

export type WompiCheckoutInput = {
  /** Order number / referencia única. */
  reference: string;
  /** Total en pesos colombianos (entero). El helper convierte a centavos. */
  amountCop: number;
  /** URL absoluta donde Wompi redirigirá al cliente al terminar. */
  redirectUrl: string;
  /** Email del cliente (pre-llena el formulario de Wompi). */
  customerEmail?: string;
  /** Nombre del cliente. */
  customerFullName?: string;
  /** Teléfono (formato +57…). */
  customerPhoneNumber?: string;
  /** Dirección de envío. */
  shippingAddress?: {
    addressLine1: string;
    city: string;
    region: string;
    country?: string; // ISO-2, default "CO"
    phoneNumber?: string;
  };
};

/**
 * Construye la URL del Web Checkout con la firma de integridad.
 * https://docs.wompi.co/docs/colombia/checkout-web/#firma-de-integridad
 */
export async function buildCheckoutUrl(input: WompiCheckoutInput): Promise<string> {
  const publicKey = getPublicKey();
  if (!publicKey) {
    throw new Error("[wompi] NEXT_PUBLIC_WOMPI_PUBLIC_KEY no configurada.");
  }
  const integritySecret = getIntegritySecret();
  const amountInCents = Math.round(input.amountCop * 100);
  const currency = "COP";
  const signatureSource = `${input.reference}${amountInCents}${currency}${integritySecret}`;
  const signature = await sha256Hex(signatureSource);

  const params = new URLSearchParams();
  params.set("public-key", publicKey);
  params.set("currency", currency);
  params.set("amount-in-cents", String(amountInCents));
  params.set("reference", input.reference);
  params.set("signature:integrity", signature);
  // El WAF de CloudFront que protege checkout.wompi.co bloquea con 403 cualquier
  // redirect-url que apunte a localhost / 127.0.0.1 (anti-SSRF). En desarrollo
  // omitimos el parámetro: Wompi redirigirá a su página default y el estado de
  // la orden se sincroniza igual vía webhook + /api/wompi/transaction/[id].
  const isLocalRedirect = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(
    input.redirectUrl
  );
  if (isLocalRedirect) {
    console.warn(
      "[wompi] redirect-url omitida porque apunta a localhost — el WAF de Wompi la rechaza con 403. En producción usa una URL pública con HTTPS."
    );
  } else {
    params.set("redirect-url", input.redirectUrl);
  }
  if (input.customerEmail)
    params.set("customer-data:email", input.customerEmail);
  if (input.customerFullName)
    params.set("customer-data:full-name", input.customerFullName);
  const customerPhoneE164 = toE164Co(input.customerPhoneNumber);
  if (customerPhoneE164)
    params.set("customer-data:phone-number", customerPhoneE164);
  if (input.shippingAddress) {
    const a = input.shippingAddress;
    // Sólo mandamos dirección si tiene mínimos razonables — direcciones de
    // 1-3 caracteres ("ASD") activan reglas de WAF anti-junk en CloudFront
    // y disparan 403 antes de llegar al checkout de Wompi.
    const addrOk =
      a.addressLine1.trim().length >= 5 && a.city.trim().length >= 3;
    if (addrOk) {
      params.set("shipping-address:address-line-1", a.addressLine1.trim());
      params.set("shipping-address:city", a.city.trim());
      params.set("shipping-address:region", a.region.trim());
      params.set("shipping-address:country", a.country ?? "CO");
      const shipPhoneE164 = toE164Co(a.phoneNumber);
      if (shipPhoneE164)
        params.set("shipping-address:phone-number", shipPhoneE164);
    }
  }

  return `${getCheckoutBase()}?${params.toString()}`;
}

// ─────────────────────────────────────────────────────────────────────────
// API privada Wompi
// ─────────────────────────────────────────────────────────────────────────

export type WompiTransactionStatus =
  | "APPROVED"
  | "PENDING"
  | "DECLINED"
  | "VOIDED"
  | "ERROR";

export type WompiTransaction = {
  id: string;
  reference: string;
  status: WompiTransactionStatus;
  amount_in_cents: number;
  currency: string;
  payment_method_type: string;
  finalized_at: string | null;
  customer_email: string | null;
};

export async function fetchTransaction(
  transactionId: string
): Promise<WompiTransaction | null> {
  const res = await fetch(
    `${getApiBase()}/transactions/${encodeURIComponent(transactionId)}`,
    {
      headers: {
        Authorization: `Bearer ${getPrivateKey()}`,
      },
      cache: "no-store",
    }
  );
  if (!res.ok) {
    console.error("[wompi] fetchTransaction failed", res.status, await res.text());
    return null;
  }
  const json = await res.json();
  return json.data as WompiTransaction;
}

// ─────────────────────────────────────────────────────────────────────────
// Webhook signature verification
// https://docs.wompi.co/docs/colombia/eventos/#verificaci%C3%B3n-de-eventos
// ─────────────────────────────────────────────────────────────────────────

export type WompiEventBody = {
  event: string;
  data: {
    transaction: {
      id: string;
      reference: string;
      status: WompiTransactionStatus;
      amount_in_cents: number;
      currency: string;
      payment_method_type: string;
      finalized_at: string | null;
      customer_email?: string | null;
    };
  };
  signature: {
    properties: string[];
    checksum: string;
  };
  timestamp: number;
  sent_at?: string;
  environment?: string;
};

/**
 * Verifica que el `checksum` del webhook coincida con SHA-256 de
 * (concat de los valores referenciados en `properties`) + timestamp + secret.
 */
export async function verifyWebhookSignature(
  body: WompiEventBody
): Promise<boolean> {
  const secret = getEventsSecret();
  // Por cada propiedad, extraer el valor anidado (ej "transaction.id")
  const concatenated = body.signature.properties
    .map((path) => extractPath(body.data, path))
    .join("");
  const computed = await sha256Hex(`${concatenated}${body.timestamp}${secret}`);
  return timingSafeEqualHex(computed, body.signature.checksum);
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function extractPath(obj: unknown, path: string): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return "";
    }
  }
  return cur === null || cur === undefined ? "" : String(cur);
}

// ─────────────────────────────────────────────────────────────────────────
// Mapping a estados internos
// ─────────────────────────────────────────────────────────────────────────

export type InternalPaymentStatus =
  | "unpaid"
  | "pending"
  | "approved"
  | "declined"
  | "voided"
  | "error";

export function mapWompiStatus(
  wompi: WompiTransactionStatus
): InternalPaymentStatus {
  switch (wompi) {
    case "APPROVED":
      return "approved";
    case "PENDING":
      return "pending";
    case "DECLINED":
      return "declined";
    case "VOIDED":
      return "voided";
    case "ERROR":
      return "error";
    default:
      return "pending";
  }
}

export const PAYMENT_STATUS_LABEL: Record<InternalPaymentStatus, string> = {
  unpaid: "Sin pagar",
  pending: "Pago pendiente",
  approved: "Pago aprobado",
  declined: "Pago rechazado",
  voided: "Pago anulado",
  error: "Error en el pago",
};

export const PAYMENT_STATUS_COLOR: Record<InternalPaymentStatus, string> = {
  unpaid: "bg-neutral-200 text-neutral-700",
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  voided: "bg-neutral-200 text-neutral-600",
  error: "bg-red-100 text-red-700",
};
