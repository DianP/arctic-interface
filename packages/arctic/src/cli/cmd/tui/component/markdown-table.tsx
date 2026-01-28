import { TextAttributes } from "@opentui/core"
import { useTheme } from "@tui/context/theme"
import { createMemo, For, Show, type Component } from "solid-js"

interface TableCell {
  content: string
  align: "left" | "center" | "right"
}

interface TableRow {
  cells: TableCell[]
  isHeader: boolean
}

interface ParsedTable {
  rows: TableRow[]
  columnCount: number
  columnAligns: ("left" | "center" | "right")[]
  headers: string[]
}

function parseMarkdownTable(content: string): ParsedTable | null {
  const lines = content.split("\n").filter((line) => line.trim())
  if (lines.length < 2) return null

  const tableLines: string[] = []
  let inTable = false

  for (const line of lines) {
    if (line.includes("|")) {
      tableLines.push(line)
      inTable = true
    } else if (inTable) {
      break
    }
  }

  if (tableLines.length < 2) return null

  const separatorLine = tableLines[1]
  const isSeparator = /^[\s\|\-\:]+$/.test(separatorLine)
  if (!isSeparator) return null

  const separatorCells = separatorLine.split("|").map((s) => s.trim())
  const columnAligns: ("left" | "center" | "right")[] = []

  for (const cell of separatorCells) {
    if (!cell) continue
    const leftColon = cell.startsWith(":")
    const rightColon = cell.endsWith(":")

    if (leftColon && rightColon) {
      columnAligns.push("center")
    } else if (rightColon) {
      columnAligns.push("right")
    } else {
      columnAligns.push("left")
    }
  }

  const rows: TableRow[] = []
  const headers: string[] = []

  for (let i = 0; i < tableLines.length; i++) {
    if (i === 1) continue

    const line = tableLines[i]
    const cellTexts = line.split("|").map((s) => s.trim())
    const cells: TableCell[] = []

    for (let j = 0; j < cellTexts.length; j++) {
      const cellText = cellTexts[j]
      if (!cellText && j === 0) continue
      if (!cellText && j === cellTexts.length - 1) continue

      cells.push({
        content: cellText,
        align: columnAligns[cells.length] ?? "left",
      })
    }

    if (cells.length > 0) {
      if (i === 0) {
        cells.forEach((cell) => headers.push(cell.content))
      }
      rows.push({
        cells,
        isHeader: i === 0,
      })
    }
  }

  if (rows.length === 0) return null

  return {
    rows,
    columnCount: Math.max(...rows.map((r) => r.cells.length)),
    columnAligns,
    headers,
  }
}

function containsEmoji(text: string): boolean {
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    if (
      (code >= 0x1f300 && code <= 0x1f9ff) ||
      (code >= 0x2600 && code <= 0x26ff) ||
      (code >= 0x2700 && code <= 0x27bf)
    ) {
      return true
    }
  }
  return false
}

function calculateColumnWidths(table: ParsedTable, maxWidth: number): number[] | null {
  const padding = 2
  const minWidth = 3

  const contentWidths: number[] = []
  const hasEmojiInColumn: boolean[] = []

  for (let col = 0; col < table.columnCount; col++) {
    let maxContentWidth = 0
    let hasEmoji = false
    for (const row of table.rows) {
      const cell = row.cells[col]
      if (cell) {
        maxContentWidth = Math.max(maxContentWidth, getDisplayWidth(cell.content))
        if (containsEmoji(cell.content)) {
          hasEmoji = true
        }
      }
    }
    const extraPadding = hasEmoji ? 1 : 0
    contentWidths[col] = Math.max(minWidth, maxContentWidth + padding + extraPadding)
    hasEmojiInColumn[col] = hasEmoji
  }

  const totalWidth = contentWidths.reduce((sum, w) => sum + w, 0) + table.columnCount + 1

  // Return null if table is too wide to render properly
  if (totalWidth > maxWidth) {
    return null
  }

  return contentWidths
}

function getDisplayWidth(text: string): number {
  let width = 0
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    if (code < 0x80) {
      width += 1
    } else if (
      (code >= 0x1f300 && code <= 0x1f9ff) ||
      (code >= 0x2600 && code <= 0x26ff) ||
      (code >= 0x2700 && code <= 0x27bf) ||
      (code >= 0x2e80 && code <= 0x9fff) ||
      (code >= 0xac00 && code <= 0xd7af) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe00 && code <= 0xfe0f) ||
      (code >= 0x1f1e6 && code <= 0x1f1ff)
    ) {
      width += 2
    } else {
      width += 1
    }
  }
  return width
}

function truncateText(text: string, maxWidth: number): string {
  let width = 0
  let result = ""
  for (const char of text) {
    const charWidth = getDisplayWidth(char)
    if (width + charWidth > maxWidth - 1) {
      return result + "…"
    }
    result += char
    width += charWidth
  }
  return result
}

function padText(text: string, width: number, align: "left" | "center" | "right"): string {
  const truncated = truncateText(text, width - 2)
  const contentWidth = getDisplayWidth(truncated)
  const padding = width - 2 - contentWidth

  if (align === "center") {
    const leftPad = Math.floor(padding / 2)
    const rightPad = padding - leftPad
    return " " + " ".repeat(leftPad) + truncated + " ".repeat(rightPad) + " "
  }

  if (align === "right") {
    return " " + " ".repeat(padding) + truncated + " "
  }

  return " " + truncated + " ".repeat(padding) + " "
}

