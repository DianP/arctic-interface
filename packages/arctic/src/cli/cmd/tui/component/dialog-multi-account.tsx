import { DialogSelect, type DialogSelectRef } from "../ui/dialog-select"
import { useDialog } from "../ui/dialog"
import { useSDK } from "../context/sdk"
import { useSync } from "../context/sync"

const OPTIONS = [
  {
    title: "Fill-First ↻",
    value: "fill-first",
    description: "Use account until error, then switch to next (default)",
  },
  {
    title: "Round-Robin ⟳",
    value: "round-robin",
    description: "Rotate account at the start of each new message",
  },
]

export function DialogMultiAccount() {
  const dialog = useDialog()
  const sdk = useSDK()
  const sync = useSync()
  let ref: DialogSelectRef<string>

  const getCurrentMode = () => {
    const config = sync.data.config as any
    return config?.multi_account?.mode ?? "fill-first"
  }

  return (
    <DialogSelect
      title="Multi-Account Mode"
      options={OPTIONS}
      current={getCurrentMode()}
      onSelect={async (opt) => {
        const mode = opt.value as "fill-first" | "round-robin"

        // Update global config directly via API
        await fetch(`${sdk.url}/config/global`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            multi_account: { mode },
          }),
        })

        // Refresh config in sync store
        const result = await sdk.client.config.get({})
        if (result.data) {
          sync.set("config", result.data)
        }
        dialog.clear()
      }}
      ref={(r) => {
        ref = r
      }}
    />
  )
}
