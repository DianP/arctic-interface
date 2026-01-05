import { test, expect, describe, mock } from "bun:test"
import { ArcticAnthropicAuth } from "@/auth/anthropic-oauth"

describe("Anthropic OAuth", () => {
  test("extracts code and state from full callback parameter", async () => {
    const plugin = await ArcticAnthropicAuth({} as any)

    if (!plugin.auth?.methods[0]) {
      throw new Error("Auth method not found")
    }

    const method = plugin.auth.methods[0]
    if (method.type !== "oauth" || !method.authorize) {
      throw new Error("OAuth method not found")
    }

    const authorize = await method.authorize()

    // Mock the authorization code that users paste (includes state after #)
    const fullCallbackCode =
      "Olxp9jUqhSPxHsttEpVMU87TOaaS7rXWexz2oyzA3p7x7PAB#3fe5559ecdcad747ab0a8bde42cb8bf9f793ef4de29e6866793f61c9cc8882d1bf529eb65cf36e89735f58877a44fd380dd9e6fe5e1529f4922f818c2d590f02"

    // Mock fetch to capture the request
    let capturedRequestBody: any = null
    const originalFetch = globalThis.fetch

    // @ts-expect-error - Mocking fetch
    globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
      if (url.toString().includes("oauth/token")) {
        // Parse the JSON body
        capturedRequestBody = JSON.parse(init?.body as string)
        return new Response(
          JSON.stringify({
            access_token: "test_access_token",
            refresh_token: "test_refresh_token",
            expires_in: 3600,
            token_type: "bearer",
          }),
          { status: 200 },
        )
      }
      return originalFetch(url, init)
    })

    const result = await authorize.callback(fullCallbackCode)

    // Restore fetch
    globalThis.fetch = originalFetch

    // Verify that the code and state were properly extracted and sent
    expect(capturedRequestBody).toBeDefined()
    expect(capturedRequestBody.code).toBe("Olxp9jUqhSPxHsttEpVMU87TOaaS7rXWexz2oyzA3p7x7PAB")
    expect(capturedRequestBody.state).toBe(
      "3fe5559ecdcad747ab0a8bde42cb8bf9f793ef4de29e6866793f61c9cc8882d1bf529eb65cf36e89735f58877a44fd380dd9e6fe5e1529f4922f818c2d590f02",
    )
    expect(capturedRequestBody.code).not.toContain("#")
    expect(capturedRequestBody.grant_type).toBe("authorization_code")

    // Verify success
    expect(result.type).toBe("success")
  })

  test("handles code without state", async () => {
    const plugin = await ArcticAnthropicAuth({} as any)

    const method = plugin.auth?.methods[0]
    if (method?.type !== "oauth" || !method.authorize) {
      throw new Error("OAuth method not found")
    }

    const authorize = await method.authorize()

    // Just the code without state
    const cleanCode = "someCode123"

    let capturedRequestBody: any = null
    const originalFetch = globalThis.fetch

    // @ts-expect-error - Mocking fetch
    globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
      if (url.toString().includes("oauth/token")) {
        capturedRequestBody = JSON.parse(init?.body as string)
        return new Response(
          JSON.stringify({
            access_token: "test_access_token",
            refresh_token: "test_refresh_token",
            expires_in: 3600,
            token_type: "bearer",
          }),
          { status: 200 },
        )
      }
      return originalFetch(url, init)
    })

    const result = await authorize.callback(cleanCode)

    // Restore fetch
    globalThis.fetch = originalFetch

    // Verify that the code was sent
    expect(capturedRequestBody).toBeDefined()
    expect(capturedRequestBody.code).toBe("someCode123")
    // State should be the generated state from authorize
    expect(capturedRequestBody.state).toBeDefined()
    expect(capturedRequestBody.state.length).toBeGreaterThan(0)

    // Verify success
    expect(result.type).toBe("success")
  })

  test("uses JSON content type", async () => {
    const plugin = await ArcticAnthropicAuth({} as any)

    const method = plugin.auth?.methods[0]
    if (method?.type !== "oauth" || !method.authorize) {
      throw new Error("OAuth method not found")
    }

    const authorize = await method.authorize()

    let capturedHeaders: Headers | undefined
    const originalFetch = globalThis.fetch

    // @ts-expect-error - Mocking fetch
    globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
      if (url.toString().includes("oauth/token")) {
        capturedHeaders = new Headers(init?.headers)
        return new Response(
          JSON.stringify({
            access_token: "test_access_token",
            refresh_token: "test_refresh_token",
            expires_in: 3600,
            token_type: "bearer",
          }),
          { status: 200 },
        )
      }
      return originalFetch(url, init)
    })

    await authorize.callback("code123#state456")

    // Restore fetch
    globalThis.fetch = originalFetch

    // Verify Content-Type is application/json
    expect(capturedHeaders).toBeDefined()
    expect(capturedHeaders!.get("Content-Type")).toBe("application/json")
  })
})
