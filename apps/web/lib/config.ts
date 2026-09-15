/** Must stay in step with `basePath` / `assetPrefix` in next.config.js. */
export const basePath = "/dnd-grid";

export const asset = (path: string) => `${basePath}${path}`;

export const siteUrl = `https://blode.co${basePath}`;

export const siteConfig = {
  name: "DnD Grid",
  version: "0.1.0",
  // SERP meta, Open Graph, Twitter, and JSON-LD share this string (≤160 chars).
  description:
    "React drag-and-drop grid with resize, collision handling, compaction, and responsive breakpoints. For dashboards and editors.",
  url: siteUrl,
  links: {
    github: "https://github.com/mblode/dnd-grid",
    // Docs are proxied onto the zone at /dnd-grid/docs (see apps/web/proxy.ts).
    docs: "https://blode.co/dnd-grid/docs",
    author: "https://blode.co",
    projects: "https://blode.co/projects",
    npm: "https://www.npmjs.com/package/@dnd-grid/react",
  },
};
