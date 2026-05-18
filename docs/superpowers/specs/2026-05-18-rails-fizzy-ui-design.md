# Design Spec: Rails "Fizzy" UI Architecture

**Date:** 2026-05-18
**Status:** Draft
**Topic:** Rails Modern CSS & UI Implementation

## 1. Overview
The goal is to implement a modern, high-performance UI architecture for the `@core` Rails app that aligns with Basecamp's "Modern CSS" philosophy while retaining the convenience of utility-first styling (Tailwind-style).

## 2. Technical Strategy: "Pure Fizzy"
Instead of using a CSS compiler (Tailwind CLI/PostCSS), we will implement a curated set of CSS variables and utility classes directly in standard CSS files. This allows for a zero-build development workflow using Rails 8, Propshaft, and Importmaps.

### Key Pillars:
- **No Node.js Dependency:** Pure Rails asset pipeline.
- **Tailwind-like Convenience:** Use classes like `.flex`, `.gap-4`, `.p-6` in HTML.
- **Design Consistency:** Direct mapping of the `zinc` palette and layout tokens from `DESIGN.md`.

## 3. Architecture

### 3.1 File Structure
Files will be located in `core/app/assets/stylesheets/`:
- `base/variables.css`: Design tokens (colors, spacing, radius).
- `base/reset.css`: Modern CSS reset and system font configuration.
- `base/utilities.css`: Curated utility classes (Flex, Grid, Spacing, Typography).
- `components/`: Specific component styles (e.g., `buttons.css`, `cards.css`, `forms.css`).
- `application.css`: Entry point for Propshaft.

### 3.2 Design Tokens (variables.css)
- **Palette:** Full Zinc scale (`50` to `950`).
- **Semantic Colors:** `--color-bg`, `--color-fg`, `--color-border`, `--color-accent`.
- **Dark Mode:** Native support via `@media (prefers-color-scheme: dark)`.
- **Spacing:** `0.25rem` (1) to `4rem` (16) scale.
- **Radius:** `8px` (md), `14px` (xl), `16px` (2xl).

## 4. UI Designs

### 4.1 Authentication Flow (Public)
- **Login (`sessions/new`):** Centered card layout on Zinc-50 background. Large, clear typography.
- **Magic Link (`sessions/magic_links/show`):** Centered "auth card" with icon and 6-character monospace code input.
- **Onboarding (`onboardings/new`):** Progressive form layout following the centered card style.

### 4.2 Application Flow (Protected)
- **Dashboard (`dashboards/show`):** Two-column layout.
    - **Sidebar:** Navigation menu with Typography logo (Red circle icon), account switcher, and primary links.
    - **Main Content:** Clean white/dark-zinc background with card-based statistics and clear section headers.

### 4.3 Device Authorization
- **Auth Page (`devices/authorizations/show`):** Focused modal-style view for approving/denying OAuth requests. High-visibility confirmation of the user code.

## 5. Implementation Details

### CSS Utilities Coverage:
- **Display:** `flex`, `grid`, `block`, `hidden`.
- **Flexbox:** `flex-col`, `items-center`, `justify-between`, `gap-*`.
- **Spacing:** `p-*`, `px-*`, `py-*`, `m-*`, `mx-*`, `my-*`.
- **Typography:** `text-sm`, `text-base`, `text-lg`, `text-xl`, `font-bold`, `text-muted`.
- **Visuals:** `rounded-*`, `shadow-*`, `border`.

### Layout Integration:
- Update `application.html.erb` and `public.html.erb` to use the new CSS structure.
- Use standard Rails form helpers with utility classes.

## 6. Testing Strategy
- **Visual Regression:** Manual check across Light and Dark modes.
- **System Tests:** Ensure form submissions and navigation still work with new layouts.
- **Responsive Check:** Ensure the "centered card" and "sidebar" layouts collapse gracefully on mobile.
