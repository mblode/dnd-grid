type Env = {
  DOCS_URL?: string;
  CUSTOM_URL?: string;
  LANDING_URL?: string;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const docsUrl = env?.DOCS_URL ?? "matthewblode.mintlify.dev";
      const customUrl = env?.CUSTOM_URL ?? "dnd-grid.com";
      const landingHost = env?.LANDING_URL ?? "landing.dnd-grid.com";
      const urlObject = new URL(request.url);

      // Allow Vercel/Let's Encrypt verification paths to pass through
      if (urlObject.pathname.startsWith("/.well-known/")) {
        return await fetch(request);
      }

      // Proxy requests to /docs path to Mintlify
      if (urlObject.pathname.startsWith("/docs")) {
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

        return await fetch(proxyRequest);
      }

      // Route all other traffic to landing page
      const landingUrl = new URL(request.url);
      landingUrl.hostname = landingHost;
      return await fetch(landingUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
    } catch {
      return await fetch(request);
    }
  },
};
