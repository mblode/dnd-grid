import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { examples, examplesBySlug } from "@/examples/manifest";

const siteUrl = "https://dnd-grid.com";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ embed?: string }>;
};

const docsSlugFromExample = (slug: string) => slug.replace(/-example$/, "");

const resolveExample = (slug: string) => {
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
  const resolvedSearchParams = await searchParams;
  const example = resolveExample(slug);
  if (!example) {
    notFound();
  }

  const isEmbed =
    resolvedSearchParams?.embed === "1" ||
    resolvedSearchParams?.embed === "true";
  const Component = example.Component;
  const sourceUrl = `${siteUrl}/docs/examples/${docsSlugFromExample(
    example.slug,
  )}`;
  const githubUrl = `https://github.com/mblode/dnd-grid/blob/main/apps/web/examples/dnd-grid-${example.slug}.tsx`;
  const frame = (
    <div className="overflow-x-auto">
      <div className="p-2">
        <Component />
      </div>
    </div>
  );

  return (
    <main className={isEmbed ? "p-2" : "py-8"}>
      {!isEmbed && (
        <div className="container-wrapper">
          <div className="mb-8 space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {example.title}
            </h1>
            <p className="text-base text-muted-foreground">
              {example.description}
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <a
                href={sourceUrl}
                className="rounded-full border border-border px-3 py-1 transition hover:bg-muted"
              >
                View docs
              </a>
              <a
                href={githubUrl}
                className="rounded-full border border-border px-3 py-1 transition hover:bg-muted"
              >
                View source on GitHub
              </a>
            </div>
          </div>
        </div>
      )}

      <div className={isEmbed ? "" : "container-wrapper"}>
        {isEmbed ? (
          frame
        ) : (
          <div className="rounded-2xl border border-border bg-card/80 shadow-sm">
            {frame}
          </div>
        )}
      </div>
    </main>
  );
}
