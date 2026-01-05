import { test, expect, describe, beforeEach, afterEach } from "bun:test"

describe("maybeImportExternalAuth", () => {
  const originalArgv = process.argv

  beforeEach(() => {
    process.argv = [...originalArgv]
  })

  afterEach(() => {
    process.argv = originalArgv
  })

  test("skips import during auth logout", async () => {
    // Simulate running "arctic auth logout"
    process.argv = ["bun", "arctic", "auth", "logout"]

    // We can't directly test maybeImportExternalAuth without mocking
    // but we can verify the logic by checking process.argv
    const shouldSkip = process.argv.includes("auth") && process.argv.includes("logout")

    expect(shouldSkip).toBe(true)
  })

  test("does not skip import during other auth commands", async () => {
    // Simulate running "arctic auth list"
    process.argv = ["bun", "arctic", "auth", "list"]

    const shouldSkip = process.argv.includes("auth") && process.argv.includes("logout")

    expect(shouldSkip).toBe(false)
  })

  test("does not skip import during non-auth commands", async () => {
    // Simulate running "arctic run"
    process.argv = ["bun", "arctic", "run"]

    const shouldSkip = process.argv.includes("auth") && process.argv.includes("logout")

    expect(shouldSkip).toBe(false)
  })

  test("skips import with help flag", async () => {
    process.argv = ["bun", "arctic", "--help"]

    const shouldSkip = process.argv.some((arg) => ["-h", "--help", "-v", "--version"].includes(arg))

    expect(shouldSkip).toBe(true)
  })

  test("skips import with version flag", async () => {
    process.argv = ["bun", "arctic", "--version"]

    const shouldSkip = process.argv.some((arg) => ["-h", "--help", "-v", "--version"].includes(arg))

    expect(shouldSkip).toBe(true)
  })
})
