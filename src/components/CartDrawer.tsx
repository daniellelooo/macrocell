"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { formatPrice } from "@/lib/products";

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, total } =
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

  const whatsappUrl = `https://wa.me/573001234567?text=${encodeURIComponent(
    `Hola! Me interesa comprar:\n\n${whatsappMessage}\n\n*Total: ${formatPrice(cartTotal)}*\n\n¿Me pueden ayudar?`
  )}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={closeCart}
          />

          <motion.aside
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-neutral-700" />
                <span className="font-semibold text-neutral-900">
                  Tu carrito
                </span>
                {items.length > 0 && (
                  <span className="text-sm text-neutral-500">
                    ({items.length} {items.length === 1 ? "producto" : "productos"})
                  </span>
                )}
              </div>
              <button
                onClick={closeCart}
                className="p-2 rounded-full hover:bg-neutral-100 transition-colors"
                aria-label="Cerrar carrito"
              >
                <X size={18} className="text-neutral-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                    <ShoppingBag size={24} className="text-neutral-400" />
                  </div>
                  <p className="font-medium text-neutral-700 mb-2">
                    Tu carrito está vacío
                  </p>
                  <p className="text-sm text-neutral-400 mb-6">
                    Agrega productos para continuar
                  </p>
                  <Link
                    href="/catalogo"
                    onClick={closeCart}
                    className="text-sm text-[#0071E3] font-medium hover:underline"
                  >
                    Ver catálogo →
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <motion.div
                      key={item.variant.sku}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex gap-4 py-4 border-b border-neutral-100 last:border-0"
                    >
                      <div className="w-20 h-20 bg-neutral-50 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden p-2">
                        <Image
                          src={item.product.image}
                          alt={item.product.name}
                          width={80}
                          height={80}
                          className="object-contain w-full h-full"
                          unoptimized
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-neutral-900 text-sm truncate">
                          {item.product.name}
                        </p>
                        {(item.variant.storage || item.variant.ram || item.variant.size) && (
                          <p className="text-xs text-neutral-500 mt-0.5">
                            {[item.variant.size, item.variant.ram, item.variant.storage]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                        {item.variant.notes && (
                          <p className="text-xs text-neutral-400">
                            {item.variant.notes}
                          </p>
                        )}
                        {item.selectedColor && (
                          <p className="text-xs text-neutral-500">
                            {item.selectedColor}
                          </p>
                        )}
                        <p className="text-sm font-semibold text-neutral-900 mt-1">
                          {formatPrice(item.variant.price * item.quantity)}
                        </p>
                        <div className="flex flex-col gap-1 mt-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                updateQuantity(item.variant.sku, item.quantity - 1)
                              }
                              className="w-7 h-7 rounded-full border border-neutral-200 flex items-center justify-center hover:bg-neutral-100 transition-colors"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="text-sm font-medium w-5 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(item.variant.sku, item.quantity + 1)
                              }
                              disabled={item.quantity >= (item.variant.stockQuantity ?? 10)}
                              className="w-7 h-7 rounded-full border border-neutral-200 flex items-center justify-center hover:bg-neutral-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Plus size={12} />
                            </button>
                            <button
                              onClick={() => removeItem(item.variant.sku)}
                              className="ml-auto text-neutral-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          {item.quantity >= (item.variant.stockQuantity ?? 10) && (
                            <p className="text-[10px] text-amber-600 font-medium">
                              Máximo disponible
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="px-6 py-5 border-t border-neutral-100 space-y-3 bg-white">
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between text-neutral-600">
                    <span>
                      Subtotal{" "}
                      <span className="text-neutral-400">
                        ({items.reduce((s, i) => s + i.quantity, 0)} unidad
                        {items.reduce((s, i) => s + i.quantity, 0) === 1 ? "" : "es"})
                      </span>
                    </span>
                    <span className="font-medium text-neutral-900">
                      {formatPrice(cartTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-600">
                    <span>Envío estándar</span>
                    <span className="font-medium text-green-600">Gratis</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-neutral-100">
                    <span className="font-bold text-neutral-900">Total</span>
                    <span className="font-bold text-neutral-900 text-lg">
                      {formatPrice(cartTotal)}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  El precio final se confirma por WhatsApp. Envío gratis a toda Colombia.
                </p>
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="flex items-center justify-center gap-2 w-full bg-[#3B9DD8] text-white py-4 rounded-2xl font-bold text-base hover:bg-[#2A84BE] active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9DD8] focus-visible:ring-offset-2"
                  aria-label={`Finalizar compra · Total ${formatPrice(cartTotal)}`}
                >
                  Finalizar compra · {formatPrice(cartTotal)}
                </Link>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-white border border-neutral-200 hover:border-[#25D366] hover:text-[#25D366] text-neutral-700 py-2.5 rounded-2xl font-semibold text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]"
                >
                  o pide por WhatsApp
                </a>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
