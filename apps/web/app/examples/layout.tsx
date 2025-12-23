"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ExamplesLayoutContent({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get("embed") === "true";

  if (isEmbed) {
    return (
      <div className="p-4 bg-background min-h-screen font-sans">{children}</div>
    );
  }

  return <div className="container-wrapper p-8 font-sans">{children}</div>;
}

export default function ExamplesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="p-4 font-sans">Loading...</div>}>
      <ExamplesLayoutContent>{children}</ExamplesLayoutContent>
    </Suspense>
  );
}
