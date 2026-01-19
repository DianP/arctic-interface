import * as prompts from "@clack/prompts"
import { Telemetry } from "../../telemetry"
import { UI } from "../ui"
import { cmd } from "./cmd"

export const TelemetryCommand = cmd({
  command: "telemetry",
  describe: "manage anonymous usage telemetry",
  builder: (yargs) =>
    yargs
      .command(TelemetryEnableCommand)
      .command(TelemetryDisableCommand)
      .command(TelemetryStatusCommand)
      .demandCommand(),
  async handler() {},
})

export const TelemetryEnableCommand = cmd({
  command: "enable",
  describe: "enable anonymous telemetry",
  async handler() {
    UI.empty()
    prompts.intro("Telemetry")

    await Telemetry.setEnabled(true)
    prompts.log.success("Telemetry enabled")
    prompts.log.info("Anonymous usage data will be collected to help improve Arctic")

    prompts.outro("Done")
  },
})

export const TelemetryDisableCommand = cmd({
  command: "disable",
  describe: "disable anonymous telemetry",
  async handler() {
    UI.empty()
    prompts.intro("Telemetry")

    await Telemetry.setEnabled(false)
    prompts.log.success("Telemetry disabled")
    prompts.log.info("No usage data will be collected")

    prompts.outro("Done")
  },
})

export const TelemetryStatusCommand = cmd({
  command: "status",
  describe: "show telemetry status",
  async handler() {
    UI.empty()
    prompts.intro("Telemetry")

    const enabled = await Telemetry.isEnabled()

    if (enabled) {
      prompts.log.info(`Status: ${UI.Style.TEXT_SUCCESS}enabled${UI.Style.TEXT_NORMAL}`)
      prompts.log.message("Anonymous usage data is being collected to help improve Arctic")
      prompts.log.message("Run `arctic telemetry disable` to opt out")
    } else {
      prompts.log.info(`Status: ${UI.Style.TEXT_DIM}disabled${UI.Style.TEXT_NORMAL}`)
      prompts.log.message("No usage data is being collected")
      prompts.log.message("Run `arctic telemetry enable` to opt in")
    }

    prompts.outro("")
  },
})
