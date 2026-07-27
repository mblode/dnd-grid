interface Env {
  DOCS_URL?: string;
  CUSTOM_URL?: string;
  LANDING_URL?: string;
}

const DOCS_PREFIX = "/docs";
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

const isDocsPath = (pathname: string): boolean =>
  pathname === DOCS_PREFIX || pathname.startsWith(`${DOCS_PREFIX}/`);

const isNextInternalPath = (pathname: string): boolean =>
  pathname.startsWith("/_next/");

const toDocsPath = (pathname: string): string => {
  if (isDocsPath(pathname)) {
    return pathname;
  }

  return pathname === "/" ? DOCS_PREFIX : `${DOCS_PREFIX}${pathname}`;
};

const isKnownDocsPagePath = (pathname: string): boolean => {
  const normalizedPath = pathname.endsWith(".mdx")
    ? pathname.slice(0, -".mdx".length)
    : pathname;

  // Only redirect exact matches from the known docs page paths
  // Don't wildcard-match section prefixes (e.g., /examples/basic-example should NOT redirect)
  return DOCS_PAGE_PATH_SET.has(normalizedPath);
};

const getDocsRedirectPath = (
  pathname: string,
  referer: string | null
): string | null => {
  if (pathname === "/") {
    if (!referer) {
      return null;
    }

    try {
      return isDocsPath(new URL(referer).pathname) ? DOCS_PREFIX : null;
    } catch {
      return null;
    }
  }

  return isKnownDocsPagePath(pathname) ? toDocsPath(pathname) : null;
};

// biome-ignore lint/performance/useTopLevelRegex: Hoisted for reuse per call
const REGEXP_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;

const escapeRegExp = (value: string): string =>
  value.replace(REGEXP_SPECIAL_CHARS, "\\$&");

// Absolute upstream URLs may point at a docs page (`/introduction`), a page
// that already carries the prefix (`/docs/introduction`), or a shared asset
// such as `/opengraph-image.png` that lives outside `/docs` on this domain.
const normalizeDocsUrlPath = (path: string): string => {
  if (path === "" || path === "/") {
    return DOCS_PREFIX;
  }

  if (isDocsPath(path) || !isKnownDocsPagePath(path)) {
    return path;
  }

  return toDocsPath(path);
};

const shouldProxyAssetToDocs = (
  pathname: string,
  referer: string | null
): boolean => {
  if (!(isNextInternalPath(pathname) && referer)) {
    return false;
  }

  try {
    return isDocsPath(new URL(referer).pathname);
  } catch {
    return false;
  }
};

const rewriteDocsLocation = (
  location: string,
  requestUrl: URL,
  docsUrl: string,
  customUrl: string
): string | null => {
  let resolvedLocation: URL;

  try {
    resolvedLocation = new URL(location, requestUrl);
  } catch {
    return null;
  }

  const isSameOriginRedirect =
    resolvedLocation.hostname === requestUrl.hostname ||
    resolvedLocation.hostname === customUrl ||
    resolvedLocation.hostname === docsUrl;

  if (!isSameOriginRedirect) {
    return null;
  }

  if (
    resolvedLocation.pathname !== "/" &&
    !isKnownDocsPagePath(resolvedLocation.pathname)
  ) {
    return null;
  }

  resolvedLocation.protocol = requestUrl.protocol;
  resolvedLocation.host = requestUrl.host;
  resolvedLocation.pathname = toDocsPath(resolvedLocation.pathname);
  return resolvedLocation.toString();
};

const rewriteDocsHtml = (
  html: string,
  customUrl: string,
  docsUrl: string
): string => {
  let rewrittenHtml = html;
  const docsHrefPaths = ["/", ...DOCS_PAGE_PATHS];

  for (const path of docsHrefPaths) {
    const docsPath = toDocsPath(path);
    rewrittenHtml = rewrittenHtml.replaceAll(
      `href="${path}"`,
      `href="${docsPath}"`
    );
    rewrittenHtml = rewrittenHtml.replaceAll(
      `href\\":\\"${path}\\"`,
      `href\\":\\"${docsPath}\\"`
    );
    rewrittenHtml = rewrittenHtml.replaceAll(
      `"href":"${path}"`,
      `"href":"${docsPath}"`
    );
  }

  for (const path of DOCS_PAGE_PATHS) {
    const mdxPath = `${path}.mdx`;
    const docsMdxPath = toDocsPath(mdxPath);
    rewrittenHtml = rewrittenHtml.replaceAll(
      `contentUrl\\":\\"${mdxPath}\\"`,
      `contentUrl\\":\\"${docsMdxPath}\\"`
    );
    rewrittenHtml = rewrittenHtml.replaceAll(
      `"contentUrl":"${mdxPath}"`,
      `"contentUrl":"${docsMdxPath}"`
    );
  }

  // The docs origin emits absolute URLs to itself (canonical, og:url, og:image,
  // .md content URLs). Left alone they point search engines at the upstream
  // host, which makes every proxied page non-canonical and non-indexable.
  const docsOriginPattern = new RegExp(
    `https://${escapeRegExp(docsUrl)}(/[^"'\\\\\\s)]*)?`,
    "g"
  );
  rewrittenHtml = rewrittenHtml.replace(
    docsOriginPattern,
    (_match, path: string | undefined) =>
      `https://${customUrl}${normalizeDocsUrlPath(path ?? "")}`
  );

  return rewrittenHtml;
};

