import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { exampleDetails } from "@/examples/details";
import { examples, examplesBySlug } from "@/examples/manifest";
import { siteConfig, siteUrl } from "@/lib/config";
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

  const title = `${example.title} - dnd-grid`;

  return {
    title,
    description: example.description,
    alternates: { canonical: `${siteUrl}/examples/${example.slug}` },
    openGraph: {
      type: "website",
      title,
      description: example.description,
      url: `${siteUrl}/examples/${example.slug}`,
      images: [
        {
          url: `${siteUrl}/opengraph-image.png`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: example.description,
      images: [`${siteUrl}/opengraph-image.png`],
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
