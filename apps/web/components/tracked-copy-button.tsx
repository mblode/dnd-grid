"use client";

import { type ComponentProps, useRef } from "react";

import { CopyButton } from "@/components/animate-ui/components/buttons/copy";
import { captureConversion } from "@/lib/conversion-events";

export function TrackedCopyButton({
  action,
  label,
  ...props
}: ComponentProps<typeof CopyButton> & { action: string; label: string }) {
  const copiedRef = useRef(false);

  return (
    <CopyButton
      {...props}
      onCopiedChange={(copied) => {
        if (copied && !copiedRef.current) {
          captureConversion({ action, href: `clipboard:${action}`, label });
        }
        copiedRef.current = copied;
      }}
    />
  );
}
