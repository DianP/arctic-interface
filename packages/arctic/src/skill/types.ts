import z from "zod"

export namespace Skill {
  export const Frontmatter = z
    .object({
      name: z.string().describe("Skill identifier used for invocation"),
      description: z
        .string()
        .min(20, "Description must be at least 20 characters for discoverability")
        .describe("What this skill does and when to use it"),
      license: z.string().optional().describe("License for the skill (e.g., MIT)"),
      compatibility: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe("Compatible tools/platforms (e.g., claude-code, cursor, vscode)"),
      metadata: z.record(z.string(), z.string()).optional().describe("Additional metadata key-value pairs"),
      "argument-hint": z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe("Hints for arguments (e.g., [version])"),
      "disable-model-invocation": z.boolean().optional().describe("Prevent auto-activation by the model"),
      "allowed-tools": z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe("Tools the skill is allowed to use"),
    })
    .catchall(z.any())
    .meta({
      ref: "SkillFrontmatter",
    })

  export type Frontmatter = z.infer<typeof Frontmatter>

  export type Info = {
    name: string
    description: string
    content: string
    path: string
    license?: string
    compatibility?: string[]
    metadata?: Record<string, string>
    argumentHint?: string[]
    disableModelInvocation?: boolean
    allowedTools?: string[]
  }

  export type SearchResult = {
    matches: Info[]
    total: number
    query: string
    feedback: string
  }
}
