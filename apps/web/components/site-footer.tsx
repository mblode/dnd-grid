import { asset, siteConfig } from "@/lib/config";

/*
 * blode.co and blode.co/projects are this same origin behind a rewrite, so both
 * are internal links: same tab, and no rel="noopener noreferrer", which only
 * means something cross-origin. The projects link is the edge back to the hub,
 * without which this zone is a dead end for crawlers and readers. See
 * blode-co/apps/web/.claude/knowledge/zone-conventions.md.
 */
export const SiteFooter = () => (
  <footer className="flex flex-col items-center justify-center gap-2 pt-16 pb-8 text-muted-foreground text-sm">
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center justify-center gap-1.5">
        <li>
          <a
            className="transition-colors hover:text-foreground"
            href="https://blode.co/"
          >
            Home
          </a>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <a
            className="transition-colors hover:text-foreground"
            href={siteConfig.links.projects}
          >
            Projects
          </a>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <a
            aria-current="page"
            className="text-foreground"
            href={siteConfig.url}
          >
            {siteConfig.name}
          </a>
        </li>
      </ol>
    </nav>
    <div className="flex items-center gap-1">
      Crafted by
      <a
        className="flex items-center gap-2 rounded-full py-1.5 pr-2.5 pl-1.5 transition-colors hover:text-foreground"
        href={siteConfig.links.author}
        rel="author"
      >
        {/* Plain img: next/image is overhead for a 20px avatar; asset() prefixes basePath. */}
        <img
          alt=""
          className="rounded-full"
          height={20}
          loading="lazy"
          src={asset("/avatar-sm.png")}
          width={20}
        />
        Matthew Blode
      </a>
    </div>
    <div className="flex items-center gap-2 text-muted-foreground/30">
      <span className="text-muted-foreground">v{siteConfig.version}</span>
      <span aria-hidden="true">·</span>
      <a
        className="text-muted-foreground transition-colors hover:text-foreground"
        href={siteConfig.links.projects}
      >
        All projects
      </a>
      <span aria-hidden="true">·</span>
      <a
        className="text-muted-foreground transition-colors hover:text-foreground"
        href={siteConfig.links.github}
        rel="noopener noreferrer"
        target="_blank"
      >
        GitHub
      </a>
    </div>
  </footer>
);
