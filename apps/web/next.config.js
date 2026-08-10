import { basePath } from "./lib/config.ts";

// Analytics is proxied through r.blode.co so tracker blockers do not drop it.
// Defaulted rather than left empty: an unset var would compile down to
// `connect-src 'self'`, which is how this policy blocked PostHog outright.
// `instrumentation-client.ts` has been initialising a client that could never
// reach its host since this CSP shipped — measured in the browser on
// blode.co/dnd-grid/examples, where both the fetch and the script tag to
// r.blode.co were refused while curl fetched the same URLs fine.
const posthogOrigin =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://r.blode.co";

/** @type {import('next').NextConfig} */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com ${posthogOrigin}`,
  `connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com ${posthogOrigin}`,
  "img-src 'self' data: https://www.google-analytics.com https://images.unsplash.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Docs on dnd-grid.blode.md (and the apex/zone cutover hosts) embed
  // /examples/?embed=1 iframes.
  "frame-ancestors 'self' https://dnd-grid.com https://blode.co https://dnd-grid.blode.md",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // X-Frame-Options cannot list multiple origins; CSP frame-ancestors owns this.
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

// Apex + www stay attached to this Vercel project during cutover. The public
// *.blode.co vanity host also 301s here. The zone origin
// (dnd-grid.zone.blode.co) must not appear — blode.co proxies through it and a
// redirect would loop.
const redirectHosts = ["dnd-grid.com", "www.dnd-grid.com", "dnd-grid.blode.co"];

const nextConfig = {
  assetPrefix: basePath,
  basePath,
  experimental: {
    // Enable filesystem caching for `next dev`
    turbopackFileSystemCacheForDev: true,
    // Enable filesystem caching for `next build`
    turbopackFileSystemCacheForBuild: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  redirects() {
    // Apex + vanity hosts 301 onto the blode.co zone. Docs under /docs are
    // proxied in proxy.ts (not redirected) so blode.co/dnd-grid/docs stays.
    return redirectHosts.flatMap((host) => {
      const has = [{ type: "host", value: host }];
      return [
        {
          basePath: false,
          destination: `https://blode.co${basePath}`,
          has,
          permanent: true,
          source: basePath,
        },
        {
          basePath: false,
          destination: `https://blode.co${basePath}/:path*`,
          has,
          permanent: true,
          source: `${basePath}/:path*`,
        },
        {
          basePath: false,
          destination: `https://blode.co${basePath}`,
          has,
          permanent: true,
          source: "/",
        },
        {
          basePath: false,
          destination: `https://blode.co${basePath}/:path*`,
          has,
          permanent: true,
          source: "/:path*",
        },
      ];
    });
  },
  async headers() {
    /*
     * Every matching rule applies in array order and a later one wins per
     * header key, so the catch-all goes FIRST and the CORP overrides after it.
     *
     * Pattern is `/:path*` rather than `/(.*)`: with `basePath` set Next
     * prefixes the source, and `/dnd-grid/(.*)` does not match the bare
     * `/dnd-grid`. Stratasync uses the same shape.
     *
     * CSP is included on proxied docs too. The zone proxy rewrites Blob logo
     * URLs onto `/logo/*` and `_docs` assets onto the zone prefix, so the
     * product policy (same allowlist stratasync serves on /docs) does not blank
     * the page. proxy.ts still drops any upstream CSP so browsers do not
     * intersect a second, conflicting policy.
     */
    const crossOriginResourcePolicy = (value) => [
      { key: "Cross-Origin-Resource-Policy", value },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/opengraph-image",
        headers: crossOriginResourcePolicy("cross-origin"),
      },
      {
        source: "/web-app-manifest-:size.png",
        headers: crossOriginResourcePolicy("cross-origin"),
      },
      {
        source: "/images/:path*",
        headers: crossOriginResourcePolicy("same-site"),
      },
      {
        source: "/fonts/:path*",
        headers: crossOriginResourcePolicy("same-site"),
      },
    ];
  },
};

export default nextConfig;
