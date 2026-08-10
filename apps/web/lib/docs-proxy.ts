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
 * `twitter:creator` is absent from the upstream entirely: blode.md has no field
 * for it, so unlike `og:site_name` there is nothing to rewrite and the tag has
 * to be added. Rule 10 wants person-level attribution on every blode.co path,
 * and these are blode.co paths.
 *
 * Inserted into `<head>` only, not into the flight payload. Social crawlers do
 * not run JavaScript, so the served HTML is what builds the card; React may
 * drop the tag on hydration since it is not in the payload it renders from.
 * Adding it there too would mean hand-forging a serialized React element, which
 * is far more likely to break the page than to help it. The upstream `seo`
 * config is the real fix.
 */
const TWITTER_CREATOR = "@mattblode";
const TWITTER_CREATOR_META = /<meta[^>]*name="twitter:creator"[^>]*>/iu;
const HEAD_OPEN = /<head\b[^>]*>/iu;

const ensureTwitterCreator = (html: string): string => {
  if (TWITTER_CREATOR_META.test(html)) {
    return html;
  }
  return html.replace(
    HEAD_OPEN,
    (tag) => `${tag}<meta name="twitter:creator" content="${TWITTER_CREATOR}"/>`
  );
};

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

  // `og:site_name` used to be rewritten here. It now comes from
  // `apps/docs/docs.json` (`seo.siteName`, plus `metadata.ogImage` for the
  // card) once the upstream tenant config is refreshed. Until that deploy
  // lands, upstream may still emit the product name; do not reintroduce the
  // rewrite — fix the config.
  rewrittenHtml = ensureTwitterCreator(rewrittenHtml);

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
