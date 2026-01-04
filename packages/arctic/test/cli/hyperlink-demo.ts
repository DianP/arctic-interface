#!/usr/bin/env bun
/**
 * Demo script to visually test hyperlink functionality
 * Run with: bun run test/cli/hyperlink-demo.ts
 */

import { UI } from "@/cli/ui"

console.log("Testing hyperlink functionality:")
console.log("")
console.log("1. Plain URL:")
console.log("   https://console.anthropic.com/oauth/authorize")
console.log("")
console.log("2. Clickable URL (with OSC 8):")
console.log("   " + UI.hyperlink("https://console.anthropic.com/oauth/authorize"))
console.log("")
console.log("3. Clickable with custom text:")
console.log("   " + UI.hyperlink("https://console.anthropic.com/oauth/authorize", "Click here to authenticate"))
console.log("")
console.log("4. Auth message simulation:")
console.log("   Go to: " + UI.hyperlink("https://console.anthropic.com/oauth/authorize?code=abc123"))
console.log("")
console.log("Note: If your terminal supports OSC 8 hyperlinks (e.g., iTerm2, VSCode terminal,")
console.log("      modern GNOME Terminal), the URLs above should be clickable.")
