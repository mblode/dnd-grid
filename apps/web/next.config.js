import { basePath } from "./lib/config.ts";

/** @type {import('next').NextConfig} */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com",
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
    // Proxied docs load logos from Vercel Blob and analytics from r.blode.co.
    // The marketing CSP must not be stamped onto /docs — browsers intersect
    // multiple CSP headers, so ours would keep blocking those hosts.
    const docsHeaders = securityHeaders.filter(
      (h) => h.key !== "Content-Security-Policy"
    );

    return [
      {
        source: "/opengraph-image.png",
        headers: [
          ...securityHeaders.filter(
            (h) => h.key !== "Cross-Origin-Resource-Policy"
          ),
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        ],
      },
      {
        source: "/twitter-image.png",
        headers: [
          ...securityHeaders.filter(
            (h) => h.key !== "Cross-Origin-Resource-Policy"
          ),
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        ],
      },
      {
        source: "/web-app-manifest-:size.png",
        headers: [
          ...securityHeaders.filter(
            (h) => h.key !== "Cross-Origin-Resource-Policy"
          ),
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        ],
      },
      {
        source: "/images/:path*",
        headers: [
          ...securityHeaders.filter(
            (h) => h.key !== "Cross-Origin-Resource-Policy"
          ),
          { key: "Cross-Origin-Resource-Policy", value: "same-site" },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          ...securityHeaders.filter(
            (h) => h.key !== "Cross-Origin-Resource-Policy"
          ),
          { key: "Cross-Origin-Resource-Policy", value: "same-site" },
        ],
      },
      {
        // basePath:false + full zone paths — a catch-all of /((?!docs)...) is
        // matched against /dnd-grid/docs when Next does not strip the basePath
        // from the tested URL, which would re-apply the marketing CSP.
        basePath: false,
        source: `${basePath}/docs`,
        headers: docsHeaders,
      },
      {
        basePath: false,
        source: `${basePath}/docs/:path*`,
        headers: docsHeaders,
      },
      {
        basePath: false,
        source: `${basePath}/_docs/:path*`,
        headers: docsHeaders,
      },
      {
        basePath: false,
        source: `${basePath}/logo/:path*`,
        headers: docsHeaders,
      },
      {
        basePath: false,
        source: basePath,
        headers: securityHeaders,
      },
      {
        basePath: false,
        source: `${basePath}/((?!docs(?:/|$)|_docs(?:/|$)|logo(?:/|$)).*)`,
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
