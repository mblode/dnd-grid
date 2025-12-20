"use client";

import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  isSelected?: boolean;
  hideBackground?: boolean;
}

export function BlockWrapper({ children, isSelected, hideBackground }: Props) {
  if (hideBackground) {
    return (
      <div
        className={`block-wrapper-transparent size-full relative ${
          isSelected ? "block-selected" : ""
        }`}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={`block-wrapper size-full ${isSelected ? "block-selected" : ""}`}
    >
      <div className="block-wrapper-inner size-full">
        {children}
      </div>
    </div>
  );
}
