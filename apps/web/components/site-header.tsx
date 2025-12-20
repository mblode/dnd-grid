import Link from "next/link"
import { siteConfig } from "@/lib/config"

export function SiteHeader() {
  return (
    <header className="w-full py-6">
      <div className="container-wrapper">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-medium">
            dnd-grid
          </Link>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <a
              href={siteConfig.links.docs}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Docs
            </a>
            <a
              href={siteConfig.links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </nav>
        </div>
      </div>
    </header>
  )
}
