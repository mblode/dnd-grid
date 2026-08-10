import { asset, siteConfig } from "@/lib/config";

/*
 * blode.co/projects is this same origin behind a rewrite, so the hub link is
 * internal: same tab, and no rel="noopener noreferrer". That edge back to the
 * hub keeps the zone from being a dead end for crawlers and readers. See
 * blode-co/apps/web/.claude/knowledge/zone-conventions.md.
 */
export const SiteFooter = () => (
  <footer className="flex flex-col items-center justify-center gap-2 pt-16 pb-8 text-muted-foreground text-sm">
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
        href={siteConfig.links.github}
        rel="noopener noreferrer"
        target="_blank"
      >
        GitHub
      </a>
    </div>
  </footer>
);
