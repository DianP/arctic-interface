import os from "os"
import { Global } from "../global"
import { Installation } from "../installation"
import { Log } from "../util/log"

const TELEMETRY_ENDPOINT = "https://usearctic.sh/api/track/usage"
const FLUSH_INTERVAL = 60_000
const MAX_QUEUE_SIZE = 100

export namespace Telemetry {
  const log = Log.create({ service: "telemetry" })

  interface Event {
    event: string
    properties?: Record<string, string | number | boolean>
    timestamp: number
  }

  let queue: Event[] = []
  let flushTimer: Timer | undefined
  let enabledCache: boolean | undefined

  export async function isEnabled(): Promise<boolean> {
    if (enabledCache !== undefined) return enabledCache
    const enabled = await Global.getTelemetryEnabled()
    enabledCache = enabled
    return enabled
  }

  export async function setEnabled(enabled: boolean): Promise<void> {
    enabledCache = enabled
    await Global.setTelemetryEnabled(enabled)
    log.info("telemetry", { enabled })

    if (!enabled) {
      queue = []
      if (flushTimer) {
        clearInterval(flushTimer)
        flushTimer = undefined
      }
    }
  }

  export async function track(event: string, properties?: Record<string, string | number | boolean>): Promise<void> {
    if (!(await isEnabled())) return

    queue.push({
      event,
      properties,
      timestamp: Date.now(),
    })

    log.debug("tracked", { event, properties })

    if (queue.length >= MAX_QUEUE_SIZE) {
      flush().catch(() => {})
    }

    if (!flushTimer) {
      flushTimer = setInterval(() => flush().catch(() => {}), FLUSH_INTERVAL)
    }
  }

  export async function flush(): Promise<void> {
    if (queue.length === 0) return
    if (!(await isEnabled())) return

    const events = queue.splice(0, queue.length)

    const payload = {
      events,
      context: {
        os: os.platform(),
        arch: os.arch(),
        version: Installation.VERSION,
      },
    }

    log.debug("flushing", { count: events.length })

    await fetch(TELEMETRY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    }).catch((err) => {
      log.debug("flush failed", { error: err.message })
      // re-queue events on failure (up to max size)
      queue.unshift(...events.slice(0, MAX_QUEUE_SIZE - queue.length))
    })
  }

  // convenience methods for common events
  export function sessionStarted() {
    track("session.started")
  }

  export function messageSent(provider: string, model: string) {
    track("message.sent", { provider, model })
  }

  export function toolInvoked(tool: string) {
    track("tool.invoked", { tool })
  }

  export function commandUsed(command: string) {
    track("command.used", { command })
  }
}
