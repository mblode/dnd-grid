import type { MetadataRoute } from "next";

import { examples } from "@/examples/manifest";

import docsConfig from "../../docs/docs.json";

const siteUrl = "https://dnd-grid.com";
const staticRoutes = ["", "docs"];
// Sourced from the manifest, not the shadcn registry: the registry only covers
// examples that are installable via the CLI, so registry-driven sitemaps drop
// the pages that exist on the site but ship no registry item.
const exampleRoutes = examples.map((example) => `examples/${example.slug}`);
// The docs are proxied onto this domain by the Cloudflare worker, so their URLs
// belong in this sitemap even though the pages are built elsewhere. `index` is
// the docs home, which is already covered by the static `docs` route.
const docsRoutes = docsConfig.navigation.groups
  .flatMap((group) => group.pages)
  .map((page) => (page === "index" ? "docs" : `docs/${page}`));
const routes = [...new Set([...staticRoutes, ...docsRoutes, ...exampleRoutes])];
const TRAILING_SLASH_REGEX = /\/$/;
const DOCS_ROUTE_PREFIX = "docs/";

const getChangeFrequency = (route: string) =>
  route === "" || route === "docs" ? "weekly" : "monthly";

const getPriority = (route: string) => {
  if (route === "") {
    return 1;
  }
  if (route === "docs") {
    return 0.8;
  }
  return route.startsWith(DOCS_ROUTE_PREFIX) ? 0.7 : 0.6;
};

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: `${siteUrl}/${route}`.replace(TRAILING_SLASH_REGEX, ""),
    lastModified,
    changeFrequency: getChangeFrequency(route),
    priority: getPriority(route),
  }));
}
