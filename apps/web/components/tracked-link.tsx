"use client";

import type { ComponentProps } from "react";

import { captureConversion } from "@/lib/conversion-events";

export function TrackedLink({
  action,
  label,
  onClick,
  ...props
}: ComponentProps<"a"> & { action: string; label: string }) {
  return (
    <a
      {...props}
      onClick={(event) => {
        captureConversion({ action, href: props.href ?? "", label });
        onClick?.(event);
      }}
    />
  );
}
