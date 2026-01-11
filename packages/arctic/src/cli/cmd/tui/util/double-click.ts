import type { CliRenderer, Renderable } from "@opentui/core"

export interface DoubleClickDetector {
  handleClick: (x: number, y: number, timestamp: number) => boolean
  reset: () => void
}

export interface MultiClickDetector {
  handleClick: (x: number, y: number, timestamp: number) => number
  reset: () => void
}

export namespace DoubleClick {
  const DOUBLE_CLICK_THRESHOLD = 400 // ms
  const POSITION_THRESHOLD = 2 // pixels

  export function create(): DoubleClickDetector {
    let lastClickTime = 0
    let lastClickX = 0
    let lastClickY = 0

    return {
      handleClick: (x: number, y: number, timestamp: number): boolean => {
        const timeDiff = timestamp - lastClickTime
        const xDiff = Math.abs(x - lastClickX)
        const yDiff = Math.abs(y - lastClickY)

        const isDoubleClick =
          timeDiff < DOUBLE_CLICK_THRESHOLD && xDiff <= POSITION_THRESHOLD && yDiff <= POSITION_THRESHOLD

        lastClickTime = timestamp
        lastClickX = x
        lastClickY = y

        return isDoubleClick
      },

      reset: () => {
        lastClickTime = 0
        lastClickX = 0
        lastClickY = 0
      },
    }
  }

  export function createMultiClick(): MultiClickDetector {
    let lastClickTime = 0
    let lastClickX = 0
    let lastClickY = 0
    let clickCount = 0

    return {
      handleClick: (x: number, y: number, timestamp: number): number => {
        const timeDiff = timestamp - lastClickTime
        const xDiff = Math.abs(x - lastClickX)
        const yDiff = Math.abs(y - lastClickY)

        const isMultiClick =
          timeDiff < DOUBLE_CLICK_THRESHOLD && xDiff <= POSITION_THRESHOLD && yDiff <= POSITION_THRESHOLD

        clickCount = isMultiClick ? clickCount + 1 : 1
        lastClickTime = timestamp
        lastClickX = x
        lastClickY = y

        return clickCount
      },

      reset: () => {
        lastClickTime = 0
        lastClickX = 0
        lastClickY = 0
        clickCount = 0
      },
    }
  }

  export function selectWordAtPosition(renderer: CliRenderer, x: number, y: number): boolean {
    const existingSelection = renderer.getSelection()
    if (existingSelection?.isActive) {
      const selectedText = existingSelection.getSelectedText()

      if (!selectedText || selectedText.length === 0) {
        renderer.clearSelection()
      } else {
        return false
      }
    }

    const root = renderer.root
    if (!root) {
      return false
    }

    const target = findSelectableAtPosition(root, x, y)
    if (!target) {
      return false
    }

    if (!target.shouldStartSelection(x, y)) {
      return false
    }

    const wordBounds = findWordBoundsInRenderable(target, x, y)
    if (!wordBounds) {
      return false
    }

    renderer.startSelection(target, wordBounds.startX, wordBounds.y)

    // complete selection synchronously so selection handlers see selected text.
    renderer.updateSelection(target, wordBounds.endX, wordBounds.y)

    return true
  }

  export function selectLineAtPosition(renderer: CliRenderer, x: number, y: number): boolean {
    const existingSelection = renderer.getSelection()
    if (existingSelection?.isActive) {
      const selectedText = existingSelection.getSelectedText()

      if (!selectedText || selectedText.length === 0) {
        renderer.clearSelection()
      } else {
        return false
      }
    }

    const root = renderer.root
    if (!root) {
      return false
    }

    const target = findSelectableAtPosition(root, x, y)
    if (!target) {
      return false
    }

    if (!target.shouldStartSelection(x, y)) {
      return false
    }

    const lineBounds = findLineBoundsInRenderable(target, x, y)
    if (!lineBounds) {
      return false
    }

    renderer.startSelection(target, lineBounds.startX, lineBounds.y)
    renderer.updateSelection(target, lineBounds.endX, lineBounds.y)

    return true
  }

  function findSelectableAtPosition(renderable: Renderable, x: number, y: number): Renderable | null {
    if (!renderable.visible) return null

    const rx = renderable.x
    const ry = renderable.y
    const rw = renderable.width
    const rh = renderable.height

    if (x < rx || x >= rx + rw || y < ry || y >= ry + rh) {
      return null
    }

    const children = renderable.getChildren()
    for (let i = children.length - 1; i >= 0; i--) {
      const found = findSelectableAtPosition(children[i], x, y)
      if (found) return found
    }

    const renderableAny = renderable as any
    if (renderableAny.selectable === false) return null

    if (renderable.shouldStartSelection(x, y)) {
      return renderable
    }

    return null
  }

