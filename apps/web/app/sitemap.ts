import type { MetadataRoute } from "next";

const siteUrl = "https://dnd-grid.com";

const routes = [""];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: `${siteUrl}/${route}`.replace(/\/$/, ""),
    lastModified,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.6,
  }));
}
