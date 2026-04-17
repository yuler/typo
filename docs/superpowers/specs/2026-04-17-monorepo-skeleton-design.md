# Monorepo Skeleton — Migrate Existing Desktop App

**Date:** 2026-04-17
**Status:** Design approved, ready for implementation plan
**Scope:** Step 1 of a larger platform vision. Only this step is in scope for this spec.

---

## 1. Context & Scope

### 1.1 Current state

`typo` is a single Tauri desktop application:

- `src/` — Vue 3 + Vite + Tailwind + reka-ui frontend
- `src-tauri/` — Rust backend (global shortcut, clipboard, updater)
- Talks directly to DeepSeek / Ollama from the client
- No server, no web, no mobile, no admin, no marketing site

### 1.2 Long-term vision (out of scope for this spec)

The eventual platform is intended to grow into:

```
typo/
├── core/              # (future) backend
├── apps/
│   ├── www/           # (future) Astro marketing site
│   ├── web/           # (future) Nuxt main product
│   ├── admin/         # (future) Vite + Vue 3 dashboard
│   ├── mobile/        # (future) mobile app
│   └── desktop/       # existing Tauri app, to be migrated here
└── packages/
    ├── api-client/    # (future)
    ├── shared-utils/  # (future)
    └── ui-kit/        # (future)
```

Each future subsystem will get its own brainstorm → spec → plan → implementation cycle. This spec deliberately does not design any of them.

### 1.3 This spec's scope

Migrate the existing desktop app into the `apps/desktop/` position and set up minimal `pnpm` workspace tooling at the root. Nothing else is created — no placeholder folders, no empty packages, no task runner, no Rust workspace, no new configs. The app must continue to build, run, lint, CI, and release identically to before the migration.

### 1.4 Decisions baked in (from brainstorm)

| Decision | Choice |
|---|---|
| What gets built | Monorepo skeleton + migrate existing desktop app only |
| Physical placeholders | **Minimal** — only what exists today gets moved |
| Task runner | **pnpm workspaces only** — no Turbo/Nx |
| Workspace naming | **Scoped** — `@typo/*` (desktop package is `@typo/desktop`) |
| Root `clean` script | Keep as proxy to desktop |
| `pnpm version` in bump.sh | Use `pnpm --filter @typo/desktop exec pnpm version …` |
| Lockfile | Delete + regenerate during migration |

---

## 2. Target Layout

```
typo/
├── apps/
│   └── desktop/
│       ├── src/                    ← from ./src
│       ├── src-tauri/              ← from ./src-tauri (internals unchanged)
│       ├── public/                 ← from ./public
│       ├── resources/              ← from ./resources (logo source for `tauri icon`)
│       ├── index.html
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── tsconfig.node.json
│       ├── components.json         (shadcn-vue; paths are app-local)
│       ├── .env.example
│       └── package.json            (name: "@typo/desktop")
│
├── scripts/
│   ├── bump.sh                     ← path edits
│   └── ubuntu-global-shortcut.sh   ← unchanged (Linux install helper)
│
├── .github/workflows/              ← path edits in ci.yml + release.yml
├── shots/                          ← unchanged (README screenshots)
├── logo.png                        ← unchanged (README/icon source)
│
├── package.json                    (name: "typo-monorepo", private, proxy scripts)
├── pnpm-workspace.yaml             (adds "apps/*")
├── pnpm-lock.yaml                  (regenerated)
├── eslint.config.js                (stays at root; single config for all future apps)
├── .nvmrc, .npmrc, .gitignore      ← unchanged
├── AGENTS.md, DEV.md, TODO.md      ← unchanged
└── README.md, README.zh.md         ← unchanged (no path-bearing snippets to edit)
```

**Not created**: `core/`, `packages/`, `apps/{www,web,admin,mobile}/` — not even as empty folders.

**Note on two `resources/` directories**: the root `./resources/` (logo master for `tauri icon`) and `./src-tauri/resources/` (Tauri bundle resources referenced by `tauri.conf.json`) are distinct. Both move with the desktop app to `apps/desktop/resources/` and `apps/desktop/src-tauri/resources/` respectively.

**Rationale for not extracting `tsconfig.base.json`**: with one TS project, a shared base adds indirection without benefit. Extract when a second TS project is introduced.

