import type { MetadataRoute } from "next";

import { examples } from "@/examples/manifest";

const siteUrl = "https://dnd-grid.com";
const staticRoutes = ["", "docs"];
// Sourced from the manifest, not the shadcn registry: the registry only covers
// examples that are installable via the CLI, so registry-driven sitemaps drop
// the pages that exist on the site but ship no registry item.
const exampleRoutes = examples.map((example) => `examples/${example.slug}`);
const routes = [...new Set([...staticRoutes, ...exampleRoutes])];
const TRAILING_SLASH_REGEX = /\/$/;

const getChangeFrequency = (route: string) =>
  route === "" || route === "docs" ? "weekly" : "monthly";

const getPriority = (route: string) => {
  if (route === "") {
    return 1;
  }
  if (route === "docs") {
    return 0.8;
  }
  return 0.6;
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
