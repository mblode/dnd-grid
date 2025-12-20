import { BlocksGridDemo } from "@/components/blocks-grid-demo"
import { CopyButton } from "@/components/animate-ui/components/buttons/copy"

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="py-16 md:py-24 text-center">
        <div className="container-wrapper">
          <h1 className="text-3xl md:text-4xl font-light tracking-tight">
            dnd-grid
          </h1>
          <p className="mt-4 text-muted-foreground">
            A draggable and resizable grid layout for React.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
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
            <BlocksGridDemo />
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
  )
}
