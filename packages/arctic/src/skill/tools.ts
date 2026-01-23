import z from "zod"
import { Tool } from "../tool/tool"
import { SkillRegistry } from "./registry"
import type { Skill } from "./types"

function formatSkill(skill: Skill.Info): string {
  const lines = [`<skill name="${skill.name}">`]

  if (skill.description) {
    lines.push(`<description>${skill.description}</description>`)
  }

  if (skill.allowedTools && skill.allowedTools.length > 0) {
    lines.push(`<allowed-tools>${skill.allowedTools.join(", ")}</allowed-tools>`)
  }

  if (skill.argumentHint && skill.argumentHint.length > 0) {
    lines.push(`<argument-hint>${skill.argumentHint.join(", ")}</argument-hint>`)
  }

  lines.push(`<content>`)
  lines.push(skill.content)
  lines.push(`</content>`)
  lines.push(`</skill>`)

  return lines.join("\n")
}

export const SkillUseTool = Tool.define("skill_use", {
  description: `Load one or more skills by name. Skills provide specialized instructions and context for specific tasks. Use skill_find to discover available skills first.`,
  parameters: z.object({
    names: z.array(z.string()).describe("Array of skill names to load"),
  }),
  async execute(params) {
    const loaded: Skill.Info[] = []
    const notFound: string[] = []

    for (const name of params.names) {
      const skill = await SkillRegistry.get(name)
      if (skill) {
        loaded.push(skill)
      } else {
        notFound.push(name)
      }
    }

    if (loaded.length === 0 && notFound.length > 0) {
      throw new Error(`Skills not found: ${notFound.join(", ")}. Use skill_find to discover available skills.`)
    }

    const output = loaded.map(formatSkill).join("\n\n")
    const summary = notFound.length > 0 ? `\n\nNote: Skills not found: ${notFound.join(", ")}` : ""

    return {
      title: `Loaded ${loaded.length} skill${loaded.length === 1 ? "" : "s"}`,
      output: output + summary,
      metadata: {
        loaded: loaded.map((s) => s.name),
        notFound,
      },
    }
  },
})

export const SkillFindTool = Tool.define("skill_find", {
  description: `Search for available skills by query. Use "*" to list all skills. Skills provide specialized instructions for specific tasks like git releases, code reviews, etc.`,
  parameters: z.object({
    query: z.string().describe("Search query (use * to list all skills)"),
  }),
  async execute(params) {
    const result = await SkillRegistry.search(params.query)

    const skills = result.matches.map((s) => ({
      name: s.name,
      description: s.description,
    }))

    const output = [
      `Found ${result.total} skill${result.total === 1 ? "" : "s"}`,
      "",
      ...skills.map((s) => `- **${s.name}**: ${s.description}`),
      "",
      result.feedback,
    ].join("\n")

    return {
      title: `Found ${result.total} skills`,
      output,
      metadata: {
        skills,
        query: result.query,
        total: result.total,
      },
    }
  },
})
