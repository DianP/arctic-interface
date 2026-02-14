import * as prompts from "@clack/prompts"
import { Config } from "../../config/config"
import { Instance } from "../../project/instance"
import { UI } from "../ui"
import { cmd } from "./cmd"

export const MultiAccountCommand = cmd({
  command: "multi-account",
  describe: "manage multi-account rotation settings",
  builder: (yargs) =>
    yargs
      .command(MultiAccountStatusCommand)
      .command(MultiAccountRoundRobinCommand)
      .command(MultiAccountFillFirstCommand)
      .demandCommand(),
  async handler() {},
})

export const MultiAccountStatusCommand = cmd({
  command: "status",
  describe: "show multi-account mode status",
  async handler() {
    await Instance.provide({
      directory: process.cwd(),
      async fn() {
        UI.empty()
        prompts.intro("Multi-Account")

        const config = await Config.get()
        const mode = config.multi_account?.mode ?? "fill-first"

        const modeLabel = mode === "round-robin" ? "Round Robin ⟳" : "Fill-First ↻"
        const isDefault = !config.multi_account?.mode

        prompts.log.info(
          `Status: ${UI.Style.TEXT_SUCCESS}${modeLabel}${UI.Style.TEXT_NORMAL}${isDefault ? " (default)" : ""}`,
        )
        prompts.log.message("")
        if (mode === "round-robin") {
          prompts.log.message("Accounts rotate at the start of each new user message")
        } else {
          prompts.log.message("Uses current account until error, then switches to next")
        }
        prompts.log.message("")
        if (mode === "round-robin") {
          prompts.log.message("Run `arctic multi-account fill-first` to switch to fill-first mode")
        } else {
          prompts.log.message("Run `arctic multi-account round-robin` to switch to round-robin mode")
        }

        prompts.outro("")
      },
    })
  },
})

export const MultiAccountRoundRobinCommand = cmd({
  command: "round-robin",
  describe: "enable round-robin mode (rotate account on each message)",
  async handler() {
    UI.empty()
    prompts.intro("Multi-Account")

    await Config.updateGlobal({
      multi_account: {
        mode: "round-robin",
      },
    })

    prompts.log.success("Round-robin mode enabled ⟳")
    prompts.log.message("Accounts will rotate at the start of each new user message")

    prompts.outro("Done")
  },
})

export const MultiAccountFillFirstCommand = cmd({
  command: "fill-first",
  describe: "enable fill-first mode (use account until error) [default]",
  async handler() {
    UI.empty()
    prompts.intro("Multi-Account")

    await Config.updateGlobal({
      multi_account: {
        mode: "fill-first",
      },
    })

    prompts.log.success("Fill-first mode enabled ↻ (default)")
    prompts.log.message("Will use current account until error, then switch to next")

    prompts.outro("Done")
  },
})
