import { cmd } from "./cmd"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import * as prompts from "@clack/prompts"
import { UI } from "../ui"
import { MCP } from "../../mcp"
import { McpAuth } from "../../mcp/auth"
import { Config } from "../../config/config"
import { Instance } from "../../project/instance"
import path from "path"
import os from "os"
import { Global } from "../../global"

export const McpCommand = cmd({
  command: "mcp",
  builder: (yargs) =>
    yargs
      .command(McpAddCommand)
      .command(McpListCommand)
      .command(McpRemoveCommand)
      .command(McpAuthCommand)
      .command(McpLogoutCommand)
      .demandCommand(),
  async handler() {},
})

export const McpListCommand = cmd({
  command: "list",
  aliases: ["ls"],
  describe: "list MCP servers and their status",
  async handler() {
    await Instance.provide({
      directory: process.cwd(),
      async fn() {
        UI.empty()
        prompts.intro("MCP Servers")

        const config = await Config.get()
        const mcpServers = config.mcp ?? {}
        const statuses = await MCP.status()

        if (Object.keys(mcpServers).length === 0) {
          prompts.log.warn("No MCP servers configured")
          prompts.outro("Add servers with: arctic mcp add")
          return
        }

        for (const [name, serverConfig] of Object.entries(mcpServers)) {
          const status = statuses[name]
          const hasOAuth = serverConfig.type === "remote" && !!serverConfig.oauth
          const hasStoredTokens = await MCP.hasStoredTokens(name)

          let statusIcon: string
          let statusText: string
          let hint = ""

          if (!status) {
            statusIcon = "○"
            statusText = "not initialized"
          } else if (status.status === "connected") {
            statusIcon = "✓"
            statusText = "connected"
            if (hasOAuth && hasStoredTokens) {
              hint = " (OAuth)"
            }
          } else if (status.status === "disabled") {
            statusIcon = "○"
            statusText = "disabled"
          } else if (status.status === "needs_auth") {
            statusIcon = "⚠"
            statusText = "needs authentication"
          } else if (status.status === "needs_client_registration") {
            statusIcon = "✗"
            statusText = "needs client registration"
            hint = "\n    " + status.error
          } else {
            statusIcon = "✗"
            statusText = "failed"
            hint = "\n    " + status.error
          }

          const typeHint = serverConfig.type === "remote" ? serverConfig.url : serverConfig.command.join(" ")
          prompts.log.info(
            `${statusIcon} ${name} ${UI.Style.TEXT_DIM}${statusText}${hint}\n    ${UI.Style.TEXT_DIM}${typeHint}`,
          )
        }

        prompts.outro(`${Object.keys(mcpServers).length} server(s)`)
      },
    })
  },
})

