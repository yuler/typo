# Desktop Release Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a centralized desktop release data package and display a dedicated release page on the `typo` website.

**Architecture:** 
- A new package `@typo/releases` hosts version-specific JSON files in a `data/` directory.
- An Astro page in `@apps/www` imports this data and renders it as a localized timeline of releases.
- Asset URLs are dynamically generated based on the GitHub release structure.

**Tech Stack:** Astro, React (optional/for components), TypeScript, Tailwind CSS.

---

### Task 1: Initialize `@typo/releases` Package

**Files:**
- Create: `packages/releases/package.json`
- Create: `packages/releases/tsconfig.json`
- Modify: `pnpm-workspace.yaml`

- [ ] **Step 1: Create `packages/releases/package.json`**

```json
{
  "name": "@typo/releases",
  "type": "module",
  "version": "1.0.0",
  "private": true,
  "exports": {
    ".": "./src/index.ts"
  },
  "devDependencies": {
    "typescript": "~5.6.2"
  }
}
```

- [ ] **Step 2: Create `packages/releases/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Update `pnpm-workspace.yaml`**
Ensure `packages/*` is included. (It already is, but good to verify).

- [ ] **Step 4: Commit**

```bash
git add packages/releases
git commit -m "feat(releases): initialize @typo/releases package"
```

---

### Task 2: Define Release Data Schema and First Release

**Files:**
- Create: `packages/releases/src/types.ts`
- Create: `packages/releases/data/v1.2.1.json`

- [ ] **Step 1: Create `packages/releases/src/types.ts`**

```typescript
export interface ReleaseAsset {
  name: string;
  platform: 'macos' | 'linux' | 'windows';
}

export interface ReleaseData {
  version: string;
  date: string; // ISO format
  github_url: string;
  notes: {
    en: string;
    zh: string;
    jp: string;
  };
  assets: ReleaseAsset[];
}
```

- [ ] **Step 2: Create `packages/releases/data/v1.2.1.json`**

```json
{
  "version": "1.2.1",
  "date": "2026-04-17",
  "github_url": "https://github.com/yuler/typo/releases/tag/v1.2.1",
  "notes": {
    "en": "Initial public alpha release of typo. Features selection-based AI refinement and global shortcuts.",
    "zh": "typo 的初始公开 Alpha 版本。具有基于选区的 AI 润色和全局快捷键功能。",
    "jp": "typo の最初のパブリックアルファリリース。選択ベースの AI 校正とグローバルショートカット機能を備えています。"
  },
  "assets": [
    { "name": "typo_1.2.1_aarch64.dmg", "platform": "macos" },
    { "name": "typo_1.2.1_x64.dmg", "platform": "macos" },
    { "name": "typo_1.2.1_amd64.deb", "platform": "linux" },
    { "name": "typo_1.2.1_amd64.AppImage", "platform": "linux" },
    { "name": "typo_1.2.1_x64_en-US.msi", "platform": "windows" }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/releases/src/types.ts packages/releases/data/v1.2.1.json
git commit -m "feat(releases): add release data schema and v1.2.1 data"
```

---

### Task 3: Implement Data Fetcher in `@typo/releases`

**Files:**
- Create: `packages/releases/src/index.ts`

- [ ] **Step 1: Create `packages/releases/src/index.ts`**

```typescript
import type { ReleaseData } from './types'

// For simplicity, we'll manually list the releases for now. 
// In a real scenario, we'd use import.meta.glob but that requires a bundler.
import v121 from '../data/v1.2.1.json' assert { type: 'json' }

export * from './types'

export const releases: ReleaseData[] = [
  v121 as unknown as ReleaseData
].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

export function getReleaseByVersion(version: string) {
  return releases.find(r => r.version === version)
}

export function getAssetUrl(version: string, assetName: string) {
  return `https://github.com/yuler/typo/releases/download/v${version}/${assetName}`
}
```

- [ ] **Step 2: Verify build**
Run: `pnpm install` at root.

- [ ] **Step 3: Commit**

```bash
git add packages/releases/src/index.ts
git commit -m "feat(releases): export release data and helpers"
```

---

### Task 4: Integrate `@typo/releases` into `@apps/www`

**Files:**
- Modify: `apps/www/package.json`

- [ ] **Step 1: Add dependency to `apps/www/package.json`**

```bash
pnpm --filter @typo/www add "@typo/releases@workspace:*"
```

- [ ] **Step 2: Commit**

```bash
git add apps/www/package.json
git commit -m "chore(www): add @typo/releases dependency"
```

---

### Task 5: Create Release Components and Page

**Files:**
- Create: `apps/www/src/components/ReleaseItem.astro`
- Create: `apps/www/src/pages/[...lang]/releases/index.astro`
- Modify: `apps/www/src/locales/en.json`
- Modify: `apps/www/src/locales/zh.json`
- Modify: `apps/www/src/locales/jp.json`

- [ ] **Step 1: Create `apps/www/src/components/ReleaseItem.astro`**
This component will render a single release card.

```astro
---
import { getAssetUrl } from '@typo/releases'
import type { ReleaseData } from '@typo/releases'
import { formatDateLong } from '@/utils/date'

interface Props {
  release: ReleaseData
}

const { release } = Astro.props
const { locale, t } = Astro.locals
const notes = release.notes[locale] || release.notes.en
---

<div class="relative pl-8 pb-12 last:pb-0 group">
  <!-- Timeline line -->
  <div class="absolute left-0 top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800 group-last:bg-transparent" aria-hidden="true"></div>
  <!-- Timeline dot -->
  <div class="absolute left-[-4px] top-2 h-2 w-2 rounded-full border-2 border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 group-hover:border-zinc-900 dark:group-hover:border-zinc-100 transition-colors" aria-hidden="true"></div>

  <div class="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
    <h2 class="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">v{release.version}</h2>
    <time class="text-sm text-zinc-500 dark:text-zinc-400 font-mono">
      {formatDateLong(new Date(release.date), locale)}
    </time>
  </div>

  <div class="mt-4 prose prose-zinc dark:prose-invert prose-sm max-w-none">
    <p class="text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">
      {notes}
    </p>
  </div>

  <div class="mt-6 flex flex-wrap gap-3">
    {release.assets.map(asset => (
      <a
        href={getAssetUrl(release.version, asset.name)}
        class="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <span class="capitalize">{asset.platform}</span>
        <span class="text-zinc-400 dark:text-zinc-500">•</span>
        <span class="font-mono text-[10px]">{asset.name.split('_').pop()}</span>
      </a>
    ))}
  </div>
</div>
```

- [ ] **Step 2: Create `apps/www/src/pages/[...lang]/releases/index.astro`**

```astro
---
import { releases } from '@typo/releases'
import BaseLayout from '@/layouts/BaseLayout.astro'
import ReleaseItem from '@/components/ReleaseItem.astro'
import { getI18nStaticPaths } from '@/lib/i18n'

export { getI18nStaticPaths as getStaticPaths }

const { t } = Astro.locals
---

<BaseLayout title={t('page.releases.title')} description={t('page.releases.description')}>
  <main class="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
    <header class="mb-12">
      <h1 class="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
        {t('page.releases.heading')}
      </h1>
      <p class="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
        {t('page.releases.p')}
      </p>
    </header>

    <div class="space-y-0">
      {releases.map(release => (
        <ReleaseItem release={release} />
      ))}
    </div>
  </main>
</BaseLayout>
```

- [ ] **Step 3: Update localized strings**
Add `page.releases.title`, `page.releases.description`, `page.releases.heading`, `page.releases.p` to `apps/www/src/locales/en.json`, `zh.json`, `jp.json`.

**Example (en.json):**
```json
  "page.releases.title": "Desktop Releases — typo",
  "page.releases.description": "Download history and release notes for the typo desktop app.",
  "page.releases.heading": "Releases",
  "page.releases.p": "A complete history of releases, download links, and version notes for macOS, Linux, and Windows.",
```

- [ ] **Step 4: Update Header navigation**
Modify `apps/www/src/components/Header.astro` to include the new releases page.

```astro
const nav = [
  link('/docs', t('header.nav.docs')),
  link('/blog', t('header.nav.blog')),
  link('/releases', t('footer.link.releases')) // Reuse existing translation
]
```

- [ ] **Step 5: Commit**

```bash
git add apps/www/src/components/ReleaseItem.astro apps/www/src/pages/[...lang]/releases/index.astro apps/www/src/locales/*.json apps/www/src/components/Header.astro
git commit -m "feat(www): add desktop releases page and navigation"
```

---

### Task 6: Final Verification

- [ ] **Step 1: Start dev server**
Run: `pnpm --filter @typo/www dev`

- [ ] **Step 2: Visit the releases page**
Open `http://localhost:4321/releases` (or the corresponding dev URL) and check for all locales.

- [ ] **Step 3: Verify assets links**
Click on an asset and verify it points to `https://github.com/yuler/typo/releases/download/v1.2.1/...`.
