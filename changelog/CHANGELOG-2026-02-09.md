# Changelog - February 9, 2026

## TUI Improvements

### Markdown Rendering

- Simplify markdown component to use OpenTUI's built-in markdown renderer
- Upgrade OpenTUI from 0.1.72 to 0.1.77 with marked library support
- Improve table rendering in markdown content

## Bug Fixes

### Plan Mode

- Add system prompt for plan mode to fix compatibility with Anthropic
- Ensure plan agent properly analyzes and plans without attempting implementation

---

**Summary**: This release improves markdown table rendering by upgrading OpenTUI to use its native markdown component with the marked library, and fixes plan mode compatibility with Anthropic by adding the appropriate system prompt.
