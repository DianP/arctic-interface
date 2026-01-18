# Changelog - January 18, 2026

## Features

### /stats command and stats dialog

- Add new `/stats` command in TUI that opens an interactive stats dialog
- Display GitHub-style activity heatmap showing coding activity over time
- Show favorite model, total tokens, sessions, streaks, active days, and peak hour
- Add model usage visualization with token bars and costs
- Include cost summary with token breakdown (input/output/cache read/write)
- Add "War and Peace" comparison (token usage vs ~730k tokens)
- Redesign CLI `arctic stats` command with visual heatmap and colored output
- Add `--view` option to show specific sections (overview, models, cost)
- Add `--json` option for programmatic output
- Add tabbed navigation (Tab/Shift+Tab) in stats dialog

## TUI Improvements

### User and assistant message styling

- Add ">" prefix to user messages for clearer visual distinction
- Change user message text color from background to muted for better readability
- Add bullet point prefix to first assistant text part
- Adjust message padding and layout for consistent alignment
- Remove redundant padding-left from shimmer loading indicator

### Spinner and loading states

- Add "Working..." text next to spinner for clearer feedback
- Fix shimmer text bullet point color to use highlight color instead of base

### Autocomplete enhancements

- Add `/stats` to slash command autocomplete list
- Register stats command in local slash handlers

## Bug Fixes

### Text input overflow

- Fix long text overflowing input field boundaries
- Change input display from flex to block for proper text handling
- Add max-width: 100% and box-sizing: border-box to prevent overflow

## Internal

- Add RoundedBorder style constants for UI components
- Update documentation with new stats command and screenshots

---

**Summary**: This release adds a new `/stats` command with an interactive dialog featuring GitHub-style activity heatmaps, model usage visualization, and cost breakdowns. The TUI receives visual improvements including clearer user/assistant message styling, better loading indicators, and fixed text input overflow issues. The CLI stats command is redesigned with colorful visual output and new filtering options.
