import { useTheme } from "@tui/context/theme"
import type { Component } from "solid-js"

interface MarkdownProps {
  content: string
  conceal?: boolean
  streaming?: boolean
}

export const Markdown: Component<MarkdownProps> = (props) => {
  const { syntax } = useTheme()

  return (
    <markdown
      syntaxStyle={syntax()}
      streaming={props.streaming ?? false}
      content={props.content}
      conceal={props.conceal ?? false}
    />
  )
}
