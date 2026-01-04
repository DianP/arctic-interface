import type { Plugin, PluginInput } from "@arctic-cli/plugin"
import { openBrowserUrl } from "../codex-oauth/auth/browser"

export const ArcticAnthropicAuth: Plugin = async (_: PluginInput) => {
  return {
    auth: {
      provider: "anthropic",

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

                try {
                  // Exchange code for tokens
                  const tokenResponse = await fetch("https://console.anthropic.com/v1/oauth/token", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      grant_type: "authorization_code",
                      code,
                      redirect_uri: redirectUri,
                      code_verifier: codeVerifier,
                      client_id: clientId,
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
