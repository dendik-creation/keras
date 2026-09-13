import type { MetadataRoute } from "next";
import { absoluteUrl, siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteConfig.url,
      lastModified: "2026-09-13",
    },
    {
      url: absoluteUrl("/analytics"),
      lastModified: "2026-08-03",
    },
    {
      url: absoluteUrl("/changelog"),
      lastModified: "2026-08-03",
    },
    {
      url: absoluteUrl("/privacy"),
      lastModified: "2026-08-03",
    },
    {
      url: absoluteUrl("/terms"),
      lastModified: "2026-08-02",
    },
  ];
}
