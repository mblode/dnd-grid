"use client"

import * as React from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
  className?: string
}

export function CodeBlock({
  code,
  language: _language = "tsx",
  filename,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false)

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-grid bg-code text-code-foreground",
        className
      )}
    >
      {filename && (
        <div className="flex items-center justify-between border-b border-border/30 px-4 py-2.5">
          <span className="text-sm text-code-foreground font-mono">{filename}</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-code-foreground hover:bg-code-highlight hover:text-foreground"
            onClick={copyToClipboard}
          >
            {copied ? (
              <Check className="size-3.5 text-green-500" />
            ) : (
              <Copy className="size-3.5" />
            )}
            <span className="sr-only">Copy code</span>
          </Button>
        </div>
      )}
      <div className="relative">
        {!filename && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 size-7 text-code-foreground hover:bg-code-highlight hover:text-foreground"
            onClick={copyToClipboard}
          >
            {copied ? (
              <Check className="size-3.5 text-green-500" />
            ) : (
              <Copy className="size-3.5" />
            )}
            <span className="sr-only">Copy code</span>
          </Button>
        )}
        <pre className="overflow-x-auto p-4">
          <code className="text-sm font-mono">{code}</code>
        </pre>
      </div>
    </div>
  )
}
