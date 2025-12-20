"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/code-block";
import { cn } from "@/lib/utils";

interface ComponentPreviewProps {
  children: React.ReactNode;
  code?: string;
  className?: string;
}

export function ComponentPreview({ children, code, className }: ComponentPreviewProps) {
  return (
    <div className={cn("relative my-4 flex flex-col space-y-2", className)}>
      <Tabs defaultValue="preview" className="relative mr-auto w-full">
        <div className="flex items-center justify-between pb-3">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger
              value="preview"
              className="relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Preview
            </TabsTrigger>
            {code && (
              <TabsTrigger
                value="code"
                className="relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Code
              </TabsTrigger>
            )}
          </TabsList>
        </div>
        <TabsContent value="preview" className="relative rounded-lg border p-6 bg-background">
          <div className="preview flex min-h-[350px] w-full justify-center items-start">
            {children}
          </div>
        </TabsContent>
        {code && (
          <TabsContent value="code">
            <CodeBlock code={code} filename="example.tsx" />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
