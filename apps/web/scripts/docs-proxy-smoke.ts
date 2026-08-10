import assert from "node:assert/strict";

import {
  buildUpstreamUrl,
  PUBLIC_ASSET_PREFIX,
  PUBLIC_DOCS_BASE,
  rewriteDocsHtml,
  rewriteDocsLocation,
  stripZoneBasePath,
  toUpstreamPath,
} from "../lib/docs-proxy.ts";

assert.equal(toUpstreamPath("/docs"), "/");
assert.equal(toUpstreamPath("/docs/examples/basic"), "/examples/basic");
assert.equal(
  toUpstreamPath("/_docs/_next/static/chunk.js"),
  "/_docs/_next/static/chunk.js"
);

assert.equal(
  stripZoneBasePath("/dnd-grid/docs/examples/basic"),
  "/docs/examples/basic"
);
assert.equal(stripZoneBasePath("/docs/examples/basic"), "/docs/examples/basic");

assert.equal(buildUpstreamUrl("/docs", "").href, "https://dnd-grid.blode.md/");
assert.equal(
  buildUpstreamUrl("/docs/examples/basic", "?embed=1").href,
  "https://dnd-grid.blode.md/examples/basic?embed=1"
);

const rewritten = rewriteDocsHtml(
  [
    '<link rel="canonical" href="https://dnd-grid.blode.md/examples/basic"/>',
    '<a href="/examples/basic">Basic</a>',
    '<a href="/">Home</a>',
    '<link href="/_docs/_next/static/chunk.css"/>',
    '<link rel="preload" href="/llms.txt"/>',
    '<img src="https://qelocskl2rtewqhr.public.blob.vercel-storage.com/deployments/dnd-grid/x/files/logo/dark.svg"/>',
    '<link rel="icon" href="https://qelocskl2rtewqhr.public.blob.vercel-storage.com/deployments/dnd-grid/x/files/favicon.svg"/>',
    '<link rel="preconnect" href="https://public.blob.vercel-storage.com"/>',
    String.raw`[\"$\",\"link\",null,{\"rel\":\"preconnect\",\"href\":\"https://public.blob.vercel-storage.com\"}]`,
  ].join("")
);

assert.match(
  rewritten,
  new RegExp(`href="https://blode.co${PUBLIC_DOCS_BASE}/examples/basic"`)
);
assert.match(
  rewritten,
  new RegExp(`href="${PUBLIC_DOCS_BASE}/examples/basic"`)
);
assert.match(rewritten, new RegExp(`href="${PUBLIC_DOCS_BASE}"`));
assert.match(
  rewritten,
  new RegExp(`href="${PUBLIC_ASSET_PREFIX}/_next/static/chunk.css"`)
);
assert.match(rewritten, new RegExp(`href="${PUBLIC_DOCS_BASE}/llms.txt"`));
assert.match(rewritten, /src="\/dnd-grid\/logo\/dark\.svg"/);
assert.match(rewritten, /href="\/dnd-grid\/logo\/favicon\.svg"/);
assert.equal(rewritten.includes("blob.vercel-storage.com"), false);
assert.equal(rewritten.includes('href="/examples/basic"'), false);
assert.equal(rewritten.includes('href="/_docs/'), false);

assert.equal(
  rewriteDocsLocation(
    "https://dnd-grid.blode.md/examples/basic",
    new URL("https://blode.co/dnd-grid/docs")
  ),
  `https://blode.co${PUBLIC_DOCS_BASE}/examples/basic`
);

/*
 * og:site_name now comes from `apps/docs/docs.json` (`seo.siteName`). The
 * proxy must pass it through unchanged.
 */
const OG_SITE_NAME_CASES = [
  '<meta property="og:site_name" content="dnd-grid"/>',
  '<meta content="dnd-grid" property="og:site_name"/>',
  '<meta data-x="1" property="og:site_name" content="dnd-grid" data-y="2">',
  String.raw`[\"$\",\"meta\",null,{\"property\":\"og:site_name\",\"content\":\"dnd-grid\"}]`,
  String.raw`[\"$\",\"meta\",null,{\"content\":\"dnd-grid\",\"property\":\"og:site_name\"}]`,
];

for (const html of OG_SITE_NAME_CASES) {
  const out = rewriteDocsHtml(html);
  assert.equal(out, html, `og:site_name was rewritten: ${html}`);
}

const titleHtml =
  '<meta property="og:title" content="Introduction · dnd-grid"/>';
assert.equal(rewriteDocsHtml(titleHtml), titleHtml);

// twitter:creator is absent upstream, so it is added rather than rewritten.
const HEAD_ONLY = "<html><head><title>x</title></head><body></body></html>";
const withCreator = rewriteDocsHtml(HEAD_ONLY);
assert.match(
  withCreator,
  /<meta name="twitter:creator" content="@mattblode"\/>/
);
assert.equal(
  (withCreator.match(/twitter:creator/g) ?? []).length,
  1,
  "injected twice"
);
// Already present upstream: left alone rather than duplicated.
const ALREADY =
  '<html><head><meta name="twitter:creator" content="@mattblode"/></head></html>';
assert.equal(
  (rewriteDocsHtml(ALREADY).match(/twitter:creator/g) ?? []).length,
  1
);

if (process.env.SMOKE_LIVE) {
  // buildUpstreamUrl, not a hand-written path: this upstream serves the docs
  // root at "/", and hardcoding "/docs" fetches its 404 page, whose metadata
  // says something else entirely.
  const live = await fetch(buildUpstreamUrl("/docs", "")).then((r) => r.text());
  const upstreamName = live.match(
    /property="og:site_name"[^>]*content="([^"]*)"/
  )?.[1];
  assert.ok(upstreamName, "upstream served no og:site_name");

  const out = rewriteDocsHtml(live);
  const rewrittenName = out.match(
    /property="og:site_name"[^>]*content="([^"]*)"/
  )?.[1];
  assert.equal(
    rewrittenName,
    upstreamName,
    `og:site_name was rewritten from "${upstreamName}" to "${rewrittenName}"`
  );
  assert.match(out, /property="og:title" content="[^"]*dnd-grid[^"]*"/);
  assert.match(
    out,
    /<meta name="twitter:creator" content="@mattblode"\/>/,
    "twitter:creator missing from live HTML"
  );
  console.log(`live upstream og:site_name "${upstreamName}" passed through`);
}

console.log("docs-proxy smoke ok");
