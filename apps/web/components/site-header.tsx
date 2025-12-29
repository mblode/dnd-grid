import Link from "next/link";
import { Logo } from "@/components/logo";
import { siteConfig } from "@/lib/config";

export function SiteHeader() {
  return (
    <header className="w-full py-6">
      <div className="container-wrapper">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg underline-offset-2 hover:underline font-serif"
          >
            <Logo className="h-6 w-6 text-foreground" />
            <span>dnd-grid</span>
          </Link>
          <nav className="flex items-center gap-6">
            <a
              href={siteConfig.links.docs}
              className="underline-offset-2 hover:underline"
            >
              Docs
            </a>
            <a
              href={siteConfig.links.github}
              className="underline-offset-2 hover:underline"
            >
              GitHub
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
