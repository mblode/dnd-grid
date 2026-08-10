import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/json-ld";
import { exampleDetails } from "@/examples/details";
import { examples, examplesBySlug } from "@/examples/manifest";
import { siteConfig, siteUrl } from "@/lib/config";
import { exampleGraph } from "@/lib/schema";
import { cn } from "@/lib/utils";

const EXAMPLE_SUFFIX_REGEX = /-example$/;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ embed?: string }>;
}

const docsSlugFromExample = (slug: string) =>
  slug.replace(EXAMPLE_SUFFIX_REGEX, "");

// Resolve only exact canonical (`-example`) slugs. Bare slugs are
// non-canonical duplicates and must 404 instead of serving the same content
// under a second URL.
const resolveExample = (slug?: string | null) =>
  slug ? (examplesBySlug[slug] ?? null) : null;

// Bare docs slugs are redirected by the worker and unknown slugs should 404,
// so only the canonical slugs generated below are allowed to render.
export const dynamicParams = false;

export function generateStaticParams() {
  // Only pre-render the canonical `-example` slugs. The bare docs slugs
  // (e.g. `basic`) are non-canonical duplicates: the Cloudflare worker
  // redirects them to the docs site, so generating them here just creates
  // duplicate, non-canonical pages.
  return examples.map((example) => ({ slug: example.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const example = resolveExample(slug);
  if (!example) {
    return {};
  }

  // Bare, not `${example.title} - dnd-grid`: the layout's "%s | DnD Grid"
  // template already appends the product, and the hand-rolled suffix both
  // duplicated it and used the hyphen Rule 8 bans.
  // blode-co/apps/web/.claude/knowledge/zone-conventions.md
  const title = example.title;

  // The layout's title template reaches `<title>` but not `og:title`: Next
  // resolves the card title against `openGraph.title.template`, which is a
  // different thing. Without this the card reads "Basic example" and never
  // names the product.
  const cardTitle = `${title} | ${siteConfig.name}`;

  return {
    title,
    description: example.description,
    alternates: { canonical: `${siteUrl}/examples/${example.slug}` },
    openGraph: {
      type: "website",
      // A page-level `openGraph` replaces the layout's rather than merging into
      // it, so omitting this dropped og:site_name from every example page.
      // Rule 9: always the person, never the product.
      siteName: "Matthew Blode",
      title: cardTitle,
      description: example.description,
      url: `${siteUrl}/examples/${example.slug}`,
      // Extensionless: the card is `app/opengraph-image.tsx`. Path without
      // `/dnd-grid`: `metadataBase` already carries the zone.
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${example.title} example for ${siteConfig.name}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      creator: "@mattblode",
      title: cardTitle,
      description: example.description,
      images: ["/opengraph-image"],
    },
  };
}

export default async function ExamplePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const example = resolveExample(slug);
  if (!example) {
    notFound();
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const isEmbed =
    resolvedSearchParams.embed === "1" || resolvedSearchParams.embed === "true";
  const Component = example.Component;
  const sourceUrl = `${siteConfig.links.docs}/examples/${docsSlugFromExample(
    example.slug
  )}`;
  const githubUrl = `https://github.com/mblode/dnd-grid/blob/main/apps/web/examples/dnd-grid-${example.slug}.tsx`;
  const frame = <Component />;
  const detail = exampleDetails[example.slug];
  const relatedExamples = (detail?.related ?? [])
    .map((slug) => examplesBySlug[slug])
    .filter((related) => related !== undefined);

  return (
    <main className={cn({ "py-8": !isEmbed })}>
      {/* Not in embed mode: this route also renders inside an iframe on the
          docs site, and a page's structured data does not belong in a frame. */}
      {!isEmbed && (
        <JsonLd
          data={exampleGraph({
            description: example.description,
            slug: example.slug,
            title: example.title,
          })}
        />
      )}
      {!isEmbed && (
        <div className="container-wrapper">
          <div className="mb-8 space-y-3">
            <h1 className="font-semibold text-3xl text-foreground tracking-tight">
              {example.title}
            </h1>
            <p className="text-base text-muted-foreground">
              {example.description}
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <a
                className="rounded-full border border-border px-3 py-1 transition hover:bg-muted"
                href={sourceUrl}
              >
                View docs
              </a>
              <a
                className="rounded-full border border-border px-3 py-1 transition hover:bg-muted"
                href={githubUrl}
              >
                View source on GitHub
              </a>
            </div>
          </div>
        </div>
      )}

      <div className={cn({ "container-wrapper": !isEmbed })}>{frame}</div>

      {!isEmbed && detail && (
        <div className="container-wrapper">
          <div className="mt-12 max-w-2xl space-y-10">
            <section className="space-y-3">
              <h2 className="font-semibold text-foreground text-xl tracking-tight">
                How it works
              </h2>
              {detail.body.map((paragraph) => (
                <p
                  className="text-base text-muted-foreground leading-relaxed"
                  key={paragraph}
                >
                  {paragraph}
                </p>
              ))}
            </section>

            <section className="space-y-3">
              <h2 className="font-semibold text-foreground text-xl tracking-tight">
                Related examples
              </h2>
              <ul className="space-y-2">
                {relatedExamples.map((related) => (
                  <li key={related.slug}>
                    <Link
                      className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
                      href={`/examples/${related.slug}`}
                    >
                      {related.title}
                    </Link>
                    <span className="text-muted-foreground">
                      {" — "}
                      {related.description}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
