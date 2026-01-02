import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { examples, examplesBySlug } from "@/examples/manifest";
import { cn } from "@/lib/utils";

const siteUrl = "https://dnd-grid.com";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ embed?: string }>;
}

const docsSlugFromExample = (slug: string) => slug.replace(/-example$/, "");

const resolveExample = (slug?: string | null) => {
  if (!slug) {
    return null;
  }
  if (examplesBySlug[slug]) {
    return examplesBySlug[slug];
  }
  if (!slug.endsWith("-example")) {
    return examplesBySlug[`${slug}-example`] ?? null;
  }
  return null;
};

export function generateStaticParams() {
  const params = examples.flatMap((example) => {
    const docsSlug = docsSlugFromExample(example.slug);
    return docsSlug === example.slug
      ? [{ slug: example.slug }]
      : [{ slug: example.slug }, { slug: docsSlug }];
  });
  return params;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const example = resolveExample(slug);
  if (!example) {
    return {};
  }

  return {
    title: `${example.title} - dnd-grid`,
    description: example.description,
    alternates: { canonical: `/examples/${example.slug}` },
    openGraph: {
      title: `${example.title} - dnd-grid`,
      description: example.description,
      url: `${siteUrl}/examples/${example.slug}`,
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
  const sourceUrl = `${siteUrl}/docs/examples/${docsSlugFromExample(
    example.slug
  )}`;
  const githubUrl = `https://github.com/mblode/dnd-grid/blob/main/apps/web/examples/dnd-grid-${example.slug}.tsx`;
  const frame = <Component />;

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
    </main>
  );
}
