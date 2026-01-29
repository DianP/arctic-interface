import type { Plugin, PluginInput } from "@arctic-cli/plugin"

const CLIENT_ID = "Iv1.b507a08c87ecfe98"

const HEADERS = {
  "User-Agent": "GitHubCopilotChat/0.35.0",
  "Editor-Version": "vscode/1.107.0",
  "Editor-Plugin-Version": "copilot-chat/0.35.0",
  "Copilot-Integration-Id": "vscode-chat",
}

const RESPONSES_API_ALTERNATE_INPUT_TYPES = [
  "file_search_call",
  "computer_call",
  "computer_call_output",
  "web_search_call",
  "function_call",
  "function_call_output",
  "image_generation_call",
  "code_interpreter_call",
  "local_shell_call",
  "local_shell_call_output",
  "mcp_list_tools",
  "mcp_approval_request",
  "mcp_approval_response",
  "mcp_call",
  "reasoning",
]

function normalizeDomain(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "")
}

function getUrls(domain: string) {
  return {
    DEVICE_CODE_URL: `https://${domain}/login/device/code`,
    ACCESS_TOKEN_URL: `https://${domain}/login/oauth/access_token`,
    COPILOT_API_KEY_URL: `https://api.${domain}/copilot_internal/v2/token`,
  }
}