interface TableProps {
  content: string
  maxWidth?: number
}

export const MarkdownTable: Component<TableProps> = (props) => {
  const { theme } = useTheme()

  const table = createMemo(() => {
    const parsed = parseMarkdownTable(props.content)
    if (!parsed) return null
    const maxWidth = props.maxWidth ?? 100
    const widths = calculateColumnWidths(parsed, maxWidth)
    return { parsed, widths, maxWidth }
  })

  const borderColor = () => String(theme.border ?? "#666666")
  const headerColor = () => String(theme.text ?? "#ffffff")
  const textColor = () => String(theme.textMuted ?? "#888888")

  return (
    <Show when={table()}>
      {(data) => (
        <Show
          when={data().widths !== null}
          fallback={
            <VerticalTableView
              parsed={data().parsed}
              maxWidth={data().maxWidth}
              headerColor={headerColor()}
              textColor={textColor()}
              borderColor={borderColor()}
            />
          }
        >
          <box flexDirection="column" gap={0}>
            <text fg={borderColor()}>
              {"┌" +
                data()
                  .widths!.map((w) => "─".repeat(w))
                  .join("┬") +
                "┐"}
            </text>

            <Show when={data().parsed.rows[0]}>
              {(headerRow) => (
                <>
                  <text fg={borderColor()} attributes={TextAttributes.BOLD}>
                    {"│" +
                      headerRow()
                        .cells.map((cell, i) => padText(cell.content, data().widths![i], cell.align))
                        .join("│") +
                      "│"}
                  </text>

                  <text fg={borderColor()}>
                    {"├" +
                      data()
                        .widths!.map((w) => "─".repeat(w))
                        .join("┼") +
                      "┤"}
                  </text>
                </>
              )}
            </Show>

            <For each={data().parsed.rows.slice(1)}>
              {(row) => (
                <text fg={borderColor()}>
                  {"│" + row.cells.map((cell, i) => padText(cell.content, data().widths![i], cell.align)).join("│") + "│"}
                </text>
              )}
            </For>

            <text fg={borderColor()}>
              {"└" +
                data()
                  .widths!.map((w) => "─".repeat(w))
                  .join("┴") +
                "┘"}
            </text>
          </box>
        </Show>
      )}
    </Show>
  )
}

interface VerticalTableViewProps {
  parsed: ParsedTable
  maxWidth: number
  headerColor: string
  textColor: string
  borderColor: string
}

const VerticalTableView: Component<VerticalTableViewProps> = (props) => {
  const dataRows = () => props.parsed.rows.slice(1)
  const headers = () => props.parsed.headers

  const labelWidth = createMemo(() => {
    const maxHeaderWidth = Math.max(...headers().map((h) => getDisplayWidth(h)))
    return Math.min(maxHeaderWidth + 2, Math.floor(props.maxWidth * 0.4))
  })

  const valueWidth = () => props.maxWidth - labelWidth() - 3

  const hLine = () => "─".repeat(props.maxWidth)

  return (
    <box flexDirection="column" gap={0}>
      <For each={dataRows()}>
        {(row, rowIndex) => (
          <>
            <Show when={rowIndex() > 0}>
              <text fg={props.borderColor}>{hLine()}</text>
            </Show>
            <For each={row.cells}>
              {(cell, cellIndex) => (
                <box flexDirection="row">
                  <text fg={props.headerColor} attributes={TextAttributes.BOLD}>
                    {truncateText(headers()[cellIndex()] ?? "", labelWidth()).padEnd(labelWidth())}
                  </text>
                  <text fg={props.borderColor}> | </text>
                  <text fg={props.textColor} wrapMode="word">
                    {truncateText(cell.content, valueWidth())}
                  </text>
                </box>
              )}
            </For>
          </>
        )}
      </For>
    </box>
  )
}

interface ContentPart {
  type: "table" | "text"
  content: string
}

export function splitContentByTables(content: string): ContentPart[] {
  const parts: ContentPart[] = []
  const lines = content.split("\n")
  let currentText: string[] = []
  let currentTable: string[] = []
  let inTable = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isTableLine = line.includes("|")

    if (isTableLine && !inTable) {
      if (currentText.length > 0) {
        parts.push({ type: "text", content: currentText.join("\n") })
        currentText = []
      }
      currentTable = [line]
      inTable = true
    } else if (isTableLine && inTable) {
      currentTable.push(line)
    } else if (!isTableLine && inTable) {
      const tableContent = currentTable.join("\n")
      if (parseMarkdownTable(tableContent)) {
        parts.push({ type: "table", content: tableContent })
      } else {
        parts.push({ type: "text", content: tableContent })
      }
      currentTable = []
      inTable = false
      currentText = [line]
    } else {
      currentText.push(line)
    }
  }

  if (currentTable.length > 0) {
    const tableContent = currentTable.join("\n")
    if (parseMarkdownTable(tableContent)) {
      parts.push({ type: "table", content: tableContent })
    } else {
      parts.push({ type: "text", content: tableContent })
    }
  }

  if (currentText.length > 0) {
    parts.push({ type: "text", content: currentText.join("\n") })
  }

  return parts
}
