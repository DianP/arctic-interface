# Changelog - February 3, 2026

## TUI Improvements

### Input Bypass Fix

- Fix issue where activating bypass with input filled would send the message incorrectly
- Add event.preventDefault() to dialog confirm handlers to prevent unwanted message submission
- Ensure Enter key on confirmation dialogs doesn't trigger underlying input handlers

### User Message Layout Enhancement

- Fix text wrapping on small screens where second line of user messages wouldn't appear
- Add dynamic text width calculation based on available screen width
- Improve message readability across different terminal sizes

### Main Menu Layout Fix

- Fix main menu box being cut off on the right side on large screens
- Add maximum card width constraint (100 characters) to prevent overflow
- Improve card width calculation to respect screen boundaries

## Documentation

### NPM Package README

- Add comprehensive README.md for the npm package
- Include installation instructions, usage examples, and supported providers
- Add badges for Discord and GitHub stars
- Provide quick links to documentation and features

## Provider Updates

### MiniMax Coding Plan Cleanup

- Remove duplicate minimax coding plan provider configuration
- Clean up deprecated minimax-cn and minimax-cn-coding-plan entries from models database
- Streamline provider configuration for better maintainability

## Bug Fixes

### File Watcher Error Handling

- Add try-catch blocks around file watcher subscriptions to prevent crashes
- Log warnings instead of crashing when directory watching fails
- Improve stability when watching git directories with permission issues

## Developer Experience

### Server Route Addition

- Add new routes to Hono server for improved API coverage
- Enhance server capabilities for future features

---

**Summary**: This release focuses on improving TUI user experience by fixing input handling issues, text wrapping on small screens, and layout problems on large screens. It also adds proper documentation for the npm package and cleans up duplicate provider configurations for better maintainability.
