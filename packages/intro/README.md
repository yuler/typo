# @typo/intro-video

Vue + Tailwind intro demo for **typo**. Same storyboard as the product flow: WeChat File Transfer composer → select text → **⌃⇧X** → Indicator → paste refined text.

## Exports

| Import                         | Use                                   |
| ------------------------------ | ------------------------------------- |
| `@typo/intro-video/demo`       | Full animated `TypoIntroDemo`         |
| `@typo/intro-video/components` | Presentational UI pieces              |
| `@typo/intro-video/style.css`  | Tailwind entry (required for islands) |

## Commands (repo root)

```bash
pnpm intro:dev      # Vite preview (interactive)
pnpm intro:studio   # HyperFrames Studio (timeline + frame-step preview)
pnpm intro:build    # Build HyperFrames capture bundle
pnpm intro:check    # lint + validate capture HTML
pnpm intro:render   # build + MP4 → dist/typo-intro.mp4
```

### Studio vs dev

- **`intro:dev`** — Vite dev server for editing Vue components with hot reload (`/capture/`).
- **`intro:studio`** — HyperFrames Studio on the built capture bundle (`dist/capture/`). Rebuilds automatically while the studio is open. Use this for timeline scrubbing, frame-stepping, and render-accurate preview.

## www usage

```astro
---
import TypoIntroDemo from '@typo/intro-video/demo'
import '@typo/intro-video/style.css'
---

<TypoIntroDemo client:visible />
```

## Architecture

- **Components** — abstract UI (no Tauri); `TypoIndicator` mirrors desktop `Indicator.vue` visually.
- **`useIntroTimeline`** — GSAP timeline; registers `window.__timelines['typo-intro']` for HyperFrames render.
- **`capture/`** — Vite entry built to `dist/capture/` for `hyperframes render`.

## Requirements

- Node.js ≥ 22, FFmpeg (for `intro:render`)
