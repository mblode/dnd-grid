import Link from "next/link";
import { Logo } from "@/components/logo";
import { siteConfig } from "@/lib/config";

export function SiteHeader() {
  return (
    <header className="w-full py-6">
      <div className="container-wrapper">
        <div className="flex items-center justify-between">
          <Link
            className="flex items-center gap-2 font-serif text-lg underline-offset-2 hover:underline"
            href="/"
          >
            <Logo className="h-6 w-6 text-foreground" />
            <span>dnd-grid</span>
          </Link>
          <nav className="flex items-center gap-6">
            <a
              className="underline-offset-2 hover:underline"
              href={siteConfig.links.docs}
            >
              Docs
            </a>
            <a
              className="underline-offset-2 hover:underline"
              href={siteConfig.links.github}
            >
              GitHub
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