**Rationale for not introducing a root `Cargo.toml` workspace**: a single crate (`typo`) lives in `apps/desktop/src-tauri/`. Introduce a Cargo workspace when a second crate appears.

---

## 3. Workspace Topology

### 3.1 `pnpm-workspace.yaml`

```yaml
packages:
  - 'apps/*'

onlyBuiltDependencies:
  - '@tailwindcss/oxide'
  - esbuild
  - vue-demi
```

### 3.2 Root `package.json`

```json
{
  "name": "typo-monorepo",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.33.0",
  "scripts": {
    "dev": "pnpm --filter @typo/desktop dev",
    "dev:x11": "pnpm --filter @typo/desktop dev:x11",
    "build": "pnpm --filter @typo/desktop build",
    "preview": "pnpm --filter @typo/desktop preview",
    "tauri": "pnpm --filter @typo/desktop tauri",
    "clean": "pnpm --filter @typo/desktop clean",
    "lint": "eslint .",
    "lint:fix": "eslint --fix .",
    "format:fix": "eslint --fix .",
    "bump": "./scripts/bump.sh"
  },
  "devDependencies": {
    "@antfu/eslint-config": "^4.14.1",
    "eslint": "^9.28.0",
    "eslint-plugin-format": "^1.0.1"
  }
}
```

Root owns only workspace-level tooling (ESLint). All Vue/Tauri/Vite/Tailwind/TypeScript tooling moves to `apps/desktop/package.json`. The root is `private: true` and has no `version` field — the product version lives in `apps/desktop/package.json` only.

### 3.3 `apps/desktop/package.json`

```json
{
  "name": "@typo/desktop",
  "private": true,
  "version": "1.2.0",
  "type": "module",
  "scripts": {
    "dev": "tauri dev",
    "dev:x11": "GDK_BACKEND=x11 WEBKIT_DISABLE_DMABUF_RENDERER=1 tauri dev",
    "dev:frontend": "vite",
    "build:frontend": "vue-tsc --noEmit && vite build",
    "build": "tauri build",
    "preview": "vite preview",
    "tauri": "tauri",
    "clean": "rm -rf dist && cd src-tauri && cargo clean",
    "app:icon:update": "tauri icon ./resources/logo.png"
  },
  "dependencies": {
    "@ai-sdk/deepseek": "^0.2.14",
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-clipboard-manager": "~2.2.3",
    "@tauri-apps/plugin-global-shortcut": "~2.2.1",
    "@tauri-apps/plugin-notification": "~2.2.3",
    "@tauri-apps/plugin-opener": "^2",
    "@tauri-apps/plugin-process": "~2.2.2",
    "@tauri-apps/plugin-shell": "~2.3.0",
    "@tauri-apps/plugin-store": "~2.2.1",
    "@tauri-apps/plugin-updater": "~2.9.0",
    "@vueuse/core": "^13.3.0",
    "ai": "^4.3.16",
    "lucide-vue-next": "^0.516.0",
    "ollama-ai-provider": "^1.2.0",
    "reka-ui": "^2.3.1",
    "vue": "^3.5.13"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.10",
    "@tauri-apps/cli": "^2",
    "@types/node": "^24.0.3",
    "@vitejs/plugin-vue": "^5.2.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.3.1",
    "tailwindcss": "^4.1.10",
    "tw-animate-css": "^1.3.4",
    "typescript": "~5.6.2",
    "vite": "^6.0.3",
    "vue-tsc": "^2.1.10"
  }
}
```

Versions preserved from the pre-migration root `package.json` exactly; no upgrades.

---

## 4. Path-Sensitive Config Analysis

Every path reference in the desktop app's configs was audited. **All existing paths are relative to their own config file**, so the whole `apps/desktop/` directory moves as a self-contained unit without requiring internal edits.

### 4.1 `src-tauri/tauri.conf.json`

