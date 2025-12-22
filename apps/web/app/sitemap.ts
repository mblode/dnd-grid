import type { MetadataRoute } from "next";

const siteUrl = "https://dnd-grid.com";

const routes = [
  "",
  "examples/basic",
  "examples/responsive",
  "examples/static-elements",
  "examples/dynamic-add-remove",
  "examples/localstorage",
  "examples/toolbox",
  "examples/bounded",
  "examples/resizable-handles",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: `${siteUrl}/${route}`.replace(/\/$/, ""),
    lastModified,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.6,
  }));
}
