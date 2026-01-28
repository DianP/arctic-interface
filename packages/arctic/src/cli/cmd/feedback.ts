import * as prompts from "@clack/prompts"
import { Telemetry } from "../../telemetry"
import { UI } from "../ui"
import { cmd } from "./cmd"

export const FeedbackCommand = cmd({
  command: "feedback",
  describe: "send feedback to the Arctic team",
  async handler() {
    UI.empty()
    prompts.intro("Feedback")

    const feedback = await prompts.text({
      message: "What would you like to tell us?",
      placeholder: "I love Arctic because... or I wish Arctic could...",
      validate: (value) => {
        if (!value || value.trim().length === 0) return "Please enter some feedback"
        if (value.trim().length < 10) return "Please provide a bit more detail (at least 10 characters)"
        return
      },
    })

    if (prompts.isCancel(feedback)) {
      prompts.outro("Cancelled")
      return
    }

    const category = await prompts.select({
      message: "What type of feedback is this?",
      options: [
        { value: "feature", label: "Feature Request", hint: "Something you'd like to see added" },
        { value: "improvement", label: "Improvement", hint: "Something that could work better" },
        { value: "praise", label: "Praise", hint: "Tell us what you love" },
        { value: "other", label: "Other", hint: "Anything else" },
      ],
    })

    if (prompts.isCancel(category)) {
      prompts.outro("Cancelled")
      return
    }

    const confirm = await prompts.confirm({
      message: "Would you like to include your feedback in anonymous telemetry to help us improve?",
      initialValue: true,
    })

    if (prompts.isCancel(confirm)) {
      prompts.outro("Cancelled")
      return
    }

    if (confirm) {
      await Telemetry.track("feedback.submitted", {
        category: category as string,
        length: feedback.length,
      })
      await Telemetry.flush()
    }

    const issueURL = new URL("https://github.com/arctic-cli/interface/issues/new?template=feature-request.yml")
    issueURL.searchParams.set("title", `${category}: ${feedback.slice(0, 100)}`)
    issueURL.searchParams.set("description", feedback)

    prompts.log.success("Thank you for your feedback!")
    prompts.log.message(``)
    prompts.log.message(`We've prepared a GitHub issue with your feedback:`)
    prompts.log.message(UI.hyperlink(issueURL.toString(), "Click here to submit your feedback on GitHub"))
    prompts.log.message(``)
    prompts.log.message(`Or copy this URL:`)
    prompts.log.message(issueURL.toString())

    prompts.outro("Thank you for helping make Arctic better!")
  },
})
