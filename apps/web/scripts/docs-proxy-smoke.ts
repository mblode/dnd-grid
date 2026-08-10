import assert from "node:assert/strict";

import {
  buildUpstreamUrl,
  HOST_SITE_NAME,
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
 * og:site_name. Every case asserts the product name is GONE rather than that
 * "Matthew Blode" is present: a rewrite that matches nothing leaves the old
 * value in place, and a present-tense assertion cannot tell that apart from a
 * rewrite that worked.
 *
 * Both attribute orders are covered because the upstream is a platform we do
 * not control. A fixture cannot notice the platform changing, which is what the
 * live check at the bottom is for.
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
  assert.equal(out.includes("dnd-grid"), false, `old value survived: ${html}`);
  assert.equal(out.includes(HOST_SITE_NAME), true, html);
}

// Rule 8 before Rule 9: og:site_name may only become the person while og:title
// still names the product, or the card identifies nothing.
const titleHtml =
  '<meta property="og:title" content="Introduction · dnd-grid"/>';
assert.equal(rewriteDocsHtml(titleHtml), titleHtml);

if (process.env.SMOKE_LIVE) {
  // buildUpstreamUrl, not a hand-written path: this upstream serves the docs
  // root at "/", and hardcoding "/docs" fetches its 404 page, whose metadata
  // says something else entirely.
  const live = await fetch(buildUpstreamUrl("/docs", "")).then((r) => r.text());
  const upstreamName = live.match(
    /property="og:site_name"[^>]*content="([^"]*)"/
  )?.[1];
  assert.ok(upstreamName, "upstream served no og:site_name to rewrite");

  const out = rewriteDocsHtml(live);
  assert.equal(
    new RegExp(`property="og:site_name"[^>]*content="${HOST_SITE_NAME}"`).test(
      out
    ),
    true
  );
  assert.equal(
    out.includes(`content="${upstreamName}"`) &&
      upstreamName !== HOST_SITE_NAME,
    false,
    `upstream og:site_name "${upstreamName}" survived the rewrite`
  );
  assert.match(out, /property="og:title" content="[^"]*dnd-grid[^"]*"/);
  console.log(`live upstream og:site_name "${upstreamName}" rewritten`);
}

console.log("docs-proxy smoke ok");
