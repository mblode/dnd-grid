import { basePath } from "./config.ts";

/** Upstream docs host (blode.md tenant). */
export const DOCS_UPSTREAM_HOST = "dnd-grid.blode.md";

/** Public docs mount on the blode.co zone. */
const DOCS_PREFIX = "/docs";
export const PUBLIC_DOCS_BASE = `${basePath}${DOCS_PREFIX}`;
export const PUBLIC_ASSET_PREFIX = `${basePath}/_docs`;

/**
 * Root-level docs page paths as emitted by the upstream host (no /docs prefix).
 * Keep in sync with apps/docs/docs.json navigation + docs-worker DOCS_PAGE_PATHS.
 */
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

/** Root utility files the docs HTML references without a /docs prefix. */
const DOCS_ROOT_FILES = [
  "/llms.txt",
  "/llms-full.txt",
  "/favicon.ico",
  "/manifest.json",
  "/icon0.svg",
  "/icon1.png",
  "/apple-icon.png",
] as const;

const REGEXP_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;

const escapeRegExp = (value: string): string =>
  value.replace(REGEXP_SPECIAL_CHARS, "\\$&");

export const isDocsMountPath = (pathname: string): boolean =>
  pathname === DOCS_PREFIX || pathname.startsWith(`${DOCS_PREFIX}/`);

export const isDocsAssetPath = (pathname: string): boolean =>
  pathname.startsWith("/_docs/");

/**
 * Strip the zone basePath when present so matchers can use /docs and /_docs.
 */
export const stripZoneBasePath = (pathname: string): string => {
  if (pathname === basePath) {
    return "/";
  }
  if (pathname.startsWith(`${basePath}/`)) {
    return pathname.slice(basePath.length);
  }
  return pathname;
};

/**
 * Map a public zone docs path (/docs/...) to the upstream tenant path.
 * Upstream pages live at the tenant root; /docs is only the public mount.
 */
export const toUpstreamPath = (zoneRelativePath: string): string => {
  if (isDocsAssetPath(zoneRelativePath)) {
    return zoneRelativePath;
  }

  if (!isDocsMountPath(zoneRelativePath)) {
    return zoneRelativePath;
  }

  const remainder = zoneRelativePath.slice(DOCS_PREFIX.length);
  return remainder === "" ? "/" : remainder;
};

const toPublicDocsPath = (upstreamPath: string): string => {
  if (upstreamPath === "/" || upstreamPath === "") {
    return PUBLIC_DOCS_BASE;
  }
  if (isDocsAssetPath(upstreamPath)) {
    return `${basePath}${upstreamPath}`;
  }
  if (isDocsMountPath(upstreamPath)) {
    return `${basePath}${upstreamPath}`;
  }
  return `${PUBLIC_DOCS_BASE}${upstreamPath}`;
};

/** Map a path from an absolute upstream URL onto the public zone docs URL path. */
const publicPathFromUpstreamAbsolute = (path: string): string => {
  if (path === "" || path === "/") {
    return PUBLIC_DOCS_BASE;
  }
  if (isDocsAssetPath(path)) {
    return `${basePath}${path}`;
  }
  if (isDocsMountPath(path)) {
    return `${basePath}${path}`;
  }
  return `${PUBLIC_DOCS_BASE}${path}`;
};

export const rewriteDocsLocation = (
  location: string,
  requestUrl: URL
): string | null => {
  let resolvedLocation: URL;

  try {
    resolvedLocation = new URL(location, requestUrl);
  } catch {
    return null;
  }

  const isUpstreamRedirect =
    resolvedLocation.hostname === DOCS_UPSTREAM_HOST ||
    resolvedLocation.hostname === requestUrl.hostname ||
    resolvedLocation.hostname === "blode.co";

  if (!isUpstreamRedirect) {
    return null;
  }

  const path =
    resolvedLocation.hostname === DOCS_UPSTREAM_HOST
      ? publicPathFromUpstreamAbsolute(resolvedLocation.pathname)
      : toPublicDocsPath(stripZoneBasePath(resolvedLocation.pathname));

  return `https://blode.co${path}${resolvedLocation.search}${resolvedLocation.hash}`;
};

/**
 * `og:site_name` on the proxied docs. See the note where this is applied, at
 * the end of `rewriteDocsHtml`.
 *
 * Matched on `og:site_name` alone, then the `content` attribute is replaced
 * inside whatever matched. An earlier version required `property` before
 * `content` in one pattern: if the platform ever emits them the other way the
 * regex matches nothing, rewrites nothing, and the old value ships while any
 * assertion phrased as "the new value is present" still passes.
 */
export const HOST_SITE_NAME = "Matthew Blode";
const OG_SITE_NAME_META = /<meta\b[^>]*\bproperty="og:site_name"[^>]*>/giu;
const META_CONTENT_ATTR = /\bcontent="[^"]*"/iu;
const OG_SITE_NAME_FLIGHT = /\{[^{}]*\\"og:site_name\\"[^{}]*\}/gu;
const FLIGHT_CONTENT_ATTR = /\\"content\\":\\"[^"\\]*\\"/u;

const rewriteOgSiteName = (html: string): string =>
  html
    .replace(OG_SITE_NAME_META, (tag) =>
      tag.replace(META_CONTENT_ATTR, `content="${HOST_SITE_NAME}"`)
    )
    .replace(OG_SITE_NAME_FLIGHT, (node) =>
      node.replace(FLIGHT_CONTENT_ATTR, `\\"content\\":\\"${HOST_SITE_NAME}\\"`)
    );

