import Link from "next/link";
import { siteConfig } from "@/lib/config";

export function SiteHeader() {
  return (
    <header className="w-full py-6">
      <div className="container-wrapper">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-4xl font-medium">
            dnd grid
          </Link>
          <nav className="flex items-center gap-6 text-lg">
            <a
              href={siteConfig.links.docs}
              className="underline-offset-2 hover:text-foreground transition-colors hover:underline"
            >
              Docs
            </a>
            <a
              href={siteConfig.links.github}
              className="underline-offset-2 hover:text-foreground transition-colors hover:underline"
            >
              GitHub
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
