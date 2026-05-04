import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/", "/checkout/resultado/"],
      },
    ],
    sitemap: "https://macrocell.vercel.app/sitemap.xml",
  };
}
