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

/**
 * One `@graph` per page, never one script per node: disconnected blocks cannot
 * be merged into a single entity, so they describe unrelated things. Rule 3 of
 * blode-co/apps/web/.claude/knowledge/zone-conventions.md.
 */
const graphJsonLd = (nodes: object[]) => ({
  "@context": "https://schema.org",
  "@graph": nodes,
});

/**
 * Matthew Blode -> Projects -> DnD Grid, then any deeper page in the zone.
 *
 * The trail starts at the blode.co root, not at this zone: a trail rooted on
 * /dnd-grid tells Google the zone is a site of its own. The root crumb is named
 * "Matthew Blode" and must read identically in the visible trail
 * (`components/zone-breadcrumb.tsx`), or the mismatch is a markup error.
 *
 * The `@id` belongs to the page the trail ends on, not to the zone root: one id
 * republished with different contents on every URL is not two breadcrumbs.
 */
const breadcrumbNode = (trail: { name: string; url: string }[]) => ({
  "@id": `${trail.at(-1)?.url ?? siteConfig.url}/#breadcrumb`,
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      item: `${host}/`,
      name: "Matthew Blode",
      position: 1,
    },
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
    ...trail.map((item, index) => ({
      "@type": "ListItem",
      item: item.url,
      name: item.name,
      position: index + 4,
    })),
  ],
});

/**
 * The zone root. Emitted from `app/page.tsx` rather than the layout: in the
 * layout it stamped this WebPage's `@id` and `url` onto every example page too,
 * so each of them claimed to be the zone root.
 */
export const siteGraph = graphJsonLd([
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
  breadcrumbNode([]),
]);

/**
 * An example page. It is a demo of the library, so it points `about` at the
 * same `SoftwareSourceCode` node the root describes rather than declaring a
 * second package.
 */
export const exampleGraph = ({
  description,
  slug,
  title,
}: {
  description: string;
  slug: string;
  title: string;
}) => {
  const url = `${siteConfig.url}/examples/${slug}`;

  return graphJsonLd([
    {
      "@id": `${url}/#webpage`,
      "@type": "WebPage",
      about: { "@id": schemaId.software },
      breadcrumb: { "@id": `${url}/#breadcrumb` },
      description,
      inLanguage: "en-US",
      isPartOf: { "@id": schemaId.website },
      name: title,
      url,
    },
    breadcrumbNode([{ name: title, url }]),
  ]);
};
