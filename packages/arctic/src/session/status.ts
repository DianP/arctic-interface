import { BusEvent } from "@/bus/bus-event"
import { Bus } from "@/bus"
import { Instance } from "@/project/instance"
import z from "zod"

export namespace SessionStatus {
  export const Info = z
    .union([
      z.object({
        type: z.literal("idle"),
      }),
      z.object({
        type: z.literal("retry"),
        attempt: z.number(),
        message: z.string(),
        next: z.number(),
      }),
      z.object({
        type: z.literal("busy"),
      }),
      z.object({
        type: z.literal("account-switch"),
        from: z.string(),
        to: z.string(),
      }),
    ])
    .meta({
      ref: "SessionStatus",
    })
  export type Info = z.infer<typeof Info>

  // Track last account switch for UI display (persists even after status changes)
  const accountSwitchState = new Map<string, { from: string; to: string; time: number }>()

  export const Event = {
    Status: BusEvent.define(
      "session.status",
      z.object({
        sessionID: z.string(),
        status: Info,
      }),
    ),
    // deprecated
    Idle: BusEvent.define(
      "session.idle",
      z.object({
        sessionID: z.string(),
      }),
    ),
  }

  const state = Instance.state(() => {
    const data: Record<string, Info> = {}
    return data
  })

  export function get(sessionID: string) {
    return (
      state()[sessionID] ?? {
        type: "idle",
      }
    )
  }

  export function list() {
    return state()
  }

  export function set(sessionID: string, status: Info) {
    Bus.publish(Event.Status, {
      sessionID,
      status,
    })
    if (status.type === "idle") {
      // deprecated
      Bus.publish(Event.Idle, {
        sessionID,
      })
      delete state()[sessionID]
      return
    }
    // Store account switch info for UI display
    if (status.type === "account-switch") {
      accountSwitchState.set(sessionID, {
        from: status.from,
        to: status.to,
        time: Date.now(),
      })
    }
    state()[sessionID] = status
  }

  // Get last account switch (returns undefined if older than 5 seconds)
  export function getLastAccountSwitch(sessionID: string): { from: string; to: string } | undefined {
    const switchInfo = accountSwitchState.get(sessionID)
    if (!switchInfo) return undefined
    // Expire after 5 seconds
    if (Date.now() - switchInfo.time > 5000) {
      accountSwitchState.delete(sessionID)
      return undefined
    }
    return { from: switchInfo.from, to: switchInfo.to }
  }
}
