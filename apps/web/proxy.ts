import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  buildUpstreamUrl,
  DOCS_UPSTREAM_HOST,
  isDocsAssetPath,
  isDocsMountPath,
  rewriteDocsHtml,
  rewriteDocsLocation,
  stripZoneBasePath,
} from "@/lib/docs-proxy";

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

  const proxyHeaders = new Headers(request.headers);
  proxyHeaders.set("Host", DOCS_UPSTREAM_HOST);
  proxyHeaders.set("X-Forwarded-Host", "blode.co");
  proxyHeaders.set("X-Forwarded-Proto", "https");
  proxyHeaders.delete("accept-encoding");

  const upstreamResponse = await fetch(upstreamUrl, {
    headers: proxyHeaders,
    method: request.method,
    redirect: "manual",
  });

  const location = upstreamResponse.headers.get("Location");
  if (location) {
    const rewrittenLocation = rewriteDocsLocation(location, request.nextUrl);
    if (rewrittenLocation) {
      const headers = new Headers(upstreamResponse.headers);
      headers.set("Location", rewrittenLocation);
      headers.delete("content-encoding");
      headers.delete("content-length");
      return new Response(upstreamResponse.body, {
        headers,
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
      });
    }
  }

  const contentType = upstreamResponse.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    return upstreamResponse;
  }

  const rewrittenHtml = rewriteDocsHtml(await upstreamResponse.text());
  const headers = new Headers(upstreamResponse.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  return new Response(rewrittenHtml, {
    headers,
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
