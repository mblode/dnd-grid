import { siteConfig } from "@/lib/config";

/**
 * Stable `@id` anchors. The Person, Organization and WebSite ids belong to
 * blode.co and are only ever referenced, never redefined here. blode.co/dnd-grid
 * is a path on blode.co behind a rewrite, not a site of its own. Contract:
 * blode-co/apps/web/.claude/knowledge/zone-conventions.md
 */
const host = "https://blode.co";

export const schemaId = {
  breadcrumb: `${siteConfig.url}/#breadcrumb`,
  organization: `${host}/#organization`,
  person: `${host}/#person`,
  software: `${siteConfig.url}/#software`,
  webPage: `${siteConfig.url}/#webpage`,
  website: `${host}/#website`,
} as const;

export const siteGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@id": schemaId.webPage,
      "@type": "WebPage",
      about: { "@id": schemaId.software },
      breadcrumb: { "@id": schemaId.breadcrumb },
      description: siteConfig.description,
      inLanguage: "en-US",
      isPartOf: { "@id": schemaId.website },
      name: siteConfig.name,
      url: siteConfig.url,
    },
    // SoftwareSourceCode rather than SoftwareApplication: Google's Software App
    // rich result wants offers plus aggregateRating/review, and inventing ratings
    // for our own package fails validation. Keep the entity honest.
    {
      "@id": schemaId.software,
      "@type": "SoftwareSourceCode",
      author: { "@id": schemaId.person },
      codeRepository: siteConfig.links.github,
      description: siteConfig.description,
      isAccessibleForFree: true,
      isPartOf: { "@id": schemaId.website },
      license: "https://opensource.org/licenses/MIT",
      name: siteConfig.name,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      programmingLanguage: "TypeScript",
      publisher: { "@id": schemaId.organization },
      runtimePlatform: "React",
      url: siteConfig.links.npm,
    },
    {
      "@id": schemaId.breadcrumb,
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", item: `${host}/`, name: "Home", position: 1 },
        {
          "@type": "ListItem",
          item: `${host}/projects`,
          name: "Projects",
          position: 2,
        },
        {
          "@type": "ListItem",
          item: siteConfig.url,
          name: siteConfig.name,
          position: 3,
        },
      ],
    },
  ],
};
