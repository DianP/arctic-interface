# Changelog - January 4, 2026

## Installation

### Windows Install Support

- Added Windows install support in install script
- Fixed curl install tracking to follow redirects to Upstash

## Authentication

### Anthropic OAuth Browser Auto-Open

- Fixed OAuth link for Anthropic not opening browser automatically
- Implemented internal Anthropic OAuth plugin with PKCE flow
- Browser now auto-opens like Codex authentication flow
- Added fallback clickable URLs when browser fails to open
- Replaced external `opencode-anthropic-auth` plugin with internal implementation

### Clickable OAuth URLs

- Added `UI.hyperlink()` utility for OSC 8 terminal hyperlinks
- OAuth URLs now clickable via Ctrl+Click in modern terminals
- Bypassed `@clack/prompts` escape sequence stripping with direct console output
- Updated Qwen and Amp OAuth flows to use clickable URLs

## TUI Improvements

### Enhanced Paste Support

- Added bracketed paste mode for better paste detection
- Fixed Ctrl+V paste action (was disabled and only handled images)
- Ctrl+V now supports both text and image pasting from clipboard
- Improved paste reliability for large content
- Paste now works via multiple methods:
  - Ctrl+V (system clipboard)
  - Native terminal paste (Shift+Insert, Cmd+V)
  - Bracketed paste mode

---

**Summary**: This release adds Windows installation support, fixes Anthropic OAuth to auto-open the browser, makes OAuth URLs clickable in terminals, and significantly improves paste functionality in the TUI. Authentication flows now provide a smoother experience with automatic browser opening and clickable fallback URLs.
