# Design Spec: Desktop Release Page

**Date:** 2026-04-21
**Topic:** Desktop Release Page in `@apps/www`
**Strategy:** Shared Data Package (`packages/releases`)

## Overview
Create a centralized source of truth for all desktop releases that can be shared between the marketing website (`@apps/www`) and potentially the desktop app (`@apps/desktop`) for "What's New" displays.

## Part 1: Shared Package (`@typo/releases`)

### Structure
- `packages/releases/`
  - `package.json` (Internal monorepo package)
  - `src/index.ts` (Entry point exporting all releases)
  - `data/vX.Y.Z.json` (One JSON file per release)

### JSON Schema (`vX.Y.Z.json`)
```json
{
  "version": "1.2.1",
  "date": "2026-04-17",
  "github_url": "https://github.com/yuler/typo/releases/tag/v1.2.1",
  "notes": {
    "en": "...",
    "zh": "...",
    "jp": "..."
  },
  "assets": [
    { "name": "typo_1.2.1_x64.dmg", "platform": "macos" },
    { "name": "typo_1.2.1_amd64.deb", "platform": "linux" },
    { "name": "typo_1.2.1_x64_en-US.msi", "platform": "windows" }
  ]
}
```

### Export logic
The `src/index.ts` will provide a helper to get all releases sorted by version (descending).

## Part 2: Website Integration (`@apps/www`)

### Page Location
- `apps/www/src/pages/[...lang]/releases/index.astro`

### UI Design
- **Header:** Title "Desktop Releases" with a brief intro.
- **List:** A vertical list of cards for each release.
- **Card Details:**
  - **Version Tag:** Large, bold text (e.g., `v1.2.1`).
  - **Release Date:** Formatted localized date (e.g., `April 17, 2026`).
  - **Localized Notes:** Markdown-style notes rendered as HTML.
  - **Download Section:** Platform-specific icons and direct download links (linking to GitHub assets).

## Part 3: I18n Considerations
- Support for `en`, `zh`, and `jp` in release notes.
- Use `@typo/languages` for common UI translations (e.g., "Download for macOS", "Releases").

## Part 4: Testing & Validation
- **Unit Test:** Ensure `packages/releases` correctly sorts and returns all data.
- **Manual Check:** Verify all download links correctly map to the GitHub asset URL structure.
