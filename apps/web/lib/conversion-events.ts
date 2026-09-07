import { posthog } from "posthog-js";

export const captureConversion = ({
  action,
  href,
  label,
}: {
  action: string;
  href: string;
  label: string;
}) => {
  try {
    const pathname = window.location.pathname;
    posthog.capture("cta_clicked", {
      $current_url: `https://blode.co${pathname}`,
      $pathname: pathname,
      action,
      href,
      label,
      location: pathname,
      product: "dnd-grid",
    });
  } catch {
    // Analytics must never prevent a copy or navigation.
  }
};
