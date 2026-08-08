interface Env {
  CUSTOM_URL?: string;
}

const ZONE_ORIGIN = "https://blode.co";
const ZONE_BASE = "/dnd-grid";
const DOCS_PREFIX = "/docs";

// Root-level Mintlify paths that historically leaked without the /docs prefix.
// These must land under /dnd-grid/docs/... so GSC gets unique, path-preserving
// targets instead of collapsing onto the zone homepage.
const DOCS_PAGE_PATHS = [
  "/introduction",
  "/installation",
  "/concepts/layout",
  "/concepts/compactors",
  "/concepts/constraints",
  "/concepts/grid-items",
  "/concepts/styling",
  "/api-reference/overview",
  "/api-reference/dnd-grid",
  "/api-reference/responsive-dnd-grid",
  "/api-reference/layout-item",
  "/api-reference/callbacks",
  "/hooks/use-container-width",
  "/hooks/use-dnd-grid",
  "/hooks/use-dnd-grid-responsive-layout",
  "/hooks/use-dnd-grid-item-state",
  "/hooks/use-edge-scroll",
  "/patterns/ssr",
  "/patterns/troubleshooting",
  "/examples/basic",
  "/examples/responsive",
  "/examples/static-elements",
  "/examples/dynamic-add-remove",
  "/examples/localstorage",
  "/examples/toolbox",
  "/examples/bounded",
  "/examples/resizable-handles",
  "/examples/kitchen-sink",
  "/examples/headless",
  "/examples/drag-from-outside",
  "/examples/allow-overlap",
  "/examples/compactor-showcase",
  "/examples/constraints",
  "/examples/aspect-ratio-constraints",
  "/examples/scale",
  "/examples/composition",
  "/examples/multiple-instances",
  "/examples/portal",
] as const;
const DOCS_PAGE_PATH_SET = new Set<string>(DOCS_PAGE_PATHS);

const isKnownDocsPagePath = (pathname: string): boolean => {
  const normalizedPath = pathname.endsWith(".mdx")
    ? pathname.slice(0, -".mdx".length)
    : pathname;

  return DOCS_PAGE_PATH_SET.has(normalizedPath);
};

/**
 * Map an apex path to its blode.co zone path.
 * Docs stay published on dnd-grid.blode.md; the apex only redirects for GSC.
 */
const toZonePath = (pathname: string): string => {
  if (pathname === "/") {
    return ZONE_BASE;
  }

  if (isKnownDocsPagePath(pathname)) {
    return `${ZONE_BASE}${DOCS_PREFIX}${pathname}`;
  }

  return `${ZONE_BASE}${pathname}`;
};

export default {
  async fetch(
    request: Request,
    _env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    try {
      const urlObject = new URL(request.url);

      // Allow Vercel/Let's Encrypt verification paths to pass through
      if (urlObject.pathname.startsWith("/.well-known/")) {
        return await fetch(request);
      }

      // Every apex URL (including /docs/*) 301s to the blode.co zone with the
      // path preserved so Change of Address does not see duplicate targets.
      const zoneUrl = `${ZONE_ORIGIN}${toZonePath(urlObject.pathname)}${urlObject.search}`;
      return Response.redirect(zoneUrl, 301);
    } catch {
      return await fetch(request);
    }
  },
};
