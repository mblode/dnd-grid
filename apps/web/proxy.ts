import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

const toPassthroughHeaders = (upstream: Headers): Headers => {
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
    if (lower === "link") {
      headers.set(
        key,
        value
          .replaceAll("/_docs/", `${PUBLIC_ASSET_PREFIX}/`)
          .replaceAll("</docs/", `<${PUBLIC_DOCS_BASE}/`)
          .replaceAll("</llms", `<${PUBLIC_DOCS_BASE}/llms`)
      );
      return;
    }
    headers.set(key, value);
  });
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
      const headers = toPassthroughHeaders(upstreamResponse.headers);
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
      headers: toPassthroughHeaders(upstreamResponse.headers),
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
    });
  }

  const rewrittenHtml = rewriteDocsHtml(await upstreamResponse.text());
  return new Response(rewrittenHtml, {
    headers: toPassthroughHeaders(upstreamResponse.headers),
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
