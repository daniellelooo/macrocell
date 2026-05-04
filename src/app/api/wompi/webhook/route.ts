import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  mapWompiStatus,
  verifyWebhookSignature,
  type WompiEventBody,
} from "@/lib/wompi";

/**
 * POST /api/wompi/webhook
 *
 * Recibe eventos de Wompi: `transaction.updated`. Validamos la firma
 * SHA-256 con el `WOMPI_EVENTS_SECRET` y aplicamos el cambio a la orden
 * vía la función `apply_payment_event` (security definer).
 *
 * Wompi reintenta hasta 5 veces si no respondemos 200, así que conviene
 * que sea idempotente — `apply_payment_event` simplemente sobrescribe
 * los campos de pago.
 *
 * Configurar la URL del webhook en https://comercios.wompi.co/ →
 * Desarrolladores → Eventos. Apuntar a:
 *   https://macrocell.vercel.app/api/wompi/webhook
 */
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: WompiEventBody;
  try {
    body = (await request.json()) as WompiEventBody;
  } catch {
    return NextResponse.json({ ok: false, error: "json" }, { status: 400 });
  }

  const valid = await verifyWebhookSignature(body).catch(() => false);
  if (!valid) {
    console.warn("[wompi/webhook] firma inválida", { event: body.event });
    return NextResponse.json(
      { ok: false, error: "invalid_signature" },
      { status: 401 }
    );
  }

  if (body.event !== "transaction.updated") {
    // Ignoramos otros eventos por ahora pero respondemos 200 para que
    // Wompi no reintente.
    return NextResponse.json({ ok: true, ignored: body.event });
  }

  const tx = body.data.transaction;
  const internalStatus = mapWompiStatus(tx.status);

  // Cliente Supabase con service_role: la RPC apply_payment_event tiene
  // GRANT EXECUTE solo a service_role para que ningún cliente con la
  // anon key pueda marcar órdenes como pagadas sin pasar por el webhook
  // verificado o por el endpoint server-side de transaction.
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const paidAt = tx.finalized_at ?? new Date().toISOString();

  const { data, error } = await supabase.rpc("apply_payment_event", {
    p_reference: tx.reference,
    p_payment_status: internalStatus,
    p_transaction_id: tx.id,
    p_method_type: tx.payment_method_type,
    p_paid_at: paidAt,
    p_provider: "wompi",
  });

  if (error) {
    console.error("[wompi/webhook] apply_payment_event failed", error);
    return NextResponse.json(
      { ok: false, error: "rpc_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, applied: data });
}
