# Changelog - January 19, 2026

## Bug Fixes

### Message overflow in TUI

- Fix long user messages overflowing the message box boundaries
- Wrap message content in a flex container with `flexGrow` and `flexShrink` to allow proper text wrapping
- Remove `alignSelf="flex-start"` that was preventing proper width constraints

## Enhancements

### Stats command date filtering

- Add date filtering options to CLI `arctic stats` command:
  - `--date` / `-d`: Filter by specific date (today, yesterday, or YYYY-MM-DD)
  - `--from`: Start date for range filter (YYYY-MM-DD)
  - `--to`: End date for range filter (YYYY-MM-DD)
- Add interactive date filter selector in TUI stats dialog with left/right arrow navigation
- Support filtering by: All time, Today, Yesterday, Last 7 days, Last 30 days
- Hide activity heatmap and streak stats when date filter is active (not relevant for filtered views)
- Update "Active days" display to omit total when filtered

## Documentation

- Add documentation for new stats date filtering options

---

**Summary**: This release fixes a bug where long user messages would overflow the message box in the TUI, and enhances the `/stats` command with date filtering capabilities in both CLI and interactive modes.
