interface ExceptionLike {
  type?: unknown;
  value?: unknown;
  stacktrace?: {
    frames?: { abs_path?: unknown; filename?: unknown }[];
  };
}

interface ExceptionEventLike {
  event?: string;
  properties?: {
    $exception_list?: ExceptionLike[];
  };
}

const EXTENSION_EXCEPTION_MARKERS = [
  "runtime.sendMessage",
  "Extension context invalidated",
  "chrome-extension://",
  "moz-extension://",
  "safari-extension://",
  "safari-web-extension://",
  "adoptedStyleSheets",
  "WNAdoptedStylesManager",
  "_makeContainerForSrcDocIFrame",
];

const NOISE_MESSAGE_MARKERS = [
  "AbortError",
  "The user aborted a request",
  "NetworkError",
  "A network error occurred",
  "Script error.",
  "Internal Next.js error",
  // CefSharp / Outlook SafeLink crawlers reject host-object `update` calls.
  // Not an app promise. See https://github.com/getsentry/sentry-javascript/pull/14595
  "Object Not Found Matching Id",
];

const matchesMarker = (value: unknown, markers: string[]) =>
  typeof value === "string" && markers.some((m) => value.includes(m));

const isNoisyException = (event: ExceptionEventLike): boolean => {
  if (event.event !== "$exception") {
    return false;
  }
  const exceptions = event.properties?.$exception_list;
  if (!Array.isArray(exceptions)) {
    return false;
  }
  return exceptions.some((exception) => {
    if (
      matchesMarker(exception?.value, EXTENSION_EXCEPTION_MARKERS) ||
      matchesMarker(exception?.type, EXTENSION_EXCEPTION_MARKERS) ||
      matchesMarker(exception?.value, NOISE_MESSAGE_MARKERS) ||
      matchesMarker(exception?.type, NOISE_MESSAGE_MARKERS)
    ) {
      return true;
    }
    const frames = exception?.stacktrace?.frames;
    if (
      Array.isArray(frames) &&
      frames.some(
        (frame: { abs_path?: unknown; filename?: unknown }) =>
          matchesMarker(frame?.filename, EXTENSION_EXCEPTION_MARKERS) ||
          matchesMarker(frame?.abs_path, EXTENSION_EXCEPTION_MARKERS) ||
          (typeof frame?.filename === "string" &&
            frame.filename.includes("node_modules/next/dist/client")) ||
          (typeof frame?.abs_path === "string" &&
            frame.abs_path.includes("node_modules/next/dist/client"))
      )
    ) {
      return true;
    }
    return false;
  });
};

export const filterExceptionForPosthog = <T extends ExceptionEventLike>(
  event: T | null | undefined
): T | null | undefined => {
  if (event && isNoisyException(event)) {
    return null;
  }
  return event;
};
