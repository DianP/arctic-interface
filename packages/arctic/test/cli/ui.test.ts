import { test, expect, describe } from "bun:test"
import { UI } from "@/cli/ui"

describe("UI.hyperlink", () => {
  test("creates OSC 8 hyperlink with URL only", () => {
    const url = "https://example.com"
    const result = UI.hyperlink(url)
    expect(result).toBe("\x1b]8;;https://example.com\x07https://example.com\x1b]8;;\x07")
  })

  test("creates OSC 8 hyperlink with custom text", () => {
    const url = "https://example.com"
    const text = "Click here"
    const result = UI.hyperlink(url, text)
    expect(result).toBe("\x1b]8;;https://example.com\x07Click here\x1b]8;;\x07")
  })

  test("handles authentication URLs", () => {
    const url = "https://console.anthropic.com/oauth/authorize?code=abc123"
    const result = UI.hyperlink(url)
    expect(result).toContain(url)
    expect(result).toStartWith("\x1b]8;;")
    expect(result).toEndWith("\x1b]8;;\x07")
  })

  test("escapes work correctly in terminal output", () => {
    // Ensure the format matches OSC 8 standard: ESC ] 8 ; ; URL BEL TEXT ESC ] 8 ; ; BEL
    const url = "https://test.com"
    const result = UI.hyperlink(url, "test")
    // Check it starts with OSC 8 escape
    expect(result).toStartWith("\x1b]8;;https://test.com\x07")
    // Check it contains the display text
    expect(result).toContain("test")
    // Check it ends with the closing OSC 8 escape
    expect(result).toEndWith("\x1b]8;;\x07")
    // Verify exact format
    expect(result).toBe("\x1b]8;;https://test.com\x07test\x1b]8;;\x07")
  })
})
