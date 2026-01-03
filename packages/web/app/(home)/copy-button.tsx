"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"

export function CopyButton({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    void navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="group relative inline-flex w-full items-center justify-between gap-3 rounded-lg border border-input bg-background px-4 py-3 shadow-xs ring-ring/24 transition-shadow before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] hover:border-ring hover:ring-[3px] dark:before:shadow-[0_-1px_--theme(--color-white/8%)]"
    >
      <code className="flex-1 text-left font-mono text-sm text-foreground leading-none">{command}</code>
      <div className="flex-shrink-0">
        {copied ? (
          <Check className="size-4 text-green-600 dark:text-green-500" />
        ) : (
          <Copy className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        )}
      </div>
    </button>
  )
}
