import assert from "node:assert/strict";

import worker from "../src/index.ts";

const env = {
  DOCS_URL: "docs.example.com",
  CUSTOM_URL: "dnd-grid.com",
  LANDING_URL: "landing.example.com",
};

const requests: Request[] = [];
const originalFetch = globalThis.fetch;
let nextResponse: Response | null = null;

globalThis.fetch = (input, init) => {
  const request = input instanceof Request ? input : new Request(input, init);
  requests.push(request);
  const response = nextResponse ?? new Response("ok");
  nextResponse = null;
  return Promise.resolve(response.clone());
};

const assertHost = (request: Request, expectedHost: string) => {
  const { hostname } = new URL(request.url);
  // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
  assert.equal(hostname, expectedHost);
};

const run = async () => {
  try {
    requests.length = 0;
    await worker.fetch(new Request("https://dnd-grid.com/docs"), env);
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    assert.equal(requests.length, 1);
    assertHost(requests[0], env.DOCS_URL);
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    assert.equal(requests[0].headers.get("X-Forwarded-Host"), env.CUSTOM_URL);

    requests.length = 0;
    await worker.fetch(
      new Request("https://dnd-grid.com/_next/static/chunks/main.js", {
        headers: {
          Referer: "https://dnd-grid.com/docs",
        },
      }),
      env
    );
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    assert.equal(requests.length, 1);
    assertHost(requests[0], env.DOCS_URL);
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    assert.equal(requests[0].headers.get("X-Forwarded-Host"), env.CUSTOM_URL);

    requests.length = 0;
    await worker.fetch(new Request("https://dnd-grid.com/"), env);
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    assert.equal(requests.length, 1);
    assertHost(requests[0], env.LANDING_URL);

    requests.length = 0;
    await worker.fetch(
      new Request("https://dnd-grid.com/.well-known/test"),
      env
    );
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    assert.equal(requests.length, 1);
    assertHost(requests[0], "dnd-grid.com");

    // Root-level docs page requests normalize back to /docs/*
    requests.length = 0;
    const leakedDocsPathRes = await worker.fetch(
      new Request("https://dnd-grid.com/introduction?ref=test"),
      env
    );
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    assert.equal(leakedDocsPathRes.status, 308);
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    assert.equal(
      leakedDocsPathRes.headers.get("Location"),
      "https://dnd-grid.com/docs/introduction?ref=test"
    );
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    assert.equal(requests.length, 0);

    requests.length = 0;
    const compactorsRes = await worker.fetch(
      new Request("https://dnd-grid.com/concepts/compactors"),
      env
    );
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    assert.equal(compactorsRes.status, 308);
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    assert.equal(
      compactorsRes.headers.get("Location"),
      "https://dnd-grid.com/docs/concepts/compactors"
    );
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    assert.equal(requests.length, 0);

    // Root requests from inside docs normalize to the docs home instead of landing page
    requests.length = 0;
    const docsHomeRes = await worker.fetch(
      new Request("https://dnd-grid.com/", {
        headers: {
          Referer: "https://dnd-grid.com/docs/introduction",
        },
      }),
      env
    );
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    assert.equal(docsHomeRes.status, 308);
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    assert.equal(
      docsHomeRes.headers.get("Location"),
      "https://dnd-grid.com/docs"
    );
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    assert.equal(requests.length, 0);

    // Upstream redirects that leak the root path are rewritten back under /docs
    requests.length = 0;
    nextResponse = new Response(null, {
      headers: {
        Location: "/installation",
      },
      status: 307,
    });
    const docsRedirectRes = await worker.fetch(
      new Request("https://dnd-grid.com/docs/introduction"),
      env
    );
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    assert.equal(docsRedirectRes.status, 307);
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    assert.equal(
      docsRedirectRes.headers.get("Location"),
      "https://dnd-grid.com/docs/installation"
    );

    // Root-relative docs links and canonicals in proxied HTML are rewritten under /docs
    requests.length = 0;
    nextResponse = new Response(
      `<html><head><link rel="canonical" href="https://docs.example.com/introduction"></head><body><a href="/">Home</a><a href="/installation">Installation</a><script>const page={"href":"/hooks/use-dnd-grid","contentUrl":"/introduction.mdx"}</script></body></html>`,
      {
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      }
    );
    const docsHtmlRes = await worker.fetch(
      new Request("https://dnd-grid.com/docs/introduction"),
      env
    );
    const html = await docsHtmlRes.text();
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    // biome-ignore lint/performance/useTopLevelRegex: Smoke test runs once
    assert.match(html, /href="\/docs"/);
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    // biome-ignore lint/performance/useTopLevelRegex: Smoke test runs once
    assert.match(html, /href="\/docs\/installation"/);
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    // biome-ignore lint/performance/useTopLevelRegex: Smoke test runs once
    assert.match(html, /"href":"\/docs\/hooks\/use-dnd-grid"/);
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    // biome-ignore lint/performance/useTopLevelRegex: Smoke test runs once
    assert.match(html, /"contentUrl":"\/docs\/introduction\.mdx"/);
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    assert.match(
      html,
      // biome-ignore lint/performance/useTopLevelRegex: Smoke test runs once
      /<link rel="canonical" href="https:\/\/dnd-grid\.com\/docs\/introduction">/
    );

    // Absolute upstream URLs (canonical, og:url, og:image) are pointed back at
    // the custom domain so proxied pages stay indexable
    requests.length = 0;
    nextResponse = new Response(
      `<html><head><link rel="canonical" href="https://docs.example.com/docs/patterns/ssr"><meta property="og:url" content="https://docs.example.com/docs/patterns/ssr"><meta property="og:image" content="https://docs.example.com/opengraph-image.png"></head></html>`,
      {
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      }
    );
    const absoluteUrlRes = await worker.fetch(
      new Request("https://dnd-grid.com/docs/patterns/ssr"),
      env
    );
    const absoluteUrlHtml = await absoluteUrlRes.text();
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    assert.equal(absoluteUrlHtml.includes(env.DOCS_URL), false);
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    assert.match(
      absoluteUrlHtml,
      // biome-ignore lint/performance/useTopLevelRegex: Smoke test runs once
      /<link rel="canonical" href="https:\/\/dnd-grid\.com\/docs\/patterns\/ssr">/
    );
    // Shared assets live outside /docs on the custom domain
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    assert.match(
      absoluteUrlHtml,
      // biome-ignore lint/performance/useTopLevelRegex: Smoke test runs once
      /content="https:\/\/dnd-grid\.com\/opengraph-image\.png"/
    );

    // Crawlers omit Referer, so docs chunks must still resolve after the
    // landing app reports that it has no such asset
    requests.length = 0;
    nextResponse = new Response("not found", { status: 404 });
    const assetRes = await worker.fetch(
      new Request("https://dnd-grid.com/_next/static/chunks/docs-only.js"),
      env
    );
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    assert.equal(requests.length, 2);
    assertHost(requests[0], env.LANDING_URL);
    assertHost(requests[1], env.DOCS_URL);
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a smoke test script, not a test framework
    assert.equal(assetRes.status, 200);
  } finally {
    globalThis.fetch = originalFetch;
  }
};

const main = async () => {
  try {
    await run();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
};

// biome-ignore lint/complexity/noVoid: Standard fire-and-forget pattern
void main();
