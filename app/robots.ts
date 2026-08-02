import type { MetadataRoute } from "next";

const siteUrl = process.env.APP_URL ?? "https://keras.dendikcreation.dev";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/login", "/submit", "/schedule", "/adopt-schedule"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
