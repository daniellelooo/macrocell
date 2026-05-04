import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Favoritos",
  description: "Tus productos Apple guardados en Macrocell.",
  robots: { index: false },
};

export default function WishlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