export const McpAuthCommand = cmd({
  command: "auth [name]",
  describe: "authenticate with an OAuth-enabled MCP server",
  builder: (yargs) =>
    yargs.positional("name", {
      describe: "name of the MCP server",
      type: "string",
    }),
  async handler(args) {
    await Instance.provide({
      directory: process.cwd(),
      async fn() {
        UI.empty()
        prompts.intro("MCP OAuth Authentication")

        const config = await Config.get()
        const mcpServers = config.mcp ?? {}

        // Get OAuth-enabled servers
        const oauthServers = Object.entries(mcpServers).filter(([_, cfg]) => cfg.type === "remote" && !!cfg.oauth)

        if (oauthServers.length === 0) {
          prompts.log.warn("No OAuth-enabled MCP servers configured")
          prompts.log.info("Add OAuth config to a remote MCP server in arctic.json:")
          prompts.log.info(`
  "mcp": {
    "my-server": {
      "type": "remote",
      "url": "https://example.com/mcp",
      "oauth": {
        "scope": "tools:read"
      }
    }
  }`)
          prompts.outro("Done")
          return
        }

        let serverName = args.name
        if (!serverName) {
          const selected = await prompts.select({
            message: "Select MCP server to authenticate",
            options: oauthServers.map(([name, cfg]) => ({
              label: name,
              value: name,
              hint: cfg.type === "remote" ? cfg.url : undefined,
            })),
          })
          if (prompts.isCancel(selected)) throw new UI.CancelledError()
          serverName = selected
        }

        const serverConfig = mcpServers[serverName]
        if (!serverConfig) {
          prompts.log.error(`MCP server not found: ${serverName}`)
          prompts.outro("Done")
          return
        }

        if (serverConfig.type !== "remote" || !serverConfig.oauth) {
          prompts.log.error(`MCP server ${serverName} does not have OAuth configured`)
          prompts.outro("Done")
          return
        }

        // Check if already authenticated
        const hasTokens = await MCP.hasStoredTokens(serverName)
        if (hasTokens) {
          const confirm = await prompts.confirm({
            message: `${serverName} already has stored credentials. Re-authenticate?`,
          })
          if (prompts.isCancel(confirm) || !confirm) {
            prompts.outro("Cancelled")
            return
          }
        }

        const spinner = prompts.spinner()
        spinner.start("Starting OAuth flow...")

        try {
          const status = await MCP.authenticate(serverName)

          if (status.status === "connected") {
            spinner.stop("Authentication successful!")
          } else if (status.status === "needs_client_registration") {
            spinner.stop("Authentication failed", 1)
            prompts.log.error(status.error)
            prompts.log.info("Add clientId to your MCP server config:")
            prompts.log.info(`
  "mcp": {
    "${serverName}": {
      "type": "remote",
      "url": "${serverConfig.url}",
      "oauth": {
        "clientId": "your-client-id",
        "clientSecret": "your-client-secret"
      }
    }
  }`)
          } else if (status.status === "failed") {
            spinner.stop("Authentication failed", 1)
            prompts.log.error(status.error)
          } else {
            spinner.stop("Unexpected status: " + status.status, 1)
          }
        } catch (error) {
          spinner.stop("Authentication failed", 1)
          prompts.log.error(error instanceof Error ? error.message : String(error))
        }

        prompts.outro("Done")
      },
    })
  },
})

export const McpLogoutCommand = cmd({
  command: "logout [name]",
  describe: "remove OAuth credentials for an MCP server",
  builder: (yargs) =>
    yargs.positional("name", {
      describe: "name of the MCP server",
      type: "string",
    }),
  async handler(args) {
    await Instance.provide({
      directory: process.cwd(),
      async fn() {
        UI.empty()
        prompts.intro("MCP OAuth Logout")

        const credentials = await McpAuth.all()
        const serverNames = Object.keys(credentials)

        if (serverNames.length === 0) {
          const config = await Config.get()
          const mcpServers = Object.keys(config.mcp ?? {})

          if (mcpServers.length > 0) {
            prompts.log.warn("No OAuth-enabled MCP servers with stored credentials found")
            prompts.log.info(`Configured MCP servers (${mcpServers.length}): ${mcpServers.join(", ")}`)
            prompts.log.info("Note: Only OAuth credentials can be removed with this command")
            prompts.log.info("To remove MCP servers, use: arctic mcp remove <name>")
          } else {
            prompts.log.warn("No MCP servers configured")
          }
          prompts.outro("Done")
          return
        }

        let serverName = args.name
        if (!serverName) {
          const selected = await prompts.select({
            message: "Select MCP server to logout",
            options: serverNames.map((name) => {
              const entry = credentials[name]
              const hasTokens = !!entry.tokens
              const hasClient = !!entry.clientInfo
              let hint = ""
              if (hasTokens && hasClient) hint = "tokens + client"
              else if (hasTokens) hint = "tokens"
              else if (hasClient) hint = "client registration"
              return {
                label: name,
                value: name,
                hint,
              }
            }),
          })
          if (prompts.isCancel(selected)) throw new UI.CancelledError()
          serverName = selected
        }

        if (!credentials[serverName]) {
          prompts.log.error(`No OAuth credentials found for: ${serverName}`)
          prompts.outro("Done")
          return
        }

        await MCP.removeAuth(serverName)
        prompts.log.success(`Removed OAuth credentials for ${serverName}`)
        prompts.outro("Done")
      },
    })
  },
})

