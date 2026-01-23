import matter from "gray-matter"
import { Config } from "../config/config"
import { Instance } from "../project/instance"
import { Log } from "../util/log"
import { Skill } from "./types"

const log = Log.create({ service: "skill" })

export namespace SkillRegistry {
  const SKILL_GLOB = new Bun.Glob("skills/**/*.md")

  export const state = Instance.state(async () => {
    const skills = new Map<string, Skill.Info>()
    const directories = await Config.directories()

    for (const dir of directories) {
      for await (const item of SKILL_GLOB.scan({
        absolute: true,
        followSymlinks: true,
        dot: true,
        cwd: dir,
      })) {
        const skill = await parseSkill(item)
        if (!skill) continue

        if (skills.has(skill.name)) {
          log.debug("skill override", { name: skill.name, path: item })
        }
        skills.set(skill.name, skill)
      }
    }

    log.debug("skills loaded", { count: skills.size })
    return { skills }
  })

  async function parseSkill(filepath: string): Promise<Skill.Info | null> {
    const template = await Bun.file(filepath).text().catch(() => null)
    if (!template) return null

    const md = matter(template)
    const frontmatter = Skill.Frontmatter.safeParse(md.data)
    if (!frontmatter.success) {
      log.warn("invalid skill frontmatter", {
        path: filepath,
        issues: frontmatter.error.issues,
      })
      return null
    }

    const data = frontmatter.data

    return {
      name: data.name,
      description: data.description,
      content: md.content.trim(),
      path: filepath,
      license: data.license,
      compatibility: normalizeArray(data.compatibility),
      metadata: data.metadata,
      argumentHint: normalizeArray(data["argument-hint"]),
      disableModelInvocation: data["disable-model-invocation"],
      allowedTools: normalizeArray(data["allowed-tools"]),
    }
  }

  function normalizeArray(value: string | string[] | undefined): string[] | undefined {
    if (!value) return undefined
    if (Array.isArray(value)) return value
    return value.split(",").map((s) => s.trim())
  }

  export async function all(): Promise<Skill.Info[]> {
    const { skills } = await state()
    return Array.from(skills.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  export async function get(name: string): Promise<Skill.Info | undefined> {
    const { skills } = await state()
    return skills.get(name)
  }

  export async function search(query: string): Promise<Skill.SearchResult> {
    const skills = await all()
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0)

    if (query === "*" || query === "" || terms.length === 0) {
      return {
        matches: skills,
        total: skills.length,
        query,
        feedback: `Listing all ${skills.length} skills`,
      }
    }

    const ranked = skills
      .map((skill) => {
        const haystack = `${skill.name} ${skill.description}`.toLowerCase()
        const matchCount = terms.filter((term) => haystack.includes(term)).length
        return { skill, matchCount }
      })
      .filter((r) => r.matchCount > 0)
      .sort((a, b) => {
        if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount
        return a.skill.name.localeCompare(b.skill.name)
      })

    const matches = ranked.map((r) => r.skill)

    return {
      matches,
      total: matches.length,
      query,
      feedback:
        matches.length === 0
          ? `No matches found for "${query}". Try different terms or use "*" to list all.`
          : `Found ${matches.length} skill${matches.length === 1 ? "" : "s"} matching "${query}"`,
    }
  }
}
