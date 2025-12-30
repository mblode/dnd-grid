import type { MetadataRoute } from "next";
import registry from "@/registry.json";

const siteUrl = "https://dnd-grid.com";
const staticRoutes = ["", "docs"];
const exampleRoutes = registry.items.map((item) => `examples/${item.name}`);
const routes = Array.from(new Set([...staticRoutes, ...exampleRoutes]));

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
    url: `${siteUrl}/${route}`.replace(/\/$/, ""),
    lastModified,
    changeFrequency: getChangeFrequency(route),
    priority: getPriority(route),
  }));
}
