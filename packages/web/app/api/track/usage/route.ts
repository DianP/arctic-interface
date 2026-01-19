import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextRequest } from "next/server"

const redis = Redis.fromEnv()

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  analytics: true,
  prefix: "ratelimit:usage",
})

const VALID_EVENTS = ["session.started", "message.sent", "tool.invoked", "command.used"]
const VALID_OS = ["linux", "darwin", "win32", "freebsd", "openbsd", "sunos", "aix"]
const VALID_ARCH = ["x64", "arm64", "arm", "ia32", "ppc64", "s390x"]

interface TelemetryEvent {
  event: string
  properties?: Record<string, string | number | boolean>
  timestamp: number
}

interface TelemetryPayload {
  events: TelemetryEvent[]
  context: {
    os: string
    arch: string
    version: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

    const { success } = await ratelimit.limit(ip)
    if (!success) {
      return new Response(null, { status: 429 })
    }

    const payload: TelemetryPayload = await request.json()

    if (!payload.events || !Array.isArray(payload.events)) {
      return new Response(null, { status: 400 })
    }

    const date = new Date().toISOString().split("T")[0]
    const pipeline = redis.pipeline()

    const os = VALID_OS.includes(payload.context?.os) ? payload.context.os : "unknown"
    const arch = VALID_ARCH.includes(payload.context?.arch) ? payload.context.arch : "unknown"

    for (const event of payload.events) {
      if (!VALID_EVENTS.includes(event.event)) continue

      // total event count
      pipeline.incr(`usage:${event.event}:total`)
      pipeline.incr(`usage:daily:${date}:${event.event}`)

      // os/arch breakdown
      pipeline.incr(`usage:os:${os}`)
      pipeline.incr(`usage:arch:${arch}`)

      // event-specific properties
      if (event.event === "session.started" || event.event === "message.sent") {
        const provider = sanitize(event.properties?.provider as string)
        const model = sanitize(event.properties?.model as string)
        if (provider) pipeline.incr(`usage:provider:${provider}`)
        if (model) pipeline.incr(`usage:model:${model}`)
      }

      if (event.event === "tool.invoked") {
        const tool = sanitize(event.properties?.tool as string)
        if (tool) pipeline.incr(`usage:tool:${tool}`)
      }

      if (event.event === "command.used") {
        const command = sanitize(event.properties?.command as string)
        if (command) pipeline.incr(`usage:command:${command}`)
      }
    }

    await pipeline.exec()

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error("Track usage error:", error)
    return new Response(null, { status: 204 })
  }
}

function sanitize(value: string | undefined): string | undefined {
  if (!value) return undefined
  // only allow alphanumeric, dash, underscore, slash, dot
  const sanitized = value.replace(/[^a-zA-Z0-9\-_/.]/g, "").slice(0, 100)
  return sanitized || undefined
}
