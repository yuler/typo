# Typo Documentation Refactor Design Spec

## Overview
The goal of this project is to improve the readability, professionalism, and organization of the typo documentation. Currently, `README.md` contains a lot of duplicated content that is also present in the `apps/www/src/content/docs` directory. This creates a cluttered experience for both developers on GitHub and end-users visiting the marketing/docs website. 

This refactor will transition `README.md` into a minimalist, developer-focused document, while moving all detailed, user-facing instructions to the `apps/www` documentation, which will act as the single source of truth for users.

## Scope of Changes

### 1. `README.md` (GitHub Landing Page)
The `README.md` will be trimmed down to focus strictly on introducing the project and serving developers.
*   **Keep**: Header, Badges, Screenshots.
*   **Add**: A short "Key Features" section with 3-4 bullet points for quick scanning.
*   **Add**: A "Documentation" section linking to `https://typo.yuler.cc`.
*   **Keep**: Developer-oriented sections: `Construct`, `Setup`, and `Release flow`.
*   **Remove**: `Usage`, `Authentication`, `How it works`, `Prompt shortcuts`, and `FAQ`. These will be moved entirely to the website docs.

### 2. Website Documentation (`apps/www/src/content/docs/`)
The documentation on the website will be expanded and rewritten for a more professional and reader-friendly tone.

*   **`getting-started.mdx`**:
    *   Will be updated to serve as the ultimate landing point for users.
    *   Will explain the core concept (Select -> Hotkey -> AI replacement).
    *   Will include installation instructions.
*   **`authentication.mdx` (NEW)**:
    *   Will contain the "OAuth 2.0 Device Authorization" flow currently found in the `README.md`.
    *   Will be expanded to provide a clearer, more user-friendly walkthrough.
*   **`features.mdx` (NEW)**:
    *   Will highlight Multi-Model Support (DeepSeek/Ollama), Global Hotkeys, Intelligent Pasting, and Customization.
*   **`usage.mdx` / `faq.mdx` / `prompt-shortcuts.mdx`**:
    *   These existing files will have their language refined to sound more professional.
    *   Will ensure no details from the original `README.md` were lost during the migration.

## Trade-offs & Decisions
*   **Decision**: Move user-facing docs completely out of the README.
    *   **Trade-off**: Users who strictly use GitHub will need to click a link to read the full docs. However, the benefit is a much cleaner repository and a better onboarding experience via the dedicated Astro website.
*   **Decision**: Break docs into smaller files (`authentication.mdx`, `features.mdx`) rather than one massive page.
    *   **Trade-off**: More files to manage, but significantly easier for users to navigate.

## Self-Review Checklist
- [x] Placeholders removed
- [x] Internal consistency maintained
- [x] Scope is focused and clear
- [x] No ambiguous requirements
