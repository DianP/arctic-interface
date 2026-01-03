# Changelog - January 3, 2026

## Documentation Improvements

### Landing Page Redesign

- Complete visual overhaul with Apple-inspired minimalist design
- Integrated Coss UI components for refined input and card styling
- Added subtle grid backgrounds with radial fade effects to hero sections
- Improved messaging focusing on benefits over technical features
- Better emphasis on usage limits visibility and multi-provider support
- Reorganized feature sections for improved logical flow
- Added Apple-style navbar with glassmorphism scroll effect
- Implemented 2-column layout for usage limit screenshots (increased visibility)
- Updated copy to accurately distinguish between live limits and usage statistics

### Component Updates

- Refactored CopyButton component with Coss UI input styling
- Updated usage limit cards to use proper Coss UI Card components
- Added GridBackground component with light/dark mode support
- Fixed z-index stacking for proper layering of content over grid backgrounds
- Removed transparency from install input for solid background rendering

### Documentation Organization

- Removed all Windows support references (macOS and Linux only)
- Added Linux clipboard setup instructions (xclip requirement for Ubuntu/Debian/Fedora/Arch)
- Updated troubleshooting guide with clipboard configuration
- Fixed incorrect "mouse selection copies" documentation (now correctly describes Ctrl+C/Cmd+C behavior)
- Added xclip as system requirement for Linux in getting-started guide

### README Refresh

- Rewrote with user-focused messaging (benefits vs features)
- Simplified installation to single command
- Restructured "Why Arctic" section with three clear benefits:
  - Never hit rate limits unexpectedly
  - Switch providers without losing context
  - Your code stays yours (privacy focus)
- Reorganized provider list with cleaner inline formatting
- Removed personal origin story in favor of direct value propositions
- Updated footer with better navigation links

## Dependencies

- Added @base-ui/react version 1.0.0 for Coss UI component foundation

---

**Summary**: This release focuses on comprehensive documentation and landing page improvements with Apple-level design aesthetics. The landing page now better communicates Arctic's core value proposition with refined UI components, clearer messaging, and improved visual hierarchy. Documentation has been reorganized for clarity with platform-specific guidance and accurate technical instructions.
