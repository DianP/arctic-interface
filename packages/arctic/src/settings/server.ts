import { Hono } from "hono"
import { cors } from "hono/cors"
import { validator } from "hono-openapi"
import open from "open"
import path from "path"
import z from "zod"
import { Config } from "../config/config"
import { Global } from "../global"
import { Log } from "../util/log"
import { DEFAULT_THEMES } from "../cli/cmd/tui/context/theme"

function formatThemeName(id: string): string {
  return id
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

type ThemeJson = (typeof DEFAULT_THEMES)[string]
type ColorValue = string | { dark: string; light: string }

function resolveColor(
  value: ColorValue,
  defs: Record<string, string>,
  theme: ThemeJson["theme"],
  mode: "dark" | "light",
): string {
  if (typeof value === "object" && "dark" in value) {
    value = value[mode]
  }
  if (typeof value === "string") {
    if (value === "transparent" || value === "none") return "transparent"
    if (value.startsWith("#") || value.startsWith("rgba(")) return value
    if (defs[value]) return resolveColor(defs[value], defs, theme, mode)
    const themeValue = theme[value as keyof typeof theme]
    if (themeValue) return resolveColor(themeValue as ColorValue, defs, theme, mode)
  }
  return value as string
}

function resolveThemeColors(themeJson: ThemeJson, mode: "dark" | "light"): Record<string, string> {
  const defs = themeJson.defs ?? {}
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(themeJson.theme)) {
    if (key === "thinkingOpacity") continue
    result[key] = resolveColor(value as ColorValue, defs, themeJson.theme, mode)
  }
  return result
}

export namespace Settings {
  const log = Log.create({ service: "settings" })

  const app = new Hono()
    .use(cors())
    .get("/api/config", async (c) => {
      const config = await Config.global()
      return c.json(config)
    })
    .put(
      "/api/config",
      validator("json", Config.Info.partial()),
      async (c) => {
        const updates = c.req.valid("json")
        const current = await Config.global()
        const merged = { ...current, ...updates }
        const configPath = path.join(Global.Path.config, "config.json")
        await Bun.write(configPath, JSON.stringify(merged, null, 2))
        return c.json(merged)
      },
    )
    .get("/api/themes", (c) => {
      const mode = (c.req.query("mode") || "dark") as "dark" | "light"
      const themes = Object.entries(DEFAULT_THEMES).map(([id, themeJson]) => {
        const colors = resolveThemeColors(themeJson, mode)
        return {
          id,
          name: formatThemeName(id),
          colors: {
            background: colors.background,
            backgroundPanel: colors.backgroundPanel,
            text: colors.text,
            textMuted: colors.textMuted,
            primary: colors.primary,
            secondary: colors.secondary,
            accent: colors.accent,
            border: colors.border,
            success: colors.success,
            error: colors.error,
            warning: colors.warning,
          },
        }
      })
      return c.json(themes)
    })
    .get("/api/themes/:id", (c) => {
      const id = c.req.param("id")
      const mode = (c.req.query("mode") || "dark") as "dark" | "light"
      const themeJson = DEFAULT_THEMES[id]
      if (!themeJson) {
        return c.json({ error: "Theme not found" }, 404)
      }
      return c.json({
        id,
        name: formatThemeName(id),
        colors: resolveThemeColors(themeJson, mode),
      })
    })
    .get("/api/keybinds", async (c) => {
      const config = await Config.global()
      return c.json(config.keybinds ?? {})
    })
    .put(
      "/api/keybinds",
      validator("json", Config.Keybinds.partial()),
      async (c) => {
        const keybinds = c.req.valid("json")
        const current = await Config.global()
        const merged = { ...current, keybinds: { ...current.keybinds, ...keybinds } }
        const configPath = path.join(Global.Path.config, "config.json")
        await Bun.write(configPath, JSON.stringify(merged, null, 2))
        return c.json(merged.keybinds)
      },
    )
    .get("/api/agents", async (c) => {
      const config = await Config.global()
      return c.json(config.agent ?? {})
    })
    .put(
      "/api/agents/:name",
      validator("json", Config.Agent),
      validator("param", z.object({ name: z.string() })),
      async (c) => {
        const name = c.req.valid("param").name
        const agent = c.req.valid("json")
        const current = await Config.global()
        const merged = {
          ...current,
          agent: { ...current.agent, [name]: agent },
        }
        const configPath = path.join(Global.Path.config, "config.json")
        await Bun.write(configPath, JSON.stringify(merged, null, 2))
        return c.json(merged.agent)
      },
    )
    .delete(
      "/api/agents/:name",
      validator("param", z.object({ name: z.string() })),
      async (c) => {
        const name = c.req.valid("param").name
        const current = await Config.global()
        const agents = { ...current.agent }
        delete agents[name]
        const merged = { ...current, agent: agents }
        const configPath = path.join(Global.Path.config, "config.json")
        await Bun.write(configPath, JSON.stringify(merged, null, 2))
        return c.json(merged.agent)
      },
    )
    .get("/api/keybinds/defaults", (c) => {
      const defaults = Config.Keybinds.parse({})
      return c.json(defaults)
    })

  let server: ReturnType<typeof Bun.serve> | undefined

  export async function start(): Promise<{ port: number; url: string }> {
    if (server) {
      const port = server.port!
      return { port, url: `http://localhost:${port}` }
    }

    const staticPath = path.join(import.meta.dirname, "../../ui-dist/settings")
    const hasStatic = await Bun.file(path.join(staticPath, "index.html")).exists()

    const finalApp = hasStatic
      ? new Hono()
          .route("/", app)
          .get("*", async (c, next) => {
            if (c.req.path.startsWith("/api/")) {
              return next()
            }
            const filePath = path.join(staticPath, c.req.path)
            const file = Bun.file(filePath)
            if (await file.exists()) {
              const ext = path.extname(filePath)
              const mimeTypes: Record<string, string> = {
                ".html": "text/html",
                ".js": "application/javascript",
                ".css": "text/css",
                ".json": "application/json",
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".svg": "image/svg+xml",
                ".woff": "font/woff",
                ".woff2": "font/woff2",
              }
              const contentType = mimeTypes[ext] || "application/octet-stream"
              return new Response(file, {
                headers: { "Content-Type": contentType },
              })
            }
            const html = await Bun.file(path.join(staticPath, "index.html")).text()
            return c.html(html)
          })
      : app

    server = Bun.serve({
      port: 0,
      fetch: finalApp.fetch,
    })

    const port = server.port!
    log.info("started", { port })
    return { port, url: `http://localhost:${port}` }
  }

  export async function stop() {
    if (server) {
      server.stop()
      server = undefined
      log.info("stopped")
    }
  }

  export async function open_browser() {
    const { url } = await start()
    await open(url)
    return url
  }
}
