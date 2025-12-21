import { BlocksGrid } from "@/components/blocks-grid"
import { CopyButton } from "@/components/animate-ui/components/buttons/copy"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1 bg-linear-to-b from-white to-[#f7ecd2] dark:from-card dark:to-card">
        <div className="flex flex-1 flex-col">
          <section className="py-16 md:py-24 text-center">
            <div className="container-wrapper">
              <h1 className="text-3xl md:text-7xl font-light tracking-tight">
                dnd grid
              </h1>
              <p className="mt-4 text-muted-foreground">
                A draggable and resizable grid layout for React.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
                <Button asChild size="lg"><a href="https://dnd-grid.com/docs">Get started</a></Button>
                <code className="relative rounded-lg bg-muted px-3 py-2 font-mono text-sm inline-flex items-center gap-2">
                  npm install @dnd-grid/react
                  <CopyButton
                    content="npm install @dnd-grid/react"
                    variant="ghost"
                    size="xs"
                  />
                </code>
              </div>
            </div>
          </section>

          <section className="flex-1 pb-16">
            <div className="container-wrapper">
              <div className="mx-auto max-w-5xl">
                <BlocksGrid />
              </div>
            </div>
          </section>

          <footer className="py-8 text-center text-sm text-muted-foreground">
            <div className="container-wrapper">
              Built by{" "}
              <a
                href="https://matthewblode.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Matthew Blode
              </a>
            </div>
          </footer>
        </div>
      </main>
    </>
  )
}
