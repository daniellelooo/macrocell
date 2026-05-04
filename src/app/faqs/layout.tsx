import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Preguntas Frecuentes",
  description:
    "Resuelve tus dudas sobre garantías, envíos, métodos de pago y productos Apple en Macrocell. Garantía oficial, crédito y envíos a toda Colombia.",
  alternates: { canonical: "/faqs" },
};

export default function FAQsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
