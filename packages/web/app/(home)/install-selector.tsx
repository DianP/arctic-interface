"use client"

import { Tick01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"

type InstallMethod = "curl" | "npm" | "bun" | "pnpm" | "yarn" | "windows"

const INSTALL_COMMANDS: Record<InstallMethod, string> = {
  curl: "curl -fsSL https://usearctic.sh/install | bash",
  npm: "npm install -g @arctic-cli/arctic@beta",
  bun: "bun install -g @arctic-cli/arctic@beta",
  pnpm: "pnpm install -g @arctic-cli/arctic@beta",
  yarn: "yarn global add @arctic-cli/arctic@beta",
  windows: "irm https://usearctic.sh/install.ps1 | iex",
}

const INSTALL_LABELS: Record<InstallMethod, string> = {
  curl: "curl",
  npm: "npm",
  bun: "bun",
  pnpm: "pnpm",
  yarn: "yarn",
  windows: "windows",
}

const CopyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={24}
    height={24}
    color={"currentColor"}
    fill={"none"}
    {...props}
  >
    <path
      d="M9 15C9 12.1716 9 10.7574 9.87868 9.87868C10.7574 9 12.1716 9 15 9L16 9C18.8284 9 20.2426 9 21.1213 9.87868C22 10.7574 22 12.1716 22 15V16C22 18.8284 22 20.2426 21.1213 21.1213C20.2426 22 18.8284 22 16 22H15C12.1716 22 10.7574 22 9.87868 21.1213C9 20.2426 9 18.8284 9 16L9 15Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    ></path>
    <path
      d="M16.9999 9C16.9975 6.04291 16.9528 4.51121 16.092 3.46243C15.9258 3.25989 15.7401 3.07418 15.5376 2.90796C14.4312 2 12.7875 2 9.5 2C6.21252 2 4.56878 2 3.46243 2.90796C3.25989 3.07417 3.07418 3.25989 2.90796 3.46243C2 4.56878 2 6.21252 2 9.5C2 12.7875 2 14.4312 2.90796 15.5376C3.07417 15.7401 3.25989 15.9258 3.46243 16.092C4.51121 16.9528 6.04291 16.9975 9 16.9999"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    ></path>
  </svg>
)

export function InstallSelector() {
  const [method, setMethod] = useState<InstallMethod>("curl")
  const [copied, setCopied] = useState(false)

  const copy = () => {
    void navigator.clipboard.writeText(INSTALL_COMMANDS[method])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group relative inline-flex w-full flex-col rounded-lg border border-input bg-background shadow-xs ring-ring/24 transition-shadow before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] hover:border-ring hover:ring-[3px] dark:before:shadow-[0_-1px_--theme(--color-white/8%)]">
      <div className="flex items-center gap-1 border-b border-border/50 px-2 sm:px-4 py-2 overflow-x-auto">
        {(Object.keys(INSTALL_COMMANDS) as InstallMethod[]).map((m) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={`relative px-2 sm:px-3 py-1 text-xs font-mono transition-colors whitespace-nowrap ${
              method === m ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {INSTALL_LABELS[m]}
            {method === m && <div className="absolute bottom-0 left-0 right-0 h-px bg-foreground" />}
          </button>
        ))}
      </div>
      <button onClick={copy} className="flex items-center justify-between gap-3 px-3 sm:px-4 py-3 transition-colors overflow-x-auto">
        <code className="flex-1 text-left font-mono text-xs sm:text-sm text-foreground leading-none whitespace-nowrap">
          {INSTALL_COMMANDS[method]}
        </code>
        <div className="shrink-0">
          {copied ? (
            <HugeiconsIcon className="size-5 text-chart-4" icon={Tick01Icon} />
          ) : (
            <CopyIcon className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </div>
      </button>
    </div>
  )
}
