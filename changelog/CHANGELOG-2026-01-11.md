# Changelog - January 11, 2026

## TUI Improvements

### Text Selection Enhancements

- Added double-click support to select words in TUI
- Added triple-click support to select entire lines in TUI
- Implemented multi-click detection with configurable thresholds (400ms timing, 2px position tolerance)
- Word selection intelligently handles word characters and punctuation separately
- Line selection spans full line width from start to end
- Selection clears properly when clicking without dragging
- Added comprehensive test suite for double-click and multi-click detection
- Mouse up events now trigger selection logic when no existing selection present

### Usage Command Discoverability

- Added /usage command hint below input area in TUI
- Displays alongside existing command palette hint for better feature discovery
- Helps users find usage statistics and limits tracking

## MCP Management

### Comprehensive MCP Server Management

- Added arctic mcp remove command to disable MCP servers
- Command supports both full name and rm alias
- Interactive confirmation prompt before removing servers
- Automatically removes associated OAuth credentials when present
- Marks servers as disabled in config to override parent configurations
- Lists available servers when attempting to remove non-existent server

### Enhanced MCP Add Command

- Redesigned arctic mcp add with positional arguments for name and optional URL
- Supports both CLI arguments and interactive mode
- Added --local flag to save to project config instead of global config
- Added --header flag for API key authentication (format: KEY: VALUE)
- Added --oauth flag to enable OAuth authentication
- Added --client-id and --client-secret flags for pre-registered OAuth apps
- Added --scope flag for OAuth scope configuration
- Added --env flag for environment variables (format: KEY=VALUE)
- Supports local stdio servers via command after -- separator
- Supports remote HTTP/SSE servers via URL argument
- Interactive mode guides users through server type selection
- Interactive mode offers authentication type selection (none, headers, OAuth)
- Validates URL format and header format with helpful error messages
- Creates parent directories automatically for config files
- Displays configuration summary after successful addition
- Shows scope (global vs project) in success messages

### MCP OAuth Improvements

- Improved arctic mcp logout error messages
- Distinguishes between OAuth credentials and general MCP servers
- Shows list of configured MCP servers when no OAuth credentials found
- Clarifies that only OAuth credentials can be removed with logout command
- Suggests using arctic mcp remove for non-OAuth servers

## Configuration Management

### Config File Handling

- Improved config update logic to detect arctic.jsonc vs arctic.json
- Checks for .jsonc extension first before falling back to .json
- Preserves existing file format when updating configuration
- Ensures config updates write to correct file format

### Gitignore Updates

- Added config.json to .gitignore in packages/arctic
- Prevents accidental commits of local config files with sensitive data
- Protects API keys and tokens from being committed to repository

## Documentation

### Discord Community Integration

- Added Discord server link to README
- Added Discord card to documentation index page
- Discord invite link: https://discord.gg/B4HqXxNynG
- Integrated Discord link in main navigation areas

### MCP Documentation

- Updated MCP documentation with new add command syntax
- Added examples for CLI usage with flags
- Added examples for local stdio servers
- Added examples for remote servers with authentication
- Documented interactive mode workflow
- Added remove command documentation

### Config Documentation

- Updated configuration docs with backup/export information
- Documents /config-export command usage in TUI
- Lists included files (global config, project config, agents, commands, modes, plugins, dependencies)
- Lists excluded files (auth tokens, session data, snapshots)
- Examples for different path formats (absolute, relative, home directory)

### Lore Documentation

- Updated lore documentation with additional context

## Design System

### Icon Library Migration

- Migrated from Lucide icons to Hugeicons across entire web application
- Updated all UI components to use HugeiconsIcon wrapper
- Replaced icon imports in accordion, autocomplete, breadcrumb, combobox, command, dialog, menu components
- Replaced icon imports in number-field, pagination, select, sheet, sidebar, spinner, toast components
- Updated homepage components (copy-button, install-selector, navbar, page)
- Consistent icon usage pattern with HugeiconsIcon component and icon prop
- Added @hugeicons/react and @hugeicons/core-free-icons dependencies

## Build System

### Publish Script Simplification

- Removed automatic dist-tag main addition for beta and main releases
- Simplified publish workflow by removing redundant dist-tag operations
- Cleaner publish process for platform packages and main package

## Dependencies

### New Package Additions

- Added @hugeicons/react version 1.1.4 for React icon components
- Added @hugeicons/core-free-icons version 3.1.1 for icon definitions
- Updated bun.lock with new icon library dependencies

---

**Summary**: This release significantly enhances the TUI experience with double and triple-click text selection, making it easier to copy text from conversations. MCP server management is now complete with add, remove, and list commands supporting both CLI and interactive modes, plus comprehensive authentication options including headers and OAuth. The entire web application has been migrated to Hugeicons for a consistent design system. Discord community integration provides users with a direct channel for support and discussion. Configuration handling has been improved to properly detect and preserve file formats, while the build system has been simplified for cleaner releases.
