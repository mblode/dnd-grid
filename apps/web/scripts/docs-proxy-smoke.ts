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

console.log("docs-proxy smoke ok");
