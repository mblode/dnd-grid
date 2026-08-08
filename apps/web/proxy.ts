import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { basePath } from "@/lib/config";
import {
  buildUpstreamUrl,
  isDocsAssetPath,
  isDocsMountPath,
  PUBLIC_ASSET_PREFIX,
  PUBLIC_DOCS_BASE,
  rewriteDocsHtml,
  rewriteDocsLocation,
  stripZoneBasePath,
} from "@/lib/docs-proxy";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
]);

const toPassthroughHeaders = (
  upstream: Headers,
  { isHtml }: { isHtml: boolean }
): Headers => {
  const headers = new Headers();
  upstream.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) {
      return;
    }
    // Drop upstream routing breadcrumbs; they describe the tenant app, not us.
    if (lower === "x-matched-path" || lower.startsWith("x-vercel-")) {
      return;
    }
    // Never inherit a tenant/CDN CSP or long-lived HTML cache — the zone proxy
    // rewrites asset URLs and must not keep a stale CSP from an earlier deploy.
    if (
      lower === "content-security-policy" ||
      lower === "content-security-policy-report-only" ||
      (isHtml &&
        (lower === "age" ||
          lower === "cdn-cache-control" ||
          lower === "cache-control" ||
          lower === "expires" ||
          lower === "etag" ||
          lower === "last-modified"))
    ) {
      return;
    }
    if (lower === "link") {
      headers.set(
        key,
        value
          .replaceAll("/_docs/", `${PUBLIC_ASSET_PREFIX}/`)
          .replaceAll("</docs/", `<${PUBLIC_DOCS_BASE}/`)
          .replaceAll("</llms", `<${PUBLIC_DOCS_BASE}/llms`)
          .replaceAll(
            /https:\/\/[^>\s]+\/files\/logo\/(light|dark)\.svg/g,
            `${basePath}/logo/$1.svg`
          )
          .replaceAll(
            /https:\/\/[^>\s]+\/files\/favicon\.svg/g,
            `${basePath}/logo/favicon.svg`
          )
      );
      return;
    }
    headers.set(key, value);
  });

  if (isHtml) {
    headers.set("Cache-Control", "private, no-cache, must-revalidate");
  }

  return headers;
};

const proxyDocsRequest = async (
  request: NextRequest
): Promise<Response | null> => {
  const zoneRelativePath = stripZoneBasePath(request.nextUrl.pathname);

  if (
    !(isDocsMountPath(zoneRelativePath) || isDocsAssetPath(zoneRelativePath))
  ) {
    return null;
  }

  const upstreamUrl = buildUpstreamUrl(
    zoneRelativePath,
    request.nextUrl.search
  );

  // Ask the tenant host for content. Do not forward blode.co as
  // X-Forwarded-Host — blodemd tenancy treats that as a custom-domain lookup
  // and 404s because blode.co is not registered on this tenant.
  const proxyHeaders = new Headers({
    Accept: request.headers.get("Accept") ?? "*/*",
    "User-Agent":
      request.headers.get("User-Agent") ?? "dnd-grid-docs-proxy/1.0",
  });
  const acceptLanguage = request.headers.get("Accept-Language");
  if (acceptLanguage) {
    proxyHeaders.set("Accept-Language", acceptLanguage);
  }

  const upstreamResponse = await fetch(upstreamUrl, {
    headers: proxyHeaders,
    method: request.method,
    redirect: "manual",
  });

  const location = upstreamResponse.headers.get("Location");
  if (location) {
    const rewrittenLocation = rewriteDocsLocation(location, request.nextUrl);
    if (rewrittenLocation) {
      const headers = toPassthroughHeaders(upstreamResponse.headers, {
        isHtml: false,
      });
      headers.set("Location", rewrittenLocation);
      return new Response(upstreamResponse.body, {
        headers,
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
      });
    }
  }

  const contentType = upstreamResponse.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    return new Response(upstreamResponse.body, {
      headers: toPassthroughHeaders(upstreamResponse.headers, {
        isHtml: false,
      }),
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
    });
  }

  const rewrittenHtml = rewriteDocsHtml(await upstreamResponse.text());
  return new Response(rewrittenHtml, {
    headers: toPassthroughHeaders(upstreamResponse.headers, { isHtml: true }),
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
  });
};

export async function proxy(request: NextRequest) {
  const docsResponse = await proxyDocsRequest(request);
  if (docsResponse) {
    return docsResponse;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/docs", "/docs/:path*", "/_docs/:path*"],
};
