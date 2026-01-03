import { Auth } from "../index"
import { DEFAULT_QWEN_BASE_URL, OAUTH_ERRORS, QWEN_OAUTH, TOKEN_REFRESH_BUFFER_MS } from "./constants"
import { createHash, randomBytes } from "node:crypto"

export type TokenResult =
  | { type: "pending" }
  | { type: "slow_down" }
  | { type: "expired" }
  | { type: "denied" }
  | { type: "failed" }
  | {
      type: "success"
      access: string
      refresh: string
      expires: number
      resourceUrl?: string
    }

export interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  verification_uri_complete?: string
  expires_in: number
  interval: number
}

export interface DeviceCodeResult {
  deviceCode: DeviceCodeResponse
  verifier: string
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  resource_url?: string
}

function normalizeResourceUrl(resourceUrl: string | undefined): string | undefined {
  if (!resourceUrl) return undefined

  try {
    let normalizedUrl = resourceUrl

    // Add https:// if missing
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`
    }

    new URL(normalizedUrl)
    return normalizedUrl
  } catch {
    return undefined
  }
}

function validateTokenResponse(json: TokenResponse, requireRefreshToken = true): boolean {
  if (!json.access_token || typeof json.expires_in !== "number") return false
  if (requireRefreshToken && !json.refresh_token) return false
  if (json.expires_in <= 0) return false
  return true
}

// Generate PKCE code verifier and challenge per RFC 7636
// Using Node.js crypto for proper base64url encoding
function generatePKCESync(): { verifier: string; challenge: string } {
  // Generate a random code verifier (43-128 characters)
  // Using crypto.randomBytes() for proper entropy
  const verifier = randomBytes(32).toString("base64url")

  // Generate code challenge as SHA-256 hash of verifier, base64url encoded
  // This is the correct PKCE flow - challenge MUST be hash of verifier
  const challenge = createHash("sha256").update(verifier).digest("base64url")

  return { verifier, challenge }
}

export async function requestDeviceCode(): Promise<DeviceCodeResult | null> {
  try {
    const { verifier, challenge } = generatePKCESync()

    const response = await fetch(QWEN_OAUTH.DEVICE_CODE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: QWEN_OAUTH.CLIENT_ID,
        scope: QWEN_OAUTH.SCOPE,
        code_challenge: challenge,
        code_challenge_method: "S256",
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error("Device code request failed:", response.status, text)
      return null
    }

    const json = (await response.json()) as DeviceCodeResponse

    if (!json.device_code || !json.user_code || !json.verification_uri) {
      console.error("Device code response missing fields:", json)
      return null
    }

    // Ensure verification_uri_complete includes client parameter
    if (!json.verification_uri_complete || !json.verification_uri_complete.includes("client=")) {
      const baseUrl = json.verification_uri_complete || json.verification_uri
      const separator = baseUrl.includes("?") ? "&" : "?"
      json.verification_uri_complete = `${baseUrl}${separator}client=qwen-code`
    }

    return {
      deviceCode: json,
      verifier,
    }
  } catch (error) {
    console.error("Device code request error:", error)
    return null
  }
}

export async function pollForToken(deviceCode: string, verifier?: string, interval?: number): Promise<TokenResult> {
  try {
    const response = await fetch(QWEN_OAUTH.TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: QWEN_OAUTH.GRANT_TYPE_DEVICE,
        client_id: QWEN_OAUTH.CLIENT_ID,
        device_code: deviceCode,
        ...(verifier ? { code_verifier: verifier } : {}),
      }),
    })

    if (!response.ok) {
      const json = (await response.json().catch(() => ({}))) as { error?: string }
      const error = json.error

      if (error === OAUTH_ERRORS.AUTHORIZATION_PENDING) return { type: "pending" }
      if (error === OAUTH_ERRORS.SLOW_DOWN) return { type: "slow_down" }
      if (error === OAUTH_ERRORS.EXPIRED_TOKEN) return { type: "expired" }
      if (error === OAUTH_ERRORS.ACCESS_DENIED) return { type: "denied" }

      return { type: "failed" }
    }

    const json = (await response.json()) as TokenResponse

    if (!validateTokenResponse(json, true)) return { type: "failed" }

    const resourceUrl = normalizeResourceUrl(json.resource_url)

    return {
      type: "success",
      access: json.access_token,
      refresh: json.refresh_token!,
      expires: Date.now() + json.expires_in * 1000,
      resourceUrl,
    }
  } catch {
    return { type: "failed" }
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResult> {
  try {
    const response = await fetch(QWEN_OAUTH.TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: QWEN_OAUTH.GRANT_TYPE_REFRESH,
        client_id: QWEN_OAUTH.CLIENT_ID,
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) return { type: "failed" }

    const json = (await response.json()) as TokenResponse

    if (!validateTokenResponse(json, false)) return { type: "failed" }

    const resourceUrl = normalizeResourceUrl(json.resource_url)

    return {
      type: "success",
      access: json.access_token,
      refresh: json.refresh_token || refreshToken,
      expires: Date.now() + json.expires_in * 1000,
      resourceUrl,
    }
  } catch {
    return { type: "failed" }
  }
}

function isTokenExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt - TOKEN_REFRESH_BUFFER_MS
}

export async function ensureAuth(auth?: {
  type: "alibaba"
  access: string
  refresh: string
  expires: number
  enterpriseUrl?: string
}): Promise<string | null> {
  if (!auth || auth.type !== "alibaba") return null

  // Check if token is still valid
  if (!isTokenExpired(auth.expires)) {
    return auth.access
  }

  // Token expired, try to refresh
  const refreshResult = await refreshAccessToken(auth.refresh)

  if (refreshResult.type !== "success") return null

  // Update stored auth with new tokens
  await Auth.set("alibaba", {
    type: "alibaba",
    access: refreshResult.access,
    refresh: refreshResult.refresh,
    expires: refreshResult.expires,
    enterpriseUrl: refreshResult.resourceUrl ?? auth.enterpriseUrl,
  })

  return refreshResult.access
}

export function getApiBaseUrl(enterpriseUrl?: string): string {
  if (enterpriseUrl) {
    try {
      let baseUrl = enterpriseUrl

      // Add https:// protocol if missing
      if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
        baseUrl = `https://${baseUrl}`
      }

      // Remove trailing slash
      baseUrl = baseUrl.replace(/\/$/, "")

      // Add /v1 suffix if missing
      if (!baseUrl.endsWith("/v1")) {
        baseUrl = `${baseUrl}/v1`
      }

      return baseUrl
    } catch {
      return DEFAULT_QWEN_BASE_URL
    }
  }

  return DEFAULT_QWEN_BASE_URL
}
