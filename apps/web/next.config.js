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
    // Apex worker 301s /docs → blode.co/dnd-grid/docs for GSC; forward to the
    // real docs host so users don't land on a zone 404. Canonical docs paths
    // omit the /docs prefix (see dnd-grid.blode.md sitemap).
    // statusCode 301 (not permanent:true/308) — GSC change-of-address samples prefer 301.
    const docsHostRedirects = [
      {
        destination: "https://dnd-grid.blode.md",
        source: "/docs",
        statusCode: 301,
      },
      {
        destination: "https://dnd-grid.blode.md/:path*",
        source: "/docs/:path*",
        statusCode: 301,
      },
      {
        destination: "https://dnd-grid.blode.md/_docs/:path*",
        source: "/_docs/:path*",
        statusCode: 301,
      },
    ];

    const apexRedirects = redirectHosts.flatMap((host) => {
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

    return [...docsHostRedirects, ...apexRedirects];
  },
  async headers() {
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
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
