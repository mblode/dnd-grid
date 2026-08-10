import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import type React from "react";

import { siteConfig, siteUrl } from "@/lib/config";

import "./globals.css";
import "@dnd-grid/react/styles.css";

const glide = localFont({
  src: [
    { path: "../public/glide-variable.woff2", style: "normal" },
    { path: "../public/glide-variable-italic.woff2", style: "italic" },
  ],
  variable: "--font-glide",
  weight: "400 900",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const GA_MEASUREMENT_ID = "G-DZD6C8C6HT";
// "Product: what it does", colon and not a hyphen, under 60 characters so the
// SERP does not truncate it. Rule 8 of
// blode-co/apps/web/.claude/knowledge/zone-conventions.md.
const siteTitle = "dnd-grid: a drag-and-drop, resizable grid for React";
const siteDescription =
  "dnd-grid is a lightweight drag-and-drop, resizable grid layout library for React with collision handling, compaction, responsive breakpoints, and constraints.";

export const metadata: Metadata = {
  // The zone URL, not the bare origin (Rule 11). Only correct because the card
  // is a generated `opengraph-image.tsx` route: Next does not prefix those with
  // `basePath`, so `metadataBase` supplies the prefix exactly once. Against the
  // static PNG this replaced, the two would have stacked into
  // `/dnd-grid/dnd-grid/…`.
  metadataBase: new URL(siteUrl),
  // Inner pages inherit the template; the root uses `default` as-is.
  title: {
    default: siteTitle,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteDescription,
  // Person-level attribution as metadata, not only as footer HTML and JSON-LD.
  authors: [{ name: "Matthew Blode", url: "https://blode.co" }],
  creator: "Matthew Blode",
  alternates: {
    // Absolute, no trailing slash, to match the sitemap and og:url exactly.
    canonical: siteUrl,
  },
  // No `images` here: `app/opengraph-image.tsx` is the card. Next reuses it for
  // `twitter:image` too when there is no `twitter-image` file.
  openGraph: {
    type: "website",
    // The person, not the product: every blode.co path is one site, and the
    // product name is already in og:title. Rule 9 of
    // blode-co/apps/web/.claude/knowledge/zone-conventions.md.
    siteName: "Matthew Blode",
    url: siteUrl,
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    creator: "@mattblode",
    title: siteTitle,
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${glide.variable} ${geistMono.variable} min-h-screen font-sans antialiased`}
      lang="en"
    >
      <body className="flex min-h-screen flex-col">
        {/* No JSON-LD here: the layout wraps every route, so the zone-root
            WebPage it used to emit claimed each example page was the site root.
            Each route emits its own @graph. See lib/schema.ts. */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
        </Script>
        {children}
      </body>
    </html>
  );
}