| Field | Value | Action |
|---|---|---|
| `$schema` | `"../node_modules/@tauri-apps/cli/config.schema.json"` | No change — pnpm creates per-package `node_modules` in `apps/desktop/`, path resolves |
| `build.beforeDevCommand` | `"pnpm dev:frontend"` | No change — `pnpm <script>` walks up from the hook's cwd and finds `dev:frontend` in `apps/desktop/package.json` |
| `build.beforeBuildCommand` | `"pnpm build:frontend"` | No change — same mechanism as above |
| `build.frontendDist` | `"../dist"` | No change — resolves to `apps/desktop/dist/` |
| `bundle.resources` | `["resources/*"]` | No change — relative to `src-tauri/` |
| `bundle.icon` | `["icons/32x32.png", ...]` | No change — relative to `src-tauri/` |

### 4.2 `vite.config.ts`

| Reference | Action |
|---|---|
| `import packageJson from './package.json'` | No change — still resolves to the desktop `package.json` where the version now lives |
| `'@': fileURLToPath(new URL('./src', import.meta.url))` | No change |

### 4.3 `tsconfig.json`

| Reference | Action |
|---|---|
| `"baseUrl": "."` + `"paths": { "@/*": ["./src/*"] }` | No change |
| `"include": ["src/**/*.ts", ...]` | No change |
| `"references": [{ "path": "./tsconfig.node.json" }]` | No change |

### 4.4 `src-tauri/Cargo.toml`, `build.rs`, `capabilities/`, `gen/`, `src/`

No parent-directory references. No changes.

**Result**: zero internal config edits required; migration reduces to file moves plus workspace wiring at the root.

---

## 5. CI / Release / bump.sh Updates

### 5.1 `.github/workflows/ci.yml`

One line added:

```yaml
      - name: build tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          projectPath: apps/desktop
          args: ${{ matrix.args }} --no-bundle
```

`pnpm install` at repo root continues to hydrate the whole workspace.

### 5.2 `.github/workflows/release.yml`

Same one-line addition:

```yaml
      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          projectPath: apps/desktop
          tagName: v__VERSION__
          releaseName: App v__VERSION__
          releaseBody: ${{ steps.tag.outputs.message }}
          releaseDraft: false
          prerelease: false
          args: ${{ matrix.args }}
```

`tauri-action` continues to discover the version from `apps/desktop/src-tauri/tauri.conf.json` / `Cargo.toml`.

### 5.3 `.github/workflows/pr-format-fix.yml`

No change. Runs `pnpm format:fix` at repo root; root's ESLint config still covers everything.

### 5.4 `scripts/bump.sh`

Three path edits (no logic change):

```diff
 # Build first, if failed, exit
-pnpm run build:frontend || exit 1
+pnpm --filter @typo/desktop run build:frontend || exit 1

 # Update package.json version, without tag
-pnpm version $version --no-git-tag-version
-package_version=$(cat package.json | jq -r '.version')
+pnpm --filter @typo/desktop exec pnpm version $version --no-git-tag-version
+package_version=$(jq -r '.version' apps/desktop/package.json)

 echo "package.json version: $package_version"

 # Update src-tauri version
-cd src-tauri
+cd apps/desktop/src-tauri
 # Update Cargo.toml version (unchanged)
 sed -i "s/^version = \".*\"/version = \"$package_version\"/g" Cargo.toml
 # Update Cargo.lock version (unchanged)
 cargo update --package typo --precise $package_version
```

---

## 6. Migration Execution

### 6.1 Strategy: single atomic commit using `git mv`

**Why `git mv`**: explicit rename recording. `git log --follow apps/desktop/src/App.vue` will trace history back through the pre-migration path. Blame continuity preserved.

**Why one commit**: this is a mechanical rename; splitting into phased PRs creates temporarily broken build/CI states for no review benefit.

**Alternatives considered and rejected**:
- Phased PRs (scaffold → move → delete) — rejected; no benefit over an atomic commit on a review branch.
- `git filter-repo` / subtree — rejected; overkill. Rename detection is sufficient.

### 6.2 Command sequence

