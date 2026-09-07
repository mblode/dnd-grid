import Link from "next/link";
import { getSingletonHighlighter } from "shiki";

import { BlocksGrid } from "@/components/blocks-grid";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TrackedCopyButton } from "@/components/tracked-copy-button";
import { TrackedLink } from "@/components/tracked-link";
import { Button } from "@/components/ui/button";
import { ZoneBreadcrumb } from "@/components/zone-breadcrumb";
import { siteConfig } from "@/lib/config";
import { siteGraph } from "@/lib/schema";

const INSTALL_COMMAND = "npm install @dnd-grid/react";
const STYLE_IMPORT = '@import "@dnd-grid/react/styles.css";';
const USAGE_IMPORT_SNIPPET = `import { DndGrid, type Layout } from "@dnd-grid/react"`;
const USAGE_COMPONENT_SNIPPET = `<DndGrid
  layout={layout}
  cols={12}
  rowHeight={50}
  onLayoutChange={setLayout}
>
  {layout.map((item) => (
    <div key={item.id}>{item.id}</div>
  ))}
</DndGrid>`;

const highlighterOptions = {
  themes: ["github-light", "github-dark"],
  langs: ["bash", "css", "tsx"],
};
let highlighterPromise: ReturnType<typeof getSingletonHighlighter> | null =
  null;

const getHighlighter = () => {
  if (!highlighterPromise) {
    highlighterPromise = getSingletonHighlighter(highlighterOptions);
  }
  return highlighterPromise;
};

async function getCodeHtml(code: string, lang: "bash" | "css" | "tsx") {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code, {
    lang,
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
  });
}

const shikiClassName =
  "overflow-x-auto pb-4 text-xs md:text-sm [&>pre]:m-0 [&>pre]:p-0 [&>pre]:!bg-transparent [&>pre]:!font-mono [&>pre>code]:!font-mono dark:[&>pre]:!text-[color:var(--shiki-dark)] dark:[&>pre_span]:!text-[color:var(--shiki-dark)]";

