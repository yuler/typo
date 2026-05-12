---
name: Typo
colors:
  primary: "#18181B"
  primary-dark: "#FAFAFA"
  background-light: "#FAFAFA"
  background-dark: "#09090B"
  surface-light: "#FFFFFF"
  surface-dark: "#18181B"
  foreground-light: "#18181B"
  foreground-dark: "#FAFAFA"
  muted-light: "#71717A"
  muted-dark: "#A1A1AA"
  border-light: "#E4E4E7"
  border-dark: "#27272A"
  success: "#4ADE80"
  info: "#60A5FA"
  error: "#F87171"
typography:
  body:
    fontFamily: ui-sans-serif, system-ui, sans-serif
  mono:
    fontFamily: ui-monospace, SFMono-Regular, monospace
rounded:
  md: 6px
  xl: 12px
  2xl: 16px
  app: 8px
---

## Overview

A design system document that AI agents read to generate consistent UI across the `typo` project.

- **Theme**: Minimalist, utilitarian, high-contrast.
- **Vibe**: Native OS feel with glassmorphism in the desktop app; clean, content-first layout for the marketing site.

## Colors

The project uses Tailwind CSS with the `zinc` color palette for both Light and Dark modes.

- **Background**: `bg-zinc-50` (light) / `bg-zinc-950` (dark)
- **Surface/Card**: `bg-white` (light) / `bg-zinc-900` (dark)
- **Foreground (Text)**: `text-zinc-900` (light) / `text-zinc-50` or `text-zinc-100` (dark)
- **Muted Text**: `text-zinc-500` or `text-zinc-600` (light) / `text-zinc-400` (dark)
- **Borders**: `border-zinc-200` (light) / `border-zinc-800` (dark)
- **Primary Accent**: `bg-zinc-900 text-white` (light) / `bg-zinc-100 text-zinc-900` (dark)
- **Success**: Green (e.g., `text-green-400`) - sparingly used for "Copied" or completed states.
- **Processing/Info**: Blue (e.g., `text-blue-400`) - sparingly used for loading states.
- **Error/Destructive**: Red (e.g., `text-red-400` or `text-red-500`).

## Typography

Use native system fonts; do not import custom web fonts.

- **Font Family**: Default system sans-serif (`ui-sans-serif, system-ui, sans-serif`).
- **Monospace**: Default system mono (`font-mono`) used for shortcuts, commands, and code blocks.
- **Headings**: High contrast (`text-zinc-900 dark:text-zinc-50`), tight tracking (`tracking-tight`), bold.
- **Body**: Relaxed leading (`leading-relaxed`), muted colors (`text-zinc-600 dark:text-zinc-400`).

## Layout

- **Spacing**: Keep it simple. Avoid unnecessary borders or boxes; use whitespace and typography for hierarchy.

## Elevation & Depth

- **Shadows**: Soft, subtle shadows (`shadow-sm` or `shadow-md`) for elevated elements.

## Shapes

- **Corner Radius**:
  - Standard components (buttons, inputs): `rounded-md`
  - Large surfaces (cards, modals): `rounded-xl` or `rounded-2xl`
  - Desktop main capsule: `rounded-[8px]` (via `--app-radius`)

## Components

### Desktop App

- **Glassmorphism**: The main app window uses a `glass` class to blend with the OS desktop.
  - Background: `rgba(24, 24, 24, 0.8)` with `backdrop-filter: blur(8px)`.
- **Capsule States**: The main input window changes border/shadow glow based on state (Idle: none, Processing: Blue glow, Result: Green glow, Error: Red glow).
- **Icons**: Lucide icons (`lucide-vue-next`). Size is typically `w-4 h-4`.
- **Forms/Settings**: Standard label + input pairs, vertically stacked with `gap-2`. Inputs use `bg-transparent` with `border-input`.

### Marketing Site (WWW)

- **Hero Sections**: Centered, balanced typography (`text-balance`, `text-pretty`). Soft blurred background blobs for visual interest without adding harsh colors.
- **Interactive Elements**: Buttons and links have subtle transition effects (`transition-all hover:scale-[1.02] active:scale-[0.98]`).
- **Markdown Content (`.mdx-content`)**:
  - Links: Underlined, dark text (`font-medium text-zinc-900 underline dark:text-zinc-100`).
  - Code: Inline code blocks use muted gray backgrounds.

## Do's and Don'ts

When generating UI code for this repository:

1. **Always default to `zinc`** for grays. Do not use `slate`, `gray`, `neutral`, or `stone` unless matching an existing specific exception.
2. **Support Dark Mode** using the `dark:` variant class universally.
3. **Keep it simple**. Avoid unnecessary borders or boxes; use whitespace and typography for hierarchy.
4. **Use native system fonts**; do not import custom web fonts.