  function findWordBoundsInRenderable(
    renderable: Renderable,
    clickX: number,
    clickY: number,
  ): { startX: number; endX: number; y: number } | null {
    const renderableAny = renderable as any
    const textSource = renderableAny.content ?? renderableAny.text ?? renderableAny.value
    const rawText = typeof textSource === "string" ? textSource : ""
    const plainText =
      renderableAny.plainText ??
      renderableAny.textBufferView?.getPlainText?.() ??
      rawText ??
      renderable.getSelectedText?.()

    if (!plainText) return null

    const rx = renderable.x
    const ry = renderable.y
    const relativeX = clickX - rx
    const relativeY = clickY - ry
    const lineIndex = Math.floor(relativeY)

    const lineInfo = renderableAny.lineInfo ?? renderableAny.textBufferView?.lineInfo
    const lineStarts = lineInfo?.lineStarts
    const lineWidths = lineInfo?.lineWidths

    if (lineStarts && lineWidths && lineIndex >= 0 && lineIndex < lineStarts.length) {
      const startOffset = lineStarts[lineIndex] ?? 0
      const width = lineWidths[lineIndex] ?? 0
      const line = plainText.slice(startOffset, startOffset + width)
      if (!line) return null

      const charIndex = Math.min(Math.max(Math.floor(relativeX), 0), Math.max(line.length - 1, 0))
      const wordBounds = findWordBoundaries(line, charIndex)
      if (!wordBounds) return null

      return {
        startX: rx + wordBounds.start,
        endX: rx + wordBounds.end,
        y: ry + lineIndex,
      }
    }

    const lines = plainText.split("\n")
    if (lineIndex < 0 || lineIndex >= lines.length) return null

    const line = lines[lineIndex]
    if (!line) return null

    const charIndex = Math.floor(relativeX)
    if (charIndex < 0 || charIndex >= line.length) return null

    const wordBounds = findWordBoundaries(line, charIndex)
    if (!wordBounds) return null

    return {
      startX: rx + wordBounds.start,
      endX: rx + wordBounds.end,
      y: ry + lineIndex,
    }
  }

  function findLineBoundsInRenderable(
    renderable: Renderable,
    clickX: number,
    clickY: number,
  ): { startX: number; endX: number; y: number } | null {
    const renderableAny = renderable as any
    const textSource = renderableAny.content ?? renderableAny.text ?? renderableAny.value
    const rawText = typeof textSource === "string" ? textSource : ""
    const plainText =
      renderableAny.plainText ??
      renderableAny.textBufferView?.getPlainText?.() ??
      rawText ??
      renderable.getSelectedText?.()

    if (!plainText) return null

    const rx = renderable.x
    const ry = renderable.y
    const relativeY = clickY - ry
    const lineIndex = Math.floor(relativeY)

    const lineInfo = renderableAny.lineInfo ?? renderableAny.textBufferView?.lineInfo
    const lineStarts = lineInfo?.lineStarts
    const lineWidths = lineInfo?.lineWidths

    if (lineStarts && lineWidths && lineIndex >= 0 && lineIndex < lineStarts.length) {
      const startOffset = lineStarts[lineIndex] ?? 0
      const width = lineWidths[lineIndex] ?? 0
      const line = plainText.slice(startOffset, startOffset + width)

      return {
        startX: rx,
        endX: rx + line.length,
        y: ry + lineIndex,
      }
    }

    const lines = plainText.split("\n")
    if (lineIndex < 0 || lineIndex >= lines.length) return null

    const line = lines[lineIndex]
    if (!line) return null

    return {
      startX: rx,
      endX: rx + line.length,
      y: ry + lineIndex,
    }
  }

  function findWordBoundaries(text: string, index: number): { start: number; end: number } | null {
    if (index < 0 || index >= text.length) return null

    const char = text[index]
    if (!char || /\s/.test(char)) return null

    let start = index
    let end = index + 1

    const isWordChar = /[\w]/.test(char)

    if (isWordChar) {
      while (start > 0 && /[\w]/.test(text[start - 1])) {
        start--
      }
      while (end < text.length && /[\w]/.test(text[end])) {
        end++
      }
    } else {
      while (start > 0 && !/[\s\w]/.test(text[start - 1])) {
        start--
      }
      while (end < text.length && !/[\s\w]/.test(text[end])) {
        end++
      }
    }

    if (end <= start) return null

    return { start, end }
  }
}
