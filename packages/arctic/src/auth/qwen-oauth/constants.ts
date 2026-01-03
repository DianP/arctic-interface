export const QWEN_OAUTH = {
  DEVICE_CODE_URL: "https://chat.qwen.ai/api/v1/oauth2/device/code",
  TOKEN_URL: "https://chat.qwen.ai/api/v1/oauth2/token",
  CLIENT_ID: "f0304373b74a44d2b584a3fb70ca9e56",
  SCOPE: "openid profile email model.completion",
  GRANT_TYPE_DEVICE: "urn:ietf:params:oauth:grant-type:device_code",
  GRANT_TYPE_REFRESH: "refresh_token",
} as const

export const PORTAL_HEADERS = {
  AUTH_TYPE: "X-DashScope-AuthType",
  AUTH_TYPE_VALUE: "qwen_oauth",
} as const

export const DEFAULT_QWEN_BASE_URL = "https://portal.qwen.ai/v1"

export const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000 // 5 minutes

export const DEVICE_FLOW = {
  INITIAL_POLL_INTERVAL: 2000, // 2 seconds
  MAX_POLL_INTERVAL: 10000, // 10 seconds
  BACKOFF_MULTIPLIER: 1.5,
} as const

export const OAUTH_ERRORS = {
  AUTHORIZATION_PENDING: "authorization_pending",
  SLOW_DOWN: "slow_down",
  ACCESS_DENIED: "access_denied",
  EXPIRED_TOKEN: "expired_token",
} as const
