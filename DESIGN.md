# DESIGN.md

A design system document that AI agents read to generate consistent UI across the `typo` project.

## 1. Aesthetic Identity

- **Theme**: Minimalist, utilitarian, high-contrast.
- **Palette**: Strictly monochrome (Black, White, Zinc gray scale). Avoid bright, saturated colors unless used for semantic status (e.g., error, success).
- **Vibe**: Native OS feel with glassmorphism in the desktop app; clean, content-first layout for the marketing site.

## 2. Color System

The project uses Tailwind CSS with the `zinc` color palette for both Light and Dark modes.

### Core Tokens (Tailwind)

- **Background**: `bg-zinc-50` (light) / `bg-zinc-950` (dark)
- **Surface/Card**: `bg-white` (light) / `bg-zinc-900` (dark)
- **Foreground (Text)**: `text-zinc-900` (light) / `text-zinc-50` or `text-zinc-100` (dark)
- **Muted Text**: `text-zinc-500` or `text-zinc-600` (light) / `text-zinc-400` (dark)
- **Borders**: `border-zinc-200` (light) / `border-zinc-800` (dark)
- **Primary Accent**: `bg-zinc-900 text-white` (light) / `bg-zinc-100 text-zinc-900` (dark)

### Semantic Colors

- **Success**: Green (e.g., `text-green-400`) - sparingly used for "Copied" or completed states.
- **Processing/Info**: Blue (e.g., `text-blue-400`) - sparingly used for loading states.
- **Error/Destructive**: Red (e.g., `text-red-400` or `text-red-500`).

## 3. Typography

- **Font Family**: Default system sans-serif (`ui-sans-serif, system-ui, sans-serif`).
- **Monospace**: Default system mono (`font-mono`) used for shortcuts, commands, and code blocks.
- **Headings**: High contrast (`text-zinc-900 dark:text-zinc-50`), tight tracking (`tracking-tight`), bold.
- **Body**: Relaxed leading (`leading-relaxed`), muted colors (`text-zinc-600 dark:text-zinc-400`).

## 4. Layout & Spacing

- **Corner Radius**:
  - Standard components (buttons, inputs): `rounded-md`
  - Large surfaces (cards, modals): `rounded-xl` or `rounded-2xl`
  - Desktop main capsule: `rounded-[8px]` (via `--app-radius`)
- **Shadows**: Soft, subtle shadows (`shadow-sm` or `shadow-md`) for elevated elements.

## 5. UI Patterns (Desktop App)

- **Glassmorphism**: The main app window uses a `glass` class to blend with the OS desktop.
  - Background: `rgba(24, 24, 24, 0.8)` with `backdrop-filter: blur(8px)`.
- **Capsule States**: The main input window changes border/shadow glow based on state (Idle: none, Processing: Blue glow, Result: Green glow, Error: Red glow).
- **Icons**: Lucide icons (`lucide-vue-next`). Size is typically `w-4 h-4`.
- **Forms/Settings**: Standard label + input pairs, vertically stacked with `gap-2`. Inputs use `bg-transparent` with `border-input`.

## 6. UI Patterns (Marketing Site - WWW)

- **Hero Sections**: Centered, balanced typography (`text-balance`, `text-pretty`). Soft blurred background blobs for visual interest without adding harsh colors.
- **Interactive Elements**: Buttons and links have subtle transition effects (`transition-all hover:scale-[1.02] active:scale-[0.98]`).
- **Markdown Content (`.mdx-content`)**:
  - Links: Underlined, dark text (`font-medium text-zinc-900 underline dark:text-zinc-100`).
  - Code: Inline code blocks use muted gray backgrounds.

## Agent Instructions

When generating UI code for this repository:

1. **Always default to `zinc`** for grays. Do not use `slate`, `gray`, `neutral`, or `stone` unless matching an existing specific exception.
2. **Support Dark Mode** using the `dark:` variant class universally.
3. **Keep it simple**. Avoid unnecessary borders or boxes; use whitespace and typography for hierarchy.
4. **Use native system fonts**; do not import custom web fonts.
