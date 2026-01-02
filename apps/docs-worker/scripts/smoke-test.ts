import assert from "node:assert/strict";
import worker from "../src/index.ts";

const env = {
  DOCS_URL: "docs.example.com",
  CUSTOM_URL: "dnd-grid.com",
  LANDING_URL: "landing.example.com",
};

const requests: Request[] = [];
const originalFetch = globalThis.fetch;

globalThis.fetch = (input, init) => {
  const request = input instanceof Request ? input : new Request(input, init);
  requests.push(request);
  return Promise.resolve(new Response("ok"));
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
  } finally {
    globalThis.fetch = originalFetch;
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
