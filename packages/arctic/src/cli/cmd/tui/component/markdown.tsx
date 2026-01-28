import { useTerminalDimensions } from "@opentui/solid"
import { useTheme } from "@tui/context/theme"
import { For, Show, createMemo, type Component } from "solid-js"
import { MarkdownTable, splitContentByTables } from "./markdown-table"

interface MarkdownProps {
  content: string
  conceal?: boolean
  streaming?: boolean
}

export const Markdown: Component<MarkdownProps> = (props) => {
  const { theme, syntax } = useTheme()
  const dimensions = useTerminalDimensions()

  // when streaming, render as plain text without any table parsing
  // this prevents expensive re-parsing on every character delta
  const parts = createMemo(() => {
    if (props.streaming) {
      return [{ type: "text" as const, content: props.content }]
    }
    return splitContentByTables(props.content)
  })

  const maxTableWidth = createMemo(() => {
    if (props.streaming) return 100
    return Math.max(40, dimensions().width - 10)
  })

  return (
    <Show
      when={!props.streaming}
      fallback={
        <code
          filetype="markdown"
          drawUnstyledText={false}
          streaming={true}
          syntaxStyle={syntax()}
          content={props.content}
          conceal={props.conceal ?? false}
          fg={theme.text}
        />
      }
    >
      <box flexDirection="column" gap={0}>
        <For each={parts()}>
          {(part) => (
            <Show
              when={part.type === "table"}
              fallback={
                <code
                  filetype="markdown"
                  drawUnstyledText={false}
                  streaming={false}
                  syntaxStyle={syntax()}
                  content={part.content}
                  conceal={props.conceal ?? false}
                  fg={theme.text}
                />
              }
            >
              <MarkdownTable content={part.content} maxWidth={maxTableWidth()} />
            </Show>
          )}
        </For>
      </box>
    </Show>
  )
}
