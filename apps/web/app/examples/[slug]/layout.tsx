import type { ReactNode } from "react";

interface ExampleLayoutProps {
  children: ReactNode;
}

export default function ExampleLayout({ children }: ExampleLayoutProps) {
  return <div className="font-sans">{children}</div>;
}
