import type { MetadataRoute } from "next";

import { examples } from "@/examples/manifest";
import { siteUrl } from "@/lib/config";

// Zone sitemap lists marketing + example URLs only. Docs are proxied under
// /docs from the blode.md tenant and keep their own sitemap upstream.
const staticRoutes = [""];
const exampleRoutes = examples.map((example) => `examples/${example.slug}`);
const routes = [...staticRoutes, ...exampleRoutes];
const TRAILING_SLASH_REGEX = /\/$/;

const getChangeFrequency = (route: string) =>
  route === "" ? "weekly" : "monthly";

const getPriority = (route: string) => (route === "" ? 1 : 0.6);

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: `${siteUrl}/${route}`.replace(TRAILING_SLASH_REGEX, ""),
    lastModified,
    changeFrequency: getChangeFrequency(route),
    priority: getPriority(route),
  }));
}