```bash
# 1. From clean main, create a migration branch
git checkout -b refactor/monorepo-skeleton

# 2. Create target directory
mkdir -p apps/desktop

# 3. Move app-local files and folders
git mv src apps/desktop/src
git mv src-tauri apps/desktop/src-tauri
git mv public apps/desktop/public
git mv resources apps/desktop/resources
git mv index.html apps/desktop/index.html
git mv vite.config.ts apps/desktop/vite.config.ts
git mv tsconfig.json apps/desktop/tsconfig.json
git mv tsconfig.node.json apps/desktop/tsconfig.node.json
git mv components.json apps/desktop/components.json
git mv .env.example apps/desktop/.env.example

# 4. (Optional) Move the local .env manually if present — it is gitignored
#    mv .env apps/desktop/.env

# 5. Rewrite root package.json → "typo-monorepo" proxy (Section 3.2)
# 6. Create apps/desktop/package.json → "@typo/desktop" (Section 3.3)
# 7. Rewrite pnpm-workspace.yaml (Section 3.1)
# 8. Edit .github/workflows/ci.yml        (+ projectPath: apps/desktop)
# 9. Edit .github/workflows/release.yml   (+ projectPath: apps/desktop)
# 10. Edit scripts/bump.sh                (3 path edits; Section 5.4)

# 11. Regenerate lockfile under the new workspace layout
rm pnpm-lock.yaml
pnpm install

# 12. Run verification (Section 7)

# 13. Commit
git add -A
git commit -m "♻️ Refactor: migrate to pnpm monorepo (apps/desktop)"
```

### 6.3 Lockfile regeneration rationale

Deleting and regenerating `pnpm-lock.yaml` is intentional: the package graph changes (new root package name, new workspace entry). A clean regeneration produces a cleaner diff than an incremental mutation, and version ranges stay pinned via the `package.json` files so resolutions should not drift meaningfully. If specific transitive pins matter post-migration, validate them during verification (step 7.1 item 5).

### 6.4 `.env` handling

`.env` is gitignored and present only on developer machines. The migration branch does not track it; whoever runs the migration moves it manually into `apps/desktop/.env`.

### 6.5 Rollback

Because everything is in one commit on a branch:

```bash
git reset --hard origin/main
rm -rf apps node_modules pnpm-lock.yaml
pnpm install
```

---

## 7. Verification

### 7.1 Local verification (gate for opening the PR)

Every item must pass, in order:

| # | Command / check | Expected |
|---|---|---|
| 1 | `pnpm install` (at repo root) | Clean install; `apps/desktop/node_modules` populated; no peer-dep warnings beyond pre-migration baseline |
| 2 | `pnpm lint` | Same results as pre-migration |
| 3 | `pnpm --filter @typo/desktop build:frontend` | `vue-tsc` passes; `apps/desktop/dist/` produced |
| 4 | `pnpm dev` (from root) | Tauri dev window opens; HMR works |
| 5 | Smoke test | Global shortcut `Ctrl/Cmd+Shift+X` triggers; DeepSeek/Ollama round-trip returns; clipboard paste replaces selection |
| 6 | `pnpm build` (from root) | Tauri bundles produced under `apps/desktop/src-tauri/target/.../bundle/` |
| 7 | `git log --follow apps/desktop/src/App.vue` | Shows history predating the migration |

### 7.2 Remote verification (gate for merging the PR)

| # | Check | Expected |
|---|---|---|
| 8 | CI workflow on the PR | All four matrix platforms (macOS arm64, macOS x64, ubuntu-22.04, windows) green with `--no-bundle` build |
| 9 | `pr-format-fix.yml` | Runs and no-ops |

### 7.3 Release path validation

Not a gate for this work, but the first `./scripts/bump.sh patch` after merge is effectively a production test of the updated bump + release pipeline. Flag for the next release window; if anything breaks, the previous commit's tag remains a safe rollback point.

---

## 8. Non-Goals

Explicitly out of scope for this spec:

- No new apps (`www`, `web`, `admin`, `mobile`)
- No `core/` backend
- No `packages/*` created — not even empty folders
- No task runner (Turbo, Nx)
- No root `Cargo.toml` workspace
- No `tsconfig.base.json` extraction
- No dependency upgrades
- No source-code changes inside `src/` or `src-tauri/`
- No README content rewrites (neither `README.md` nor `README.zh.md` contains path snippets that break under the migration)
- No changes to `.nvmrc`, `.npmrc`, `.gitignore`, `eslint.config.js`, `AGENTS.md`, `DEV.md`, `TODO.md`, `logo.png`
