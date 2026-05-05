"use client";

import { getSupabaseBrowserClient } from "./supabase/client";
import type { CartItem } from "./store";

export type CreateOrderInput = {
  userId: string | null; // null = guest checkout
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  shippingDepartment?: string;
  shippingCity?: string;
  shippingAddress?: string;
  notes?: string;
  items: CartItem[];
  shippingCop?: number;
  paymentMethod?: string;
};

export type OrderRecord = {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  shippingDepartment: string | null;
  shippingCity: string | null;
  shippingAddress: string | null;
  notes: string | null;
  subtotalCop: number;
  shippingCop: number;
  totalCop: number;
  paymentMethod: string | null;
  whatsappSent: boolean;
  createdAt: string;
  items: {
    productId: string | null;
    productName: string;
    variantSku: string | null;
    variantLabel: string | null;
    unitPriceCop: number;
    quantity: number;
    imageUrl: string | null;
  }[];
};

function variantLabel(item: CartItem): string {
  return [
    item.variant.size,
    item.variant.ram ? `${item.variant.ram} RAM` : undefined,
    item.variant.storage,
    item.variant.notes,
    item.selectedColor,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Verifica disponibilidad de stock para cada ítem antes de crear la orden.
 *  Devuelve un array de errores (vacío si todo está disponible). */
export async function validateStock(
  items: CartItem[]
): Promise<string[]> {
  if (!items.length) return [];
  const supabase = getSupabaseBrowserClient();
  const skus = items.map((i) => i.variant.sku);
  const { data, error } = await supabase
    .from("variants")
    .select("sku, stock_quantity, in_stock")
    .in("sku", skus);

  if (error) return []; // si falla la consulta, no bloqueamos (fail-open)

  const rows = data ?? [];
  const errors: string[] = [];

  for (const item of items) {
    const row = rows.find((r) => r.sku === item.variant.sku);
    if (!row) continue; // SKU no encontrado en DB → producto de catálogo estático, skip
    const available = row.stock_quantity ?? (row.in_stock ? 1 : 0);
    if (available < item.quantity) {
      const qty = available === 0 ? "agotado" : `solo quedan ${available}`;
      errors.push(`${item.product.name}: ${qty}.`);
    }
  }

  return errors;
}

export async function createOrder(
  input: CreateOrderInput
): Promise<{ ok: true; order: OrderRecord } | { ok: false; error: string }> {
  const supabase = getSupabaseBrowserClient();

  const subtotal = input.items.reduce(
    (sum, i) => sum + i.variant.price * i.quantity,
    0
  );
  const shipping = input.shippingCop ?? 0;
  const total = subtotal + shipping;

  // Items en formato JSON para la RPC
  const itemRows = input.items.map((i) => ({
    product_id: i.product.id,
    product_name: i.product.name,
    variant_sku: i.variant.sku,
    variant_label: variantLabel(i) || null,
    unit_price_cop: i.variant.price,
    quantity: i.quantity,
    image_url: i.product.image,
  }));

  // Llamar a la RPC SECURITY DEFINER que crea orden + items atómicamente
  // (evita problemas de RLS y garantiza que ambos inserts queden en la
  // misma transacción).
  const { data, error } = await supabase.rpc("create_order_with_items", {
    p_user_id: input.userId,
    p_customer_name: input.customerName.trim(),
    p_customer_email: input.customerEmail?.trim() || null,
    p_customer_phone: input.customerPhone.trim(),
    p_shipping_department: input.shippingDepartment ?? null,
    p_shipping_city: input.shippingCity ?? null,
    p_shipping_address: input.shippingAddress ?? null,
    p_notes: input.notes?.trim() || null,
    p_subtotal_cop: subtotal,
    p_shipping_cop: shipping,
    p_total_cop: total,
    p_payment_method: input.paymentMethod ?? null,
    p_items: itemRows,
  });

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "No se pudo crear la orden",
    };
  }

  const result = data as {
    id: string;
    order_number: string;
    status: string;
    created_at: string;
  };

  return {
    ok: true,
    order: {
      id: result.id,
      orderNumber: result.order_number,
      status: result.status,
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone.trim(),
      customerEmail: input.customerEmail?.trim() ?? null,
      shippingDepartment: input.shippingDepartment ?? null,
      shippingCity: input.shippingCity ?? null,
      shippingAddress: input.shippingAddress ?? null,
      notes: input.notes?.trim() ?? null,
      subtotalCop: subtotal,
      shippingCop: shipping,
      totalCop: total,
      paymentMethod: input.paymentMethod ?? null,
      whatsappSent: false,
      createdAt: result.created_at,
      items: itemRows.map((r) => ({
        productId: r.product_id,
        productName: r.product_name,
        variantSku: r.variant_sku,
        variantLabel: r.variant_label,
        unitPriceCop: r.unit_price_cop,
        quantity: r.quantity,
        imageUrl: r.image_url,
      })),
    },
  };
}

export async function markOrderWhatsappSent(orderId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase
    .from("orders")
    .update({ whatsapp_sent: true })
    .eq("id", orderId);
}

export async function listMyOrders(): Promise<OrderRecord[]> {
  const supabase = getSupabaseBrowserClient();
  // Filtramos explícitamente por user_id del caller. La RLS permite a staff
  // (admin/vendedor/gestor) leer TODAS las órdenes para los paneles internos,
  // así que sin este filtro /cuenta mostraría todo el universo de pedidos
  // cuando un staff entra como cliente.
  const { data: { session } } = await supabase.auth.getSession();
  const myId = session?.user?.id;
  if (!myId) return [];

  const { data: ordersData, error: oErr } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", myId)
    .order("created_at", { ascending: false });
  if (oErr || !ordersData) return [];

  const ids = ordersData.map((o) => o.id);
  const { data: itemsData } = ids.length
    ? await supabase.from("order_items").select("*").in("order_id", ids)
    : { data: [] as never[] };

  return ordersData.map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    status: o.status,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    customerEmail: o.customer_email,
    shippingDepartment: o.shipping_department,
    shippingCity: o.shipping_city,
    shippingAddress: o.shipping_address,
    notes: o.notes,
    subtotalCop: o.subtotal_cop,
    shippingCop: o.shipping_cop,
    totalCop: o.total_cop,
    paymentMethod: o.payment_method,
    whatsappSent: o.whatsapp_sent,
    createdAt: o.created_at,
    items: ((itemsData ?? []) as Array<{
      order_id: string;
      product_id: string | null;
      product_name: string;
      variant_sku: string | null;
      variant_label: string | null;
      unit_price_cop: number;
      quantity: number;
      image_url: string | null;
    }>)
      .filter((it) => it.order_id === o.id)
      .map((it) => ({
        productId: it.product_id,
        productName: it.product_name,
        variantSku: it.variant_sku,
        variantLabel: it.variant_label,
        unitPriceCop: it.unit_price_cop,
        quantity: it.quantity,
        imageUrl: it.image_url,
      })),
  }));
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente de confirmación",
  confirmed: "Confirmado",
  shipped: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const ORDER_STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-neutral-200 text-neutral-600",
};
