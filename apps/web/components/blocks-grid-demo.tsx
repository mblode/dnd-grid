"use client";

import dynamic from "next/dynamic";

// Dynamic import to prevent SSR issues
const BlocksGrid = dynamic(
  () => import("./blocks-grid").then((mod) => ({ default: mod.BlocksGrid })),
  { ssr: false }
);

export function BlocksGridDemo() {
  return <BlocksGrid />;
}
