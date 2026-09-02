import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { filterExceptionForPosthog } from "../posthog-exception-filter.ts";

const exceptionEvent = (value: string, type = "UnhandledRejection") => ({
  event: "$exception" as const,
  properties: {
    $exception_list: [{ type, value }],
  },
});

describe("filterExceptionForPosthog", () => {
  it("drops CefSharp Outlook SafeLink update rejections (Id:1)", () => {
    const event = exceptionEvent(
      "Non-Error promise rejection captured with value: Object Not Found Matching Id:1, MethodName:update, ParamCount:4"
    );
    assert.equal(filterExceptionForPosthog(event), null);
  });

  it("drops the Id:2 variant from the same rejection family", () => {
    const event = exceptionEvent(
      "Non-Error promise rejection captured with value: Object Not Found Matching Id:2, MethodName:update, ParamCount:4"
    );
    assert.equal(filterExceptionForPosthog(event), null);
  });

  it("keeps real application exceptions", () => {
    const event = exceptionEvent(
      "Cannot read properties of undefined (reading 'x')",
      "TypeError"
    );
    assert.equal(filterExceptionForPosthog(event), event);
  });

  it("keeps unhandled rejections that are not the CefSharp signature", () => {
    const event = exceptionEvent(
      "Non-Error promise rejection captured with value: layout update failed"
    );
    assert.equal(filterExceptionForPosthog(event), event);
  });

  it("passes through non-exception events", () => {
    const event = { event: "$pageview" };
    assert.equal(filterExceptionForPosthog(event), event);
  });

  it("still drops existing noise markers", () => {
    assert.equal(
      filterExceptionForPosthog(exceptionEvent("The user aborted a request")),
      null
    );
    assert.equal(
      filterExceptionForPosthog(
        exceptionEvent("Extension context invalidated", "Error")
      ),
      null
    );
  });
});