const proxyToDocs = async (
  request: Request,
  urlObject: URL,
  docsUrl: string,
  customUrl: string
): Promise<Response> => {
  const url = new URL(request.url);
  url.hostname = docsUrl;

  const proxyRequest = new Request(url, request);
  proxyRequest.headers.set("Host", docsUrl);
  proxyRequest.headers.set("X-Forwarded-Host", customUrl);
  proxyRequest.headers.set("X-Forwarded-Proto", "https");

  const clientIP = request.headers.get("CF-Connecting-IP");
  if (clientIP) {
    proxyRequest.headers.set("CF-Connecting-IP", clientIP);
  }

  const docsResponse = await fetch(proxyRequest);
  const location = docsResponse.headers.get("Location");
  if (location) {
    const rewrittenLocation = rewriteDocsLocation(
      location,
      urlObject,
      docsUrl,
      customUrl
    );

    if (rewrittenLocation) {
      const headers = new Headers(docsResponse.headers);
      headers.set("Location", rewrittenLocation);
      return new Response(docsResponse.body, {
        headers,
        status: docsResponse.status,
        statusText: docsResponse.statusText,
      });
    }
  }

  const contentType = docsResponse.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    return docsResponse;
  }

  const rewrittenHtml = rewriteDocsHtml(
    await docsResponse.text(),
    customUrl,
    docsUrl
  );
  return new Response(rewrittenHtml, {
    headers: docsResponse.headers,
    status: docsResponse.status,
    statusText: docsResponse.statusText,
  });
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const docsUrl = env?.DOCS_URL ?? "dnd-grid.blode.md";
      const customUrl = env?.CUSTOM_URL ?? "dnd-grid.com";
      const landingHost = env?.LANDING_URL ?? "landing.dnd-grid.com";
      const urlObject = new URL(request.url);

      // Allow Vercel/Let's Encrypt verification paths to pass through
      if (urlObject.pathname.startsWith("/.well-known/")) {
        return await fetch(request);
      }

      const docsRedirectPath = getDocsRedirectPath(
        urlObject.pathname,
        request.headers.get("Referer")
      );
      if (docsRedirectPath) {
        const redirectUrl = new URL(request.url);
        redirectUrl.pathname = docsRedirectPath;
        redirectUrl.search = urlObject.search;
        return Response.redirect(redirectUrl.toString(), 308);
      }

      // Proxy OpenGraph image requests to landing page
      if (urlObject.pathname === "/opengraph-image.png") {
        const landingUrl = new URL(request.url);
        landingUrl.hostname = landingHost;
        return await fetch(landingUrl, {
          method: request.method,
          headers: request.headers,
        });
      }

      // Proxy requests to /docs path to Blode docs
      if (
        isDocsPath(urlObject.pathname) ||
        shouldProxyAssetToDocs(
          urlObject.pathname,
          request.headers.get("Referer")
        )
      ) {
        return await proxyToDocs(request, urlObject, docsUrl, customUrl);
      }

      // Route all other traffic to landing page
      const landingUrl = new URL(request.url);
      landingUrl.hostname = landingHost;
      const landingResponse = await fetch(landingUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      // Both apps serve build output under /_next/, and the Referer header is
      // the only hint about which one a chunk belongs to. Crawlers omit it, so
      // fall back to the docs origin when the landing app has no such asset.
      if (
        landingResponse.status === 404 &&
        isNextInternalPath(urlObject.pathname) &&
        (request.method === "GET" || request.method === "HEAD")
      ) {
        return await proxyToDocs(request, urlObject, docsUrl, customUrl);
      }

      return landingResponse;
    } catch {
      return await fetch(request);
    }
  },
};
