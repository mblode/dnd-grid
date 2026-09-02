import { posthog } from "posthog-js";

import { filterExceptionForPosthog } from "./lib/posthog-exception-filter.ts";

const isLocalHost = () => {
  if (typeof window === "undefined") {
    return false;
  }
  const host = window.location.hostname;
  return (
    host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost")
  );
};

// Shared blode PostHog project (same key as other blode.co zones).
if (!isLocalHost()) {
  posthog.init("phc_yYatHXysbRxjTyfmyCKSUyMSQpgepJPuxegz2HtpfX35", {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    before_send: (event) => filterExceptionForPosthog(event) ?? null,
    defaults: "2026-05-30",
    ui_host: "[REDACTED]",
  });
}