export const rewriteDocsHtml = (html: string): string => {
  let rewrittenHtml = html;
  const hrefPaths = ["/", ...DOCS_PAGE_PATHS, ...DOCS_ROOT_FILES];

  for (const path of hrefPaths) {
    const publicPath = toPublicDocsPath(path);
    rewrittenHtml = rewrittenHtml.replaceAll(
      `href="${path}"`,
      `href="${publicPath}"`
    );
    rewrittenHtml = rewrittenHtml.replaceAll(
      `href\\":\\"${path}\\"`,
      `href\\":\\"${publicPath}\\"`
    );
    rewrittenHtml = rewrittenHtml.replaceAll(
      `"href":"${path}"`,
      `"href":"${publicPath}"`
    );
  }

  for (const path of DOCS_PAGE_PATHS) {
    for (const ext of [".md", ".mdx"] as const) {
      const mdxPath = `${path}${ext}`;
      const publicMdxPath = toPublicDocsPath(mdxPath);
      rewrittenHtml = rewrittenHtml.replaceAll(
        `href="${mdxPath}"`,
        `href="${publicMdxPath}"`
      );
      rewrittenHtml = rewrittenHtml.replaceAll(
        `contentUrl\\":\\"${mdxPath}\\"`,
        `contentUrl\\":\\"${publicMdxPath}\\"`
      );
      rewrittenHtml = rewrittenHtml.replaceAll(
        `"contentUrl":"${mdxPath}"`,
        `"contentUrl":"${publicMdxPath}"`
      );
    }
  }

  // Platform asset prefix must stay on the zone, not the blode.co root.
  rewrittenHtml = rewrittenHtml.replaceAll(
    `"/_docs/`,
    `"${PUBLIC_ASSET_PREFIX}/`
  );
  rewrittenHtml = rewrittenHtml.replaceAll(
    `\\"/_docs/`,
    `\\"${PUBLIC_ASSET_PREFIX}/`
  );
  rewrittenHtml = rewrittenHtml.replaceAll(
    `'/_docs/`,
    `'${PUBLIC_ASSET_PREFIX}/`
  );
  // Link: </_docs/...>; rel=preload
  rewrittenHtml = rewrittenHtml.replaceAll(
    `</_docs/`,
    `</${PUBLIC_ASSET_PREFIX.slice(1)}/`
  );

  // Absolute upstream URLs (canonical, og, .md exports) → public zone docs URL.
  const docsOriginPattern = new RegExp(
    `https://${escapeRegExp(DOCS_UPSTREAM_HOST)}(/[^"'\\\\\\s)]*)?`,
    "g"
  );
  rewrittenHtml = rewrittenHtml.replace(
    docsOriginPattern,
    (_match, path: string | undefined) =>
      `https://blode.co${publicPathFromUpstreamAbsolute(path ?? "")}`
  );

  // Serve brand assets from this app's public/ so img-src 'self' (or a stale
  // marketing CSP) cannot block Vercel Blob. Matches HTML attrs and RSC JSON.
  rewrittenHtml = rewrittenHtml.replaceAll(
    /https:\/\/[^"'\\\s]+\/files\/logo\/(light|dark)\.svg/g,
    `${basePath}/logo/$1.svg`
  );
  rewrittenHtml = rewrittenHtml.replaceAll(
    /https:\/\/[^"'\\\s]+\/files\/favicon\.svg/g,
    `${basePath}/logo/favicon.svg`
  );
  // Drop Blob preconnect once brand assets are same-origin (HTML + RSC JSON).
  rewrittenHtml = rewrittenHtml.replaceAll(
    /<link rel="preconnect" href="https:\/\/(?:[^"'\\\s]+\.)?public\.blob\.vercel-storage\.com"\/?>/g,
    ""
  );
  rewrittenHtml = rewrittenHtml.replaceAll(
    /\["\$","link",null,\{"rel":"preconnect","href":"https:\/\/(?:[^"\\]+\.)?public\.blob\.vercel-storage\.com"\}\]/g,
    ""
  );
  rewrittenHtml = rewrittenHtml.replaceAll(
    /\[\\"\$\\",\\"link\\",null,\{\\"rel\\":\\"preconnect\\",\\"href\\":\\"https:\/\/(?:[^"\\]+\.)?public\.blob\.vercel-storage\.com\\"\}\]/g,
    ""
  );

  // og:site_name is the person on every blode.co path, and these pages are
  // blode.co paths behind the rewrite. Not fixed in docs.json because its
  // `name` also feeds the title suffix: setting it to "Matthew Blode" would
  // make every page read "Introduction · Matthew Blode" and leave nothing on
  // the card naming the product, which is the failure Rule 9's "Do Rule 8
  // first" section describes. Both copies go: the rendered <meta>, and the one
  // React re-renders from the flight payload on hydration. Stopgap until
  // blode.md grows a `seo.siteName`, which would fix every tenant at once.
  rewrittenHtml = rewriteOgSiteName(rewrittenHtml);

  return rewrittenHtml;
};

export const buildUpstreamUrl = (
  zoneRelativePath: string,
  search: string
): URL => {
  const upstreamPath = toUpstreamPath(zoneRelativePath);
  return new URL(
    `${upstreamPath === "/" ? "" : upstreamPath}${search}`,
    `https://${DOCS_UPSTREAM_HOST}/`
  );
};
