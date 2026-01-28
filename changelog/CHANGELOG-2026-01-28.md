# Changelog - January 28, 2026

## TUI Improvements

### Enhanced connection management

- Add ability to delete all connections at once with Shift+D
- Fix connection display to handle providers without connection names
- Improve connection sorting to fallback to display name when connection name is missing
- Add confirmation dialog before bulk deletion

### Markdown table rendering

- Add new MarkdownTable component for rendering markdown tables in TUI
- Support horizontal tables with proper column alignment (left, center, right)
- Support vertical table view when content is too wide for terminal
- Handle emoji and CJK character width correctly
- Add theme colors for table borders, headers, and cells
- Integrate table rendering into message display

### Improved responsive layout

- Make prompt footer wrap properly on narrow terminals
- Move usage limits and cost display to separate row for better responsiveness
- Add padding to textarea to prevent text touching edge
- Improve home screen scrolling with scrollbox wrapper around logo
- Fix footer layout to use flexWrap for narrow screens

### User message UI refresh

- Redesign user message display with cleaner visual style
- Add horizontal lines above and below user messages
- Use play icon (▶) instead of angle bracket for prompt indicator
- Simplify file attachment display with emoji icons
- Improve queued message styling

## Bug Fixes

### Input box text rendering

- Fix text in input box appearing cut off or touching edges
- Add right padding to textarea component

### Scrollbar visibility

- Only show scrollbar when content actually overflows
- Add canScroll signal to track overflow state
- Check overflow when messages or dimensions change

## Features

### Feedback and bug reporting

- Add `/feedback` command to send feedback to Arctic team
- Add `/bug` command to report bugs with structured form
- Add menu items in command palette for feedback and bug reporting
- Include system info (OS, version, channel) in bug reports
- Pre-populate GitHub issue templates with user input
- Track feedback submissions in telemetry

### Session cost tracking

- Add real-time session cost calculation to footer
- Display cost next to token count in session footer
- Use Pricing utility for accurate cost calculation

## UI Polish

### Theme updates

- Add markdown table color definitions to arctic theme
- Add markdownTableBorder, markdownTableHeader, markdownTableCell colors

### Copy updates

- Change "Join Discord" button text to "Join the community"

---

**Summary**: This release improves the TUI experience with markdown table rendering, better responsive layout for narrow terminals, enhanced connection management with bulk deletion, and new feedback/bug reporting commands. Also fixes input box text rendering and scrollbar visibility issues.
