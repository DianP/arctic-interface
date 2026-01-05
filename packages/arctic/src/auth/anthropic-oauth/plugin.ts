import type { Plugin, PluginInput } from "@arctic-cli/plugin"
import { openBrowserUrl } from "../codex-oauth/auth/browser"

export const ArcticAnthropicAuth: Plugin = async (input: PluginInput) => {
  return {
    auth: {
      provider: "anthropic",

      async loader(getAuth, provider) {
        const auth = await getAuth()
        if (auth.type === "oauth") {
          // Zero out cost for Pro/Max plan users
          for (const model of Object.values(provider.models)) {
            model.cost = {
              input: 0,
              output: 0,
              cache: {
                read: 0,
                write: 0,
              },
            }
          }

          return {
            apiKey: "",
            async fetch(url: string | URL | Request, init?: RequestInit) {
              const currentAuth = await getAuth()
              if (currentAuth.type !== "oauth") return fetch(url, init)

              // Check if token needs refresh
              if (!currentAuth.access || currentAuth.expires < Date.now()) {
                const { refreshAccessToken } = await import("./token")
                const result = await refreshAccessToken(currentAuth.refresh)

                if (result.type === "failed") {
                  throw new Error("Token refresh failed")
                }

                // Update auth with new tokens
                const { Auth } = await import("@/auth")
                await Auth.set("anthropic", {
                  type: "oauth",
                  access: result.access!,
                  refresh: result.refresh!,
                  expires: result.expires!,
                })

                currentAuth.access = result.access!
              }

              // Add OAuth headers
              const incomingHeaders = init?.headers as Record<string, string> | undefined
              const incomingBeta = incomingHeaders?.["anthropic-beta"] || ""
              const incomingBetasList = incomingBeta
                .split(",")
                .map((b: string) => b.trim())
                .filter(Boolean)

              // Add oauth beta and deduplicate
              const mergedBetas = [
                ...new Set([
                  "oauth-2025-04-20",
                  "claude-code-20250219",
                  "interleaved-thinking-2025-05-14",
                  "fine-grained-tool-streaming-2025-05-14",
                  ...incomingBetasList,
                ]),
              ].join(",")

              const requestHeaders = {
                ...init?.headers,
                authorization: `Bearer ${currentAuth.access}`,
                "anthropic-beta": mergedBetas,
              }
              delete (requestHeaders as any)["x-api-key"]

              return fetch(url, {
                ...init,
                headers: requestHeaders,
              })
            },
          }
        }

        return {}
      },

      methods: [
        {
          label: "Claude.ai Account (OAuth)",
          type: "oauth" as const,
          async authorize() {
            // Generate OAuth parameters
            const clientId = "9d1c250a-e61b-44d9-88ed-5944d1962f5e"
            const redirectUri = "https://console.anthropic.com/oauth/code/callback"
            const scope = "org:create_api_key user:profile user:inference"

            // Generate PKCE challenge
            const codeVerifier = generateCodeVerifier()
            const codeChallenge = await generateCodeChallenge(codeVerifier)
            const state = generateRandomString(64)

            // Build authorization URL
            const params = new URLSearchParams({
              code: "true",
              client_id: clientId,
              response_type: "code",
              redirect_uri: redirectUri,
              scope,
              code_challenge: codeChallenge,
              code_challenge_method: "S256",
              state,
            })

            const url = `https://claude.ai/oauth/authorize?${params.toString()}`

            // Open browser automatically
            openBrowserUrl(url)

            return {
              url,
              instructions:
                "Opening browser to authenticate with Claude.ai...\n\nIf the browser doesn't open automatically, visit the URL above.",
              method: "code" as const,
              async callback(code: string) {
                if (!code) {
                  return { type: "failed" as const, error: "No authorization code provided" }
                }

                // Extract code and state from the callback parameter
                // The user pastes something like: "code#state"
                const splits = code.split("#")
                const actualCode = splits[0].trim()
                const actualState = splits[1] || state

                try {
                  // Exchange code for tokens
                  const tokenResponse = await fetch("https://console.anthropic.com/v1/oauth/token", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      code: actualCode,
                      state: actualState,
                      grant_type: "authorization_code",
                      client_id: clientId,
                      redirect_uri: redirectUri,
                      code_verifier: codeVerifier,
                    }),
                  })

                  if (!tokenResponse.ok) {
                    const errorText = await tokenResponse.text()
                    console.error("[Anthropic OAuth] Token exchange failed:", tokenResponse.status, errorText)
                    return { type: "failed" as const, error: `Token exchange failed: ${tokenResponse.status}` }
                  }

                  const tokenData = await tokenResponse.json()

                  if (!tokenData.access_token) {
                    console.error("[Anthropic OAuth] No access token in response:", tokenData)
                    return { type: "failed" as const, error: "No access token received" }
                  }

                  // Calculate expiration timestamp
                  const expiresAt = Date.now() + (tokenData.expires_in ?? 3600) * 1000

                  return {
                    type: "success" as const,
                    access: tokenData.access_token,
                    refresh: tokenData.refresh_token,
                    expires: expiresAt,
                  }
                } catch (error) {
                  console.error("[Anthropic OAuth] Error during token exchange:", error)
                  return {
                    type: "failed" as const,
                    error: error instanceof Error ? error.message : "Unknown error",
                  }
                }
              },
            }
          },
        },
      ],
    },
  }
}

/**
 * Generate a random string for PKCE code verifier or state
 */
function generateRandomString(length: number): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

/**
 * Generate PKCE code verifier (43-128 characters)
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

/**
 * Generate PKCE code challenge from verifier
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return base64UrlEncode(new Uint8Array(hash))
}

/**
 * Base64 URL-safe encoding (no padding)
 */
function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer))
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

export default ArcticAnthropicAuth
