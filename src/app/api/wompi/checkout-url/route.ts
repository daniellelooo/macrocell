import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { buildCheckoutUrl } from "@/lib/wompi";

/**
 * POST /api/wompi/checkout-url
 *
 * Recibe `{ orderId }` y devuelve la URL firmada del Web Checkout de
 * Wompi. La orden ya debe existir en la DB (la crea el cliente con
 * createOrder antes de llamar a este endpoint).
 *
 * Implementación:
 *   - Usa service_role para LEER la orden y MARCARLA como wompi pending.
 *     Necesario porque las policies de RLS no dejan al rol anon leer su
 *     propia orden de guest checkout (no hay forma de saber "esta orden
 *     fue recién creada por este caller").
 *   - Verifica owner explícitamente con la sesión del caller para órdenes
 *     con user_id (defense-in-depth).
 *   - Si construir la URL de Wompi falla, CANCELA la orden para que el
 *     trigger trg_restore_stock_on_cancel restaure el stock — sino
 *     quedaba descontado para una orden que nunca se va a pagar.
 */
export const runtime = "nodejs";

type Body = { orderId: string };

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "Body inválido. Esperado: { orderId }" },
      { status: 400 }
    );
  }
  const { orderId } = body;
  if (!orderId) {
    return NextResponse.json({ error: "Falta orderId" }, { status: 400 });
  }

  // Cliente con service_role para bypassear RLS al leer la orden recién creada.
  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json(
      { error: "Orden no encontrada" },
      { status: 404 }
    );
  }

  // No permitir reactivar el flujo de pago de una orden que ya no está pendiente
  // (evita que con el orderId se pueda sobrescribir una orden aprobada/cancelada).
  if (order.status !== "pending") {
    return NextResponse.json(
      { error: `La orden no está pendiente (estado actual: ${order.status}).` },
      { status: 409 }
    );
  }
  if (
    order.payment_status &&
    !["pending", "failed", "declined", "voided"].includes(order.payment_status)
  ) {
    return NextResponse.json(
      {
        error: `El pago de la orden ya fue procesado (estado: ${order.payment_status}).`,
      },
      { status: 409 }
    );
  }

  // Verificación de dueño para órdenes con user_id.
  // Permitimos sólo:
  //  a) la sesión del caller coincide con order.user_id (dueño)
  //  b) el caller es staff (admin/vendedor/gestor) — pueden iniciar pagos a nombre del cliente
  // Las órdenes guest (sin user_id) no tienen dueño autenticado y dependen del UUID v4
  // como secreto del flujo de checkout (caso estándar de guest checkout).
  if (order.user_id) {
    const cookieStore = await cookies();
    const supabaseCaller = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              /* ignored — Server Component sin write access */
            }
          },
        },
      }
    );
    const { data: { session } } = await supabaseCaller.auth.getSession();
    const callerId = session?.user?.id ?? null;
    const isOwner = callerId === order.user_id;

    let isStaff = false;
    if (callerId && !isOwner) {
      const { data: callerProfile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", callerId)
        .maybeSingle();
      isStaff = ["admin", "vendedor", "gestor_inventario"].includes(
        callerProfile?.role ?? ""
      );
    }

    if (!isOwner && !isStaff) {
      console.warn("[wompi/checkout-url] denied", {
        orderId: order.id,
        callerId,
        ownerHint: order.user_id?.slice(0, 8),
      });
      return NextResponse.json(
        { error: "No tienes permiso para iniciar el pago de esta orden." },
        { status: 403 }
      );
    }
  }

  const origin =
    request.headers.get("origin") ?? new URL(request.url).origin;
  const redirectUrl = `${origin}/checkout/resultado/${order.order_number}`;

  let checkoutUrl: string;
  try {
    checkoutUrl = await buildCheckoutUrl({
      reference: order.order_number,
      amountCop: order.total_cop,
      redirectUrl,
      customerEmail: order.customer_email ?? undefined,
      customerFullName: order.customer_name,
      customerPhoneNumber: order.customer_phone,
      shippingAddress: order.shipping_address
        ? {
            addressLine1: order.shipping_address,
            city: order.shipping_city ?? "",
            region: order.shipping_department ?? "",
            country: "CO",
            phoneNumber: order.customer_phone,
          }
        : undefined,
    });
  } catch (err) {
    console.error("[wompi/checkout-url] buildCheckoutUrl failed", err);
    // Cancelar la orden para que el trigger restaure el stock.
    await supabaseAdmin
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", order.id);
    return NextResponse.json(
      {
        error:
          "No se pudo construir la URL de pago. La orden se canceló y el stock se restauró.",
      },
      { status: 500 }
    );
  }

  // Marcar la orden como inicio de flujo Wompi.
  await supabaseAdmin
    .from("orders")
    .update({
      payment_provider: "wompi",
      payment_reference: order.order_number,
      payment_status: order.payment_status ?? "pending",
    })
    .eq("id", order.id);

  return NextResponse.json({ url: checkoutUrl });
}
