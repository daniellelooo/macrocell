"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Lock, ShieldCheck, Truck } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { formatPrice } from "@/lib/products";

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, clearCart } =
    useCartStore();
  const cartTotal = total();

  const whatsappMessage = items
    .map((item) => {
      const variantInfo = [item.variant.storage, item.variant.notes]
        .filter(Boolean)
        .join(" · ");
      const suffix = variantInfo ? ` (${variantInfo})` : "";
      return `• ${item.product.name}${suffix} x${item.quantity} - ${formatPrice(
        item.variant.price * item.quantity
      )}`;
    })
    .join("\n");

  const whatsappUrl = `https://wa.me/573148941200?text=${encodeURIComponent(
    `Hola! Me interesa comprar:\n\n${whatsappMessage}\n\n*Total: ${formatPrice(cartTotal)}*\n\n¿Me pueden ayudar?`
  )}`;

  return (
    <div className="pt-24 min-h-screen bg-[#F5F5F7] px-6 pb-24">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
          <Link
            href="/catalogo"
            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Seguir comprando
          </Link>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-neutral-900 mb-8">
          Tu carrito
        </h1>

        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-16 text-center shadow-sm"
          >
            <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag size={32} className="text-neutral-400" />
            </div>
            <h2 className="text-2xl font-semibold text-neutral-700 mb-3">
              Tu carrito está vacío
            </h2>
            <p className="text-neutral-400 mb-8">
              Explora nuestro catálogo y encuentra el equipo perfecto
            </p>
            <Link
              href="/catalogo"
              className="bg-[#3B9DD8] text-white px-8 py-3 rounded-full font-medium hover:bg-[#2A84BE] transition-colors inline-block"
            >
              Ver catálogo
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <motion.div
                    key={item.variant.sku}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-3xl p-6 flex gap-5 items-center shadow-sm"
                  >
                    <div className="w-24 h-24 bg-neutral-50 rounded-2xl flex items-center justify-center flex-shrink-0 p-3 overflow-hidden">
                      <Image
                        src={item.product.image}
                        alt={item.product.name}
                        width={96}
                        height={96}
                        className="w-full h-full object-contain"
                        unoptimized
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/productos/${item.product.slug}`}
                        className="font-semibold text-neutral-900 hover:text-[#3B9DD8] transition-colors"
                      >
                        {item.product.name}
                      </Link>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-neutral-500 mt-0.5">
                        {item.variant.storage && <span>{item.variant.storage}</span>}
                        {item.variant.ram && <span>{item.variant.ram} RAM</span>}
                        {item.variant.size && <span>{item.variant.size}</span>}
                        {item.selectedColor && <span>{item.selectedColor}</span>}
                        {item.variant.notes && (
                          <span className="text-neutral-400">{item.variant.notes}</span>
                        )}
                      </div>
                      <p className="text-base font-bold text-neutral-900 mt-2">
                        {formatPrice(item.variant.price * item.quantity)}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <button
                        onClick={() => removeItem(item.variant.sku)}
                        className="text-neutral-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2 bg-neutral-100 rounded-full px-2 py-1">
                          <button
                            onClick={() =>
                              updateQuantity(item.variant.sku, item.quantity - 1)
                            }
                            className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-sm font-bold w-5 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.variant.sku, item.quantity + 1)
                            }
                            disabled={item.quantity >= (item.variant.stockQuantity ?? 10)}
                            className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-sm hover:shadow-md transition-shadow disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        {item.quantity >= (item.variant.stockQuantity ?? 10) && (
                          <p className="text-[10px] text-amber-600 font-medium pr-1">
                            Máximo disponible
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <button
                onClick={clearCart}
                className="text-sm text-neutral-400 hover:text-red-400 transition-colors"
              >
                Vaciar carrito
              </button>
            </div>

            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-3xl p-6 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-neutral-900 mb-5">
                  Resumen de pedido
                </h2>
                <div className="space-y-3 mb-5">
                  {items.map((item) => (
                    <div
                      key={item.variant.sku}
                      className="flex justify-between text-sm text-neutral-600"
                    >
                      <span className="truncate mr-2">
                        {item.product.name}
                        {item.variant.storage ? ` ${item.variant.storage}` : ""} ×
                        {item.quantity}
                      </span>
                      <span className="font-medium text-neutral-900 flex-shrink-0">
                        {formatPrice(item.variant.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-neutral-100 pt-4 mb-6">
                  <div className="flex justify-between">
                    <span className="font-bold text-neutral-900">Total</span>
                    <span className="font-bold text-neutral-900 text-xl">
                      {formatPrice(cartTotal)}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Precio referencial. Se confirma por WhatsApp.
                  </p>
                </div>
                <div className="space-y-3">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-3.5 rounded-2xl font-semibold text-sm hover:bg-[#1ebe5d] transition-colors"
                  >
                    Pedir por WhatsApp
                  </a>
                  <Link
                    href="/checkout"
                    className="flex items-center justify-center gap-2 w-full bg-[#3B9DD8] text-white py-3.5 rounded-2xl font-semibold text-sm hover:bg-[#2A84BE] transition-colors"
                  >
                    Finalizar compra
                  </Link>
                </div>
              </motion.div>

              <div className="bg-white rounded-3xl p-5 shadow-sm text-sm text-neutral-500 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <Lock size={15} className="text-neutral-400 shrink-0" />
                  Transacción 100% segura
                </div>
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={15} className="text-neutral-400 shrink-0" />
                  Garantía oficial Apple 1 año
                </div>
                <div className="flex items-center gap-2.5">
                  <Truck size={15} className="text-neutral-400 shrink-0" />
                  Envíos a todo Colombia
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
