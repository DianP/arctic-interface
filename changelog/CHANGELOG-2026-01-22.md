# Changelog - January 22, 2026

## Documentation

### README rewrite

- Simplify README with clear value proposition as opening line
- Add bullet points for quick feature scanning (usage tracking, multiple accounts, model switching, config import)
- Consolidate installation steps with shell reload instruction
- Add Qwen Code and MiniMax to supported coding plans
- Replace verbose FAQ with collapsible sections for essential questions only
- Remove redundant screenshots and sections to improve readability

## Bug Fixes

### MCP server working directory

- MCP servers now spawn in the project directory instead of the process cwd
- Fixes issues where MCP tools couldn't find project files

### Prompt input alignment

- Fix vertical alignment of prompt input area
- Add overflow handling to prevent text from breaking layout

## Dependencies

### google-auth-library upgrade

- Add google-auth-library 10.5.0 to root package.json
- Updates related dependencies (gaxios, gcp-metadata, gtoken)

---

**Summary**: This release rewrites the README for clarity and simplicity, fixes MCP servers to spawn in the correct project directory, and improves prompt input alignment in the TUI.
