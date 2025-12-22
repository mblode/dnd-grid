import assert from "node:assert/strict";
import worker from "../src/index.ts";

const env = {
  DOCS_URL: "docs.example.com",
  CUSTOM_URL: "dnd-grid.com",
  LANDING_URL: "landing.example.com",
};

const requests: Request[] = [];
const originalFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
  const request = input instanceof Request ? input : new Request(input, init);
  requests.push(request);
  return new Response("ok");
};

const assertHost = (request: Request, expectedHost: string) => {
  const { hostname } = new URL(request.url);
  assert.equal(hostname, expectedHost);
};

try {
  requests.length = 0;
  await worker.fetch(new Request("https://dnd-grid.com/docs"), env);
  assert.equal(requests.length, 1);
  assertHost(requests[0], env.DOCS_URL);
  assert.equal(requests[0].headers.get("X-Forwarded-Host"), env.CUSTOM_URL);

  requests.length = 0;
  await worker.fetch(new Request("https://dnd-grid.com/"), env);
  assert.equal(requests.length, 1);
  assertHost(requests[0], env.LANDING_URL);

  requests.length = 0;
  await worker.fetch(new Request("https://dnd-grid.com/.well-known/test"), env);
  assert.equal(requests.length, 1);
  assertHost(requests[0], "dnd-grid.com");
} finally {
  globalThis.fetch = originalFetch;
}
