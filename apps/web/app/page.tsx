import { cache } from "react";
import { createHighlighter } from "shiki";
import { CopyButton } from "@/components/animate-ui/components/buttons/copy";
import { BlocksGrid } from "@/components/blocks-grid";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

const INSTALL_COMMAND = "npm install @dnd-grid/react";
const STYLE_IMPORT = '@import "@dnd-grid/react/styles.css";';
const USAGE_IMPORT_SNIPPET = `import { DndGrid, type Layout } from "@dnd-grid/react"`;
const USAGE_COMPONENT_SNIPPET = `<DndGrid
  layout={layout}
  cols={12}
  rowHeight={50}
  width={1200}
  onLayoutChange={setLayout}
>
  {layout.map((item) => (
    <div key={item.i}>{item.i}</div>
  ))}
</DndGrid>`;

const getHighlighter = cache(async () =>
  createHighlighter({
    themes: ["github-light", "github-dark"],
    langs: ["bash", "css", "tsx"],
  }),
);

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
  "overflow-x-auto text-xs md:text-sm [&>pre]:m-0 [&>pre]:p-0 [&>pre]:!bg-transparent [&>pre]:!font-mono [&>pre>code]:!font-mono dark:[&>pre]:!text-[color:var(--shiki-dark)] dark:[&>pre_span]:!text-[color:var(--shiki-dark)]";

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
      <SiteHeader />

      <main className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col">
          <div className="bg-linear-to-b from-white to-[#f7ecd2] dark:from-card dark:to-card">
            <section className="py-16 md:py-24 text-center">
              <div className="container-wrapper">
                <h1 className="text-7xl font-light tracking-tight">dnd-grid</h1>
                <p className="mt-4 text-2xl md:text-3xl text-balance mx-auto text-center text-foreground/60 max-w-125">
                  A drag-and-drop, resizable grid layout for React
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                  <Button asChild size="lg">
                    <a href="https://dnd-grid.com/docs">Get started</a>
                  </Button>

                  <Button asChild size="lg" variant="outline">
                    <a href="https://github.com/mblode/dnd-grid">GitHub</a>
                  </Button>
                </div>

                <code className="mt-8 relative font-mono text-sm inline-flex items-center gap-2">
                  <div className="truncate max-w-100">
                    npm install @dnd-grid/react
                  </div>
                  <CopyButton
                    content="npm install @dnd-grid/react"
                    variant="ghost"
                    size="xs"
                  />
                </code>
              </div>
            </section>

            <section className="flex-1 pb-16">
              <div className="container-wrapper">
                <div className="mx-auto max-w-5xl">
                  <BlocksGrid />
                </div>
              </div>
            </section>
          </div>

          <section className="pb-16">
            <div className="container-wrapper">
              <div className="mx-auto max-w-5xl">
                <div className="mt-16 space-y-10">
                  <div className="space-y-4">
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                      Installation
                    </h2>
                    <div className="relative rounded-2xl bg-muted/50 p-4">
                      <CopyButton
                        content={INSTALL_COMMAND}
                        variant="ghost"
                        size="xs"
                        className="absolute right-3 top-3"
                      />
                      <div
                        className={shikiClassName}
                        dangerouslySetInnerHTML={{ __html: installHtml }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Add the styles to your global CSS file (e.g.{" "}
                      <code className="text-foreground">globals.css</code>):
                    </p>
                    <div className="relative rounded-2xl bg-muted/50 p-4">
                      <CopyButton
                        content={STYLE_IMPORT}
                        variant="ghost"
                        size="xs"
                        className="absolute right-3 top-3"
                      />
                      <div
                        className={shikiClassName}
                        dangerouslySetInnerHTML={{ __html: styleHtml }}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                      Usage
                    </h2>
                    <div className="relative rounded-2xl bg-muted/50 p-4">
                      <CopyButton
                        content={USAGE_IMPORT_SNIPPET}
                        variant="ghost"
                        size="xs"
                        className="absolute right-3 top-3"
                      />
                      <div
                        className={shikiClassName}
                        dangerouslySetInnerHTML={{ __html: usageImportHtml }}
                      />
                    </div>
                    <div className="relative rounded-2xl bg-muted/50 p-4">
                      <CopyButton
                        content={USAGE_COMPONENT_SNIPPET}
                        variant="ghost"
                        size="xs"
                        className="absolute right-3 top-3"
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
