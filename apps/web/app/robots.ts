import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    // Host-level robots for blode.co is authoritative; this only helps when the
    // zone origin is crawled directly.
    host: "https://blode.co",
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
