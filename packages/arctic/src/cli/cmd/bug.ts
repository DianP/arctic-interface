import * as prompts from "@clack/prompts"
import os from "os"
import { Telemetry } from "../../telemetry"
import { Installation } from "../../installation"
import { UI } from "../ui"
import { cmd } from "./cmd"

export const BugCommand = cmd({
  command: "bug",
  describe: "report a bug to the Arctic team",
  async handler() {
    UI.empty()
    prompts.intro("Bug Report")

    const description = await prompts.text({
      message: "Describe the bug",
      placeholder: "What happened? What did you expect to happen?",
      validate: (value) => {
        if (!value || value.trim().length === 0) return "Please describe the bug"
        if (value.trim().length < 20) return "Please provide more detail (at least 20 characters)"
        return
      },
    })

    if (prompts.isCancel(description)) {
      prompts.outro("Cancelled")
      return
    }

    const steps = await prompts.text({
      message: "Steps to reproduce (optional)",
      placeholder: "1. Go to... 2. Click on... 3. See error...",
    })

    if (prompts.isCancel(steps)) {
      prompts.outro("Cancelled")
      return
    }

    const context = await prompts.confirm({
      message: "Include system info (OS, Arctic version) in the report?",
      initialValue: true,
    })

    if (prompts.isCancel(context)) {
      prompts.outro("Cancelled")
      return
    }

    await Telemetry.track("bug.reported", {
      hasSteps: steps ? true : false,
      length: description.length,
    })
    await Telemetry.flush()

    const issueURL = new URL("https://github.com/arctic-cli/interface/issues/new?template=bug-report.yml")
    issueURL.searchParams.set("title", `bug: ${description.slice(0, 100)}`)

    let fullDescription = description
    if (steps) {
      fullDescription += `\n\n## Steps to Reproduce\n${steps}`
    }
    if (context) {
      fullDescription += `\n\n## System Info\n- Arctic version: ${Installation.VERSION}\n- Channel: ${Installation.CHANNEL}\n- OS: ${os.platform()} ${os.arch()}\n- Node version: ${process.version}`
    }
    issueURL.searchParams.set("description", fullDescription)

    prompts.log.success("Thank you for reporting this bug!")
    prompts.log.message(``)
    prompts.log.message(`We've prepared a GitHub issue with your report:`)
    prompts.log.message(UI.hyperlink(issueURL.toString(), "Click here to submit your bug report on GitHub"))
    prompts.log.message(``)
    prompts.log.message(`Or copy this URL:`)
    prompts.log.message(issueURL.toString())

    prompts.outro("Thank you for helping make Arctic better!")
  },
})
