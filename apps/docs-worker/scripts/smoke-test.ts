import assert from "node:assert/strict";

import worker from "../src/index.ts";

const env = {
  CUSTOM_URL: "dnd-grid.com",
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

const ctx = {
  waitUntil: () => {
    // no-op
  },
  passThroughOnException: () => {
    // no-op
  },
  props: {},
} as unknown as ExecutionContext;

const assertRedirect = async (
  path: string,
  expectedLocation: string,
  init?: RequestInit
) => {
  requests.length = 0;
  const res = await worker.fetch(
    new Request(`https://dnd-grid.com${path}`, init),
    env,
    ctx
  );
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("Location"), expectedLocation);
  assert.equal(requests.length, 0);
};

const run = async () => {
  try {
    // Homepage
    await assertRedirect("/", "https://blode.co/dnd-grid");

    // Marketing / examples preserve path
    await assertRedirect(
      "/examples/toolbox-example",
      "https://blode.co/dnd-grid/examples/toolbox-example"
    );

    // Docs under /docs preserve path (GSC sample URLs)
    await assertRedirect(
      "/docs/introduction",
      "https://blode.co/dnd-grid/docs/introduction"
    );
    await assertRedirect(
      "/docs/concepts/layout",
      "https://blode.co/dnd-grid/docs/concepts/layout"
    );
    await assertRedirect("/docs", "https://blode.co/dnd-grid/docs");
    await assertRedirect(
      "/docs/introduction?ref=test",
      "https://blode.co/dnd-grid/docs/introduction?ref=test"
    );

    // Root-level Mintlify leaks normalize under /docs on the zone
    await assertRedirect(
      "/introduction?ref=test",
      "https://blode.co/dnd-grid/docs/introduction?ref=test"
    );
    await assertRedirect(
      "/concepts/compactors",
      "https://blode.co/dnd-grid/docs/concepts/compactors"
    );

    // Verification paths still pass through
    requests.length = 0;
    nextResponse = new Response("ok");
    await worker.fetch(
      new Request("https://dnd-grid.com/.well-known/test"),
      env,
      ctx
    );
    assert.equal(requests.length, 1);
    assert.equal(new URL(requests[0].url).hostname, "dnd-grid.com");
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

void main();