export default async function Home() {
  const [installHtml, styleHtml, usageImportHtml, usageComponentHtml] =
    await Promise.all([
      getCodeHtml(INSTALL_COMMAND, "bash"),
      getCodeHtml(STYLE_IMPORT, "css"),
      getCodeHtml(USAGE_IMPORT_SNIPPET, "tsx"),
      getCodeHtml(USAGE_COMPONENT_SNIPPET, "tsx"),
    ]);

  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd data={siteGraph} />
      <SiteHeader />

      <main className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col">
          <div className="bg-linear-to-b from-white to-[#f7ecd2] dark:from-background dark:to-card">
            {/* The edge back to the hub, above the fold and matching the
                BreadcrumbList in lib/schema.ts exactly. Rule 4 of
                blode-co/apps/web/.claude/knowledge/zone-conventions.md. */}
            <div className="container-wrapper pt-4">
              <ZoneBreadcrumb product={siteConfig.name} />
            </div>

            <section className="py-16 text-center md:py-24">
              <div className="container-wrapper">
                <h1 className="font-light font-sans text-6xl tracking-tight md:text-7xl">
                  React drag-and-drop grid
                </h1>
                <p className="mx-auto mt-4 max-w-125 text-balance text-center font-sans text-2xl text-foreground/60 md:text-3xl">
                  A drag-and-drop, resizable grid layout for React
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                  <Button asChild size="lg">
                    <TrackedLink
                      action="open_docs"
                      href={siteConfig.links.docs}
                      label="Get started"
                    >
                      Get started
                    </TrackedLink>
                  </Button>

                  <Button asChild size="lg" variant="outline">
                    <TrackedLink
                      action="open_github"
                      href={siteConfig.links.github}
                      label="GitHub"
                    >
                      GitHub
                    </TrackedLink>
                  </Button>
                </div>

                <code className="relative mt-8 inline-flex items-center gap-2 font-mono text-sm">
                  <div className="max-w-100 truncate">
                    npm install @dnd-grid/react
                  </div>
                  <TrackedCopyButton
                    action="copy_install_command"
                    content="npm install @dnd-grid/react"
                    label="Copy install command"
                    size="xs"
                    variant="ghost"
                  />
                </code>
              </div>
            </section>

            <section className="flex-1 pb-16">
              <div className="mx-auto w-full max-w-screen-2xl px-2 lg:px-4">
                <div className="mx-auto max-w-5xl">
                  <BlocksGrid />
                </div>
              </div>
            </section>
          </div>

          <section className="border-y bg-muted/20 py-16">
            <div className="container-wrapper">
              <div className="mx-auto max-w-5xl">
                <h2 className="font-sans font-semibold text-2xl tracking-tight">
                  A practical grid for React dashboards and editors
                </h2>
                <p className="mt-3 max-w-3xl text-muted-foreground leading-relaxed">
                  DnD Grid turns React children into draggable and resizable
                  tiles. You own the layout state; the library handles pointer
                  and keyboard interaction, collision detection, compaction,
                  responsive columns, and size constraints.
                </p>
                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                  <Link
                    className="underline underline-offset-4"
                    href="/examples/basic"
                  >
                    Basic controlled grid
                  </Link>
                  <Link
                    className="underline underline-offset-4"
                    href="/examples/responsive"
                  >
                    Responsive dashboard
                  </Link>
                  <Link
                    className="underline underline-offset-4"
                    href="/examples/constraints"
                  >
                    Constrained resizing
                  </Link>
                  <Link
                    className="underline underline-offset-4"
                    href="/examples/localstorage"
                  >
                    Saved layouts
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <section className="pb-16">
            <div className="container-wrapper">
              <div className="mx-auto max-w-5xl">
                <div className="mt-16 space-y-10">
                  <div className="space-y-4">
                    <h2 className="font-sans font-semibold text-2xl text-foreground tracking-tight">
                      Installation
                    </h2>
                    <div className="relative rounded-2xl bg-muted/50 p-4 pr-14 pb-0">
                      <TrackedCopyButton
                        action="copy_install_command"
                        className="absolute top-3 right-3"
                        content={INSTALL_COMMAND}
                        label="Copy install command"
                        size="xs"
                        variant="ghost"
                      />
                      <div
                        className={shikiClassName}
                        dangerouslySetInnerHTML={{ __html: installHtml }}
                      />
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Add the styles to your global CSS file (e.g.{" "}
                      <code className="text-foreground">globals.css</code>):
                    </p>
                    <div className="relative rounded-2xl bg-muted/50 p-4 pr-14 pb-0">
                      <TrackedCopyButton
                        action="copy_style_import"
                        className="absolute top-3 right-3"
                        content={STYLE_IMPORT}
                        label="Copy stylesheet import"
                        size="xs"
                        variant="ghost"
                      />
                      <div
                        className={shikiClassName}
                        dangerouslySetInnerHTML={{ __html: styleHtml }}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h2 className="font-sans font-semibold text-2xl text-foreground tracking-tight">
                      Usage
                    </h2>
                    <div className="relative rounded-2xl bg-muted/50 p-4 pr-14 pb-0">
                      <TrackedCopyButton
                        action="copy_usage_import"
                        className="absolute top-3 right-3"
                        content={USAGE_IMPORT_SNIPPET}
                        label="Copy usage import"
                        size="xs"
                        variant="ghost"
                      />
                      <div
                        className={shikiClassName}
                        dangerouslySetInnerHTML={{ __html: usageImportHtml }}
                      />
                    </div>
                    <div className="relative rounded-2xl bg-muted/50 p-4 pr-14 pb-0">
                      <TrackedCopyButton
                        action="copy_usage_example"
                        className="absolute top-3 right-3"
                        content={USAGE_COMPONENT_SNIPPET}
                        label="Copy React grid example"
                        size="xs"
                        variant="ghost"
                      />
                      <div
                        className={shikiClassName}
                        dangerouslySetInnerHTML={{
                          __html: usageComponentHtml,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <SiteFooter />
        </div>
      </main>
    </div>
  );
}