export const McpAddCommand = cmd({
  command: "add <name> [url]",
  describe: "add an MCP server",
  builder: (yargs) =>
    yargs
      .positional("name", {
        describe: "name of the MCP server",
        type: "string",
        demandOption: true,
      })
      .positional("url", {
        describe: "remote MCP server URL (omit for local stdio servers)",
        type: "string",
      })
      .option("local", {
        describe: "add to project config instead of global config",
        type: "boolean",
        default: false,
      })
      .option("header", {
        describe: "add a header (format: 'KEY: VALUE')",
        type: "array",
        string: true,
      })
      .option("oauth", {
        describe: "enable OAuth authentication",
        type: "boolean",
      })
      .option("client-id", {
        describe: "OAuth client ID",
        type: "string",
      })
      .option("client-secret", {
        describe: "OAuth client secret",
        type: "string",
      })
      .option("scope", {
        describe: "OAuth scopes to request",
        type: "string",
      })
      .option("env", {
        describe: "environment variable (format: 'KEY=VALUE')",
        type: "array",
        string: true,
      })
      .example("$0 mcp add context7 -- npx -y @upstash/context7-mcp --api-key KEY", "Add global MCP server")
      .example(
        "$0 mcp add context7 https://mcp.context7.com/mcp --header 'CONTEXT7_API_KEY: KEY'",
        "Add global remote MCP with header auth",
      )
      .example("$0 mcp add myserver https://example.com/mcp --oauth --local", "Add local MCP with OAuth"),
  async handler(args) {
    await Instance.provide({
      directory: process.cwd(),
      async fn() {
        UI.empty()
        prompts.intro("Add MCP server")

        const name = args.name!
        const url = args.url
        const rawCommand = args["--"] ?? []
        const isLocal = args.local

        const saveMcpConfig = async (mcpConfig: Config.Mcp) => {
          const config = await Config.get()
          if (config.mcp?.[name]) {
            prompts.log.warn(`Overwriting existing MCP server: ${name}`)
          }

          if (isLocal) {
            // save to project config
            await Config.update({
              mcp: {
                [name]: mcpConfig,
              },
            })
          } else {
            // save to global config
            const globalConfigPath = path.join(Global.Path.config, "arctic.json")
            const globalConfigText = await Bun.file(globalConfigPath).text().catch(() => "{}")
            const globalConfig = JSON.parse(globalConfigText)

            if (!globalConfig.mcp) {
              globalConfig.mcp = {}
            }
            globalConfig.mcp[name] = mcpConfig
            globalConfig.$schema = "https://usearctic.sh/config.json"

            await Bun.write(globalConfigPath, JSON.stringify(globalConfig, null, 2))
          }
        }

        // local MCP server (stdio)
        if (rawCommand.length > 0) {
          if (url) {
            prompts.log.error("Cannot specify both URL and command (after --)")
            prompts.outro("Failed")
            return
          }

          const environment: Record<string, string> = {}
          if (args.env) {
            for (const envVar of args.env) {
              const [key, ...valueParts] = envVar.split("=")
              if (!key || valueParts.length === 0) {
                prompts.log.error(`Invalid environment variable format: ${envVar}`)
                prompts.log.info("Use format: KEY=VALUE")
                prompts.outro("Failed")
                return
              }
              environment[key] = valueParts.join("=")
            }
          }

          const mcpConfig: Config.Mcp = {
            type: "local",
            command: rawCommand,
            ...(Object.keys(environment).length > 0 ? { environment } : {}),
          }

          await saveMcpConfig(mcpConfig)
          const scope = isLocal ? "project" : "global"
          prompts.log.success(`MCP server "${name}" configured (${scope})`)
          prompts.log.info(`Command: ${rawCommand.join(" ")}`)
          if (Object.keys(environment).length > 0) {
            prompts.log.info(`Environment: ${JSON.stringify(environment)}`)
          }
          prompts.outro("Done")
          return
        }

        // remote MCP server (http/sse)
        if (url) {
          if (!URL.canParse(url)) {
            prompts.log.error("Invalid URL")
            prompts.outro("Failed")
            return
          }

          const headers: Record<string, string> = {}
          if (args.header) {
            for (const header of args.header) {
              const colonIndex = header.indexOf(":")
              if (colonIndex === -1) {
                prompts.log.error(`Invalid header format: ${header}`)
                prompts.log.info("Use format: 'KEY: VALUE'")
                prompts.outro("Failed")
                return
              }
              const key = header.slice(0, colonIndex).trim()
              const value = header.slice(colonIndex + 1).trim()
              if (!key || !value) {
                prompts.log.error(`Invalid header format: ${header}`)
                prompts.log.info("Use format: 'KEY: VALUE'")
                prompts.outro("Failed")
                return
              }
              headers[key] = value
            }
          }

          let oauth: Config.McpOAuth | false | undefined
          if (args.oauth) {
            oauth = {
              ...(args["client-id"] ? { clientId: args["client-id"] } : {}),
              ...(args["client-secret"] ? { clientSecret: args["client-secret"] } : {}),
              ...(args.scope ? { scope: args.scope } : {}),
            }
          }

          // when using headers, we need to set oauth: false to prevent oauth detection
          if (Object.keys(headers).length > 0 && oauth === undefined) {
            oauth = false
          }

          const mcpConfig: Config.Mcp = {
            type: "remote",
            url,
            ...(Object.keys(headers).length > 0 ? { headers } : {}),
            ...(oauth !== undefined ? { oauth } : {}),
          }

          await saveMcpConfig(mcpConfig)
          const scope = isLocal ? "project" : "global"
          prompts.log.success(`MCP server "${name}" configured (${scope})`)
          prompts.log.info(`URL: ${url}`)
          if (Object.keys(headers).length > 0) {
            prompts.log.info(`Headers: ${Object.keys(headers).join(", ")}`)
          }
          if (oauth) {
            prompts.log.info("OAuth: enabled")
          }
          prompts.outro("Done")
          return
        }

        // interactive mode (no URL or command)
        prompts.log.info("No URL or command provided, starting interactive mode")
        prompts.log.info("")

        const type = await prompts.select({
          message: "Select MCP server type",
          options: [
            {
              label: "Local (stdio)",
              value: "local",
              hint: "Run a local command",
            },
            {
              label: "Remote (http/sse)",
              value: "remote",
              hint: "Connect to a remote URL",
            },
          ],
        })
        if (prompts.isCancel(type)) throw new UI.CancelledError()

        if (type === "local") {
          const command = await prompts.text({
            message: "Enter command to run",
            placeholder: "e.g., npx -y @modelcontextprotocol/server-filesystem",
            validate: (x) => (x && x.length > 0 ? undefined : "Required"),
          })
          if (prompts.isCancel(command)) throw new UI.CancelledError()

          await saveMcpConfig({
            type: "local",
            command: command.split(" "),
          })
          prompts.log.success(`Local MCP server "${name}" configured`)
          prompts.outro("Done")
          return
        }

        if (type === "remote") {
          const remoteUrl = await prompts.text({
            message: "Enter MCP server URL",
            placeholder: "e.g., https://example.com/mcp",
            validate: (x) => {
              if (!x) return "Required"
              if (x.length === 0) return "Required"
              const isValid = URL.canParse(x)
              return isValid ? undefined : "Invalid URL"
            },
          })
          if (prompts.isCancel(remoteUrl)) throw new UI.CancelledError()

          const authType = await prompts.select({
            message: "Select authentication type",
            options: [
              {
                label: "None",
                value: "none",
                hint: "No authentication",
              },
              {
                label: "Headers",
                value: "headers",
                hint: "API key or token in headers",
              },
              {
                label: "OAuth",
                value: "oauth",
                hint: "OAuth 2.0 authentication",
              },
            ],
          })
          if (prompts.isCancel(authType)) throw new UI.CancelledError()

          const headers: Record<string, string> = {}
          if (authType === "headers") {
            const headerKey = await prompts.text({
              message: "Enter header key",
              placeholder: "e.g., CONTEXT7_API_KEY or Authorization",
              validate: (x) => (x && x.length > 0 ? undefined : "Required"),
            })
            if (prompts.isCancel(headerKey)) throw new UI.CancelledError()

            const headerValue = await prompts.password({
              message: "Enter header value",
            })
            if (prompts.isCancel(headerValue)) throw new UI.CancelledError()

            headers[headerKey] = headerValue
          }

          let oauth: Config.McpOAuth | undefined
          if (authType === "oauth") {
            const hasClientId = await prompts.confirm({
              message: "Do you have a pre-registered client ID?",
              initialValue: false,
            })
            if (prompts.isCancel(hasClientId)) throw new UI.CancelledError()

            if (hasClientId) {
              const clientId = await prompts.text({
                message: "Enter client ID",
                validate: (x) => (x && x.length > 0 ? undefined : "Required"),
              })
              if (prompts.isCancel(clientId)) throw new UI.CancelledError()

              const hasSecret = await prompts.confirm({
                message: "Do you have a client secret?",
                initialValue: false,
              })
              if (prompts.isCancel(hasSecret)) throw new UI.CancelledError()

              let clientSecret: string | undefined
              if (hasSecret) {
                const secret = await prompts.password({
                  message: "Enter client secret",
                })
                if (prompts.isCancel(secret)) throw new UI.CancelledError()
                clientSecret = secret
              }

              oauth = {
                clientId,
                ...(clientSecret ? { clientSecret } : {}),
              }
            } else {
              oauth = {}
            }
          }

          await saveMcpConfig({
            type: "remote",
            url: remoteUrl,
            ...(Object.keys(headers).length > 0 ? { headers } : {}),
            ...(oauth !== undefined ? { oauth } : {}),
          })
          prompts.log.success(`Remote MCP server "${name}" configured`)
          prompts.outro("Done")
          return
        }

        prompts.outro("Done")
      },
    })
  },
})

