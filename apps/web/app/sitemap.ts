import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/config";

// The zone root only. Docs are proxied under /docs from the blode.md tenant and
// keep their own sitemap upstream, and `/examples/*` is `noindex` — it is the
// frame the docs page embeds, not a second page per example.
const routes = [""];
const TRAILING_SLASH_REGEX = /\/$/;

const getChangeFrequency = (route: string) =>
  route === "" ? "weekly" : "monthly";

const getPriority = (route: string) => (route === "" ? 1 : 0.6);

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${siteUrl}/${route}`.replace(TRAILING_SLASH_REGEX, ""),
    changeFrequency: getChangeFrequency(route),
    priority: getPriority(route),
  }));
}