export const ArcticGithubCopilotAuth: Plugin = async (input: PluginInput) => {
  return {
    auth: {
      provider: "github-copilot",

      async loader(getAuth, provider) {
        const info = await getAuth()

        if (!info || info.type !== "oauth") return {}

        if (provider && provider.models) {
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
        }

        const enterpriseUrl = (info as any).enterpriseUrl as string | undefined
        const baseURL = enterpriseUrl
          ? `https://copilot-api.${normalizeDomain(enterpriseUrl)}`
          : "https://api.githubcopilot.com"

        return {
          baseURL,
          apiKey: "",
          async fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
            const currentInfo = await getAuth()
            if (currentInfo.type !== "oauth") return fetch(input, init)

            const currentEnterpriseUrl = (currentInfo as any).enterpriseUrl as string | undefined
            const domain = currentEnterpriseUrl ? normalizeDomain(currentEnterpriseUrl) : "github.com"
            const urls = getUrls(domain)

            let accessToken = currentInfo.access

            // Refresh token if expired or missing
            if (!accessToken || currentInfo.expires < Date.now()) {
              const response = await fetch(urls.COPILOT_API_KEY_URL, {
                headers: {
                  Accept: "application/json",
                  Authorization: `Bearer ${currentInfo.refresh}`,
                  ...HEADERS,
                },
              })

              if (!response.ok) {
                throw new Error(`Token refresh failed: ${response.status}`)
              }

              const tokenData = await response.json()
              accessToken = tokenData.token
            }

            let isAgentCall = false
            let isVisionRequest = false

            try {
              const body = typeof init?.body === "string" ? JSON.parse(init.body) : init?.body

              if (body?.messages) {
                if (body.messages.length > 0) {
                  const lastMessage = body.messages[body.messages.length - 1]
                  isAgentCall = lastMessage.role && ["tool", "assistant"].includes(lastMessage.role)
                }
                isVisionRequest = body.messages.some(
                  (msg: any) =>
                    Array.isArray(msg.content) && msg.content.some((part: any) => part.type === "image_url"),
                )
              }

              if (body?.input) {
                const lastInput = body.input[body.input.length - 1]
                const isAssistant = lastInput?.role === "assistant"
                const hasAgentType = lastInput?.type
                  ? RESPONSES_API_ALTERNATE_INPUT_TYPES.includes(lastInput.type)
                  : false
                isAgentCall = isAssistant || hasAgentType

                isVisionRequest =
                  Array.isArray(lastInput?.content) &&
                  lastInput.content.some((part: any) => part.type === "input_image")
              }
            } catch {}

            const headers: Record<string, string> = {
              ...(init?.headers as Record<string, string>),
              ...HEADERS,
              Authorization: `Bearer ${accessToken}`,
              "Openai-Intent": "conversation-edits",
              "X-Initiator": isAgentCall ? "agent" : "user",
            }

            if (isVisionRequest) {
              headers["Copilot-Vision-Request"] = "true"
            }

            delete headers["x-api-key"]
            delete headers["authorization"]

            return fetch(input, {
              ...init,
              headers,
            })
          },
        }
      },

      methods: [
        {
          type: "oauth" as const,
          label: "Login with GitHub Copilot",
          prompts: [
            {
              type: "select",
              key: "deploymentType",
              message: "Select GitHub deployment type",
              options: [
                {
                  label: "GitHub.com",
                  value: "github.com",
                  hint: "Public",
                },
                {
                  label: "GitHub Enterprise",
                  value: "enterprise",
                  hint: "Data residency or self-hosted",
                },
              ],
            },
            {
              type: "text",
              key: "enterpriseUrl",
              message: "Enter your GitHub Enterprise URL or domain",
              placeholder: "company.ghe.com or https://company.ghe.com",
              condition: (inputs) => inputs.deploymentType === "enterprise",
              validate: (value) => {
                if (!value) return "URL or domain is required"
                try {
                  const url = value.includes("://") ? new URL(value) : new URL(`https://${value}`)
                  if (!url.hostname) return "Please enter a valid URL or domain"
                  return undefined
                } catch {
                  return "Please enter a valid URL (e.g., company.ghe.com or https://company.ghe.com)"
                }
              },
            },
          ],
          async authorize(inputs = {}) {
            const deploymentType = (inputs as any).deploymentType || "github.com"

            let domain = "github.com"
            let actualProvider = "github-copilot"

            if (deploymentType === "enterprise") {
              const enterpriseUrl = (inputs as any).enterpriseUrl as string
              domain = normalizeDomain(enterpriseUrl)
              actualProvider = "github-copilot-enterprise"
            }

            const urls = getUrls(domain)

            const deviceResponse = await fetch(urls.DEVICE_CODE_URL, {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "User-Agent": "GitHubCopilotChat/0.35.0",
              },
              body: JSON.stringify({
                client_id: CLIENT_ID,
                scope: "read:user",
              }),
            })

            if (!deviceResponse.ok) {
              throw new Error("Failed to initiate device authorization")
            }

            const deviceData = await deviceResponse.json()

            return {
              url: deviceData.verification_uri,
              instructions: `Enter code: ${deviceData.user_code}`,
              method: "auto" as const,
              callback: async () => {
                while (true) {
                  const response = await fetch(urls.ACCESS_TOKEN_URL, {
                    method: "POST",
                    headers: {
                      Accept: "application/json",
                      "Content-Type": "application/json",
                      "User-Agent": "GitHubCopilotChat/0.35.0",
                    },
                    body: JSON.stringify({
                      client_id: CLIENT_ID,
                      device_code: deviceData.device_code,
                      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
                    }),
                  })

                  if (!response.ok) return { type: "failed" as const }

                  const data = await response.json()

                  if (data.access_token) {
                    const result: any = {
                      type: "success" as const,
                      refresh: data.access_token,
                      access: "",
                      expires: 0,
                    }

                    if (actualProvider === "github-copilot-enterprise") {
                      result.provider = "github-copilot-enterprise"
                      result.enterpriseUrl = domain
                    }

                    return result
                  }

                  if (data.error === "authorization_pending") {
                    await new Promise((resolve) => setTimeout(resolve, deviceData.interval * 1000))
                    continue
                  }

                  if (data.error) return { type: "failed" as const }

                  await new Promise((resolve) => setTimeout(resolve, deviceData.interval * 1000))
                  continue
                }
              },
            }
          },
        },
      ],
    },
  }
}

export default ArcticGithubCopilotAuth
