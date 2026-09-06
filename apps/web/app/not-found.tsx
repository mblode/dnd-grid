import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Page not found",
  // The layout canonicalizes to the zone root with an absolute URL, which every
  // route without its own canonical inherits — so a missing page claimed to be
  // `/dnd-grid`. And Next only injects `noindex` on a real 404, leaving
  // `/dnd-grid/_not-found`, the route it reserves for this boundary, a 200 that
  // is indexable. `null` drops the tag; `index: false` covers the 200.
  alternates: { canonical: null },
  robots: { follow: true, index: false },
};

const recovery = [
  { href: "/", label: "Overview" },
  { href: `${siteConfig.links.docs}/installation`, label: "Installation" },
  {
    href: `${siteConfig.links.docs}/api-reference/overview`,
    label: "API reference",
  },
  { href: `${siteConfig.links.docs}/examples/basic`, label: "Examples" },
] as const;

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex flex-1 flex-col justify-center py-24">
        <div className="container-wrapper">
          <div className="mx-auto max-w-2xl space-y-4 text-center">
            <p className="font-mono text-muted-foreground text-sm">404</p>
            <h1 className="font-semibold text-4xl text-foreground tracking-tight">
              Page not found
            </h1>
            <p className="text-base text-muted-foreground">
              Agents: this is a real HTTP 404, not a soft one.
            </p>
            <nav aria-label="Where to look next" className="pt-4">
              <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-muted-foreground text-sm">
                {recovery.map((link) => (
                  <li key={link.href}>
                    <Link
                      className="underline underline-offset-4 hover:no-underline"
                      href={link.href}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <SiteFooter />
      </main>
    </div>
  );
}
