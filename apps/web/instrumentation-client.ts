import posthog from "posthog-js";

// Shared blode PostHog project (same key as other blode.co zones).
posthog.init("phc_yYatHXysbRxjTyfmyCKSUyMSQpgepJPuxegz2HtpfX35", {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  defaults: "2026-05-30",
  ui_host: "https://us.posthog.com",
});