export const McpRemoveCommand = cmd({
  command: "remove <name>",
  aliases: ["rm"],
  describe: "remove an MCP server",
  builder: (yargs) =>
    yargs.positional("name", {
      describe: "name of the MCP server",
      type: "string",
      demandOption: true,
    }),
  async handler(args) {
    await Instance.provide({
      directory: process.cwd(),
      async fn() {
        UI.empty()
        prompts.intro("Remove MCP server")

        const name = args.name!
        const config = await Config.get()
        const mcpServers = config.mcp ?? {}

        if (!mcpServers[name]) {
          prompts.log.error(`MCP server not found: ${name}`)
          const available = Object.keys(mcpServers)
          if (available.length > 0) {
            prompts.log.info(`Available servers: ${available.join(", ")}`)
          }
          prompts.outro("Failed")
          return
        }

        const confirm = await prompts.confirm({
          message: `Remove MCP server "${name}"?`,
          initialValue: false,
        })
        if (prompts.isCancel(confirm) || !confirm) {
          prompts.outro("Cancelled")
          return
        }

        // set mcp server to disabled to override any parent configs
        await Config.update({
          mcp: {
            [name]: {
              type: "local" as const,
              command: ["echo", "disabled"],
              enabled: false,
            },
          },
        })

        const hasOAuthCreds = await MCP.hasStoredTokens(name)
        if (hasOAuthCreds) {
          await MCP.removeAuth(name)
          prompts.log.info("Also removed OAuth credentials")
        }

        prompts.log.success(`MCP server "${name}" disabled`)
        prompts.log.info("To fully remove, delete from config file manually")
        prompts.outro("Done")
      },
    })
  },
})

