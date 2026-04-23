# Desktop Webview Log Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pipe the Vue webview's `console.*` output into the dev terminal (and a rotating prod log file) via `tauri-plugin-log`, and migrate existing Rust `println!`/`eprintln!` to `log::*` for a unified stream. Expose "Open log folder" in the tray menu and Settings.

**Architecture:** Single log pipeline through `tauri-plugin-log` v2. Frontend calls `attachConsole()` once at app boot to bridge webview console. Rust registers the plugin with environment-gated targets: dev → `Stdout` + `Webview`; prod → `LogDir` with 5 MB size-based rotation and a startup cleanup that keeps the newest 3 files. Existing `println!`/`eprintln!` calls migrate to `log::*` except the one intentional user-facing CLI stdout in `cli.rs`.

**Tech Stack:** Tauri 2, `tauri-plugin-log` (Rust), `@tauri-apps/plugin-log` (JS), `log` crate, existing `@tauri-apps/plugin-opener`, `@tauri-apps/api/path`, Vue 3 + TypeScript.

Spec: [`docs/superpowers/specs/2026-04-23-desktop-webview-log-sync-design.md`](../specs/2026-04-23-desktop-webview-log-sync-design.md) · Issue: [#40](https://github.com/yuler/typo/issues/40)

---

## File Structure

Files created: none. All changes modify existing files.

**Modified on the Rust side** (`apps/desktop/src-tauri/`):

- `Cargo.toml` — add `tauri-plugin-log = "2"` and `log = "0.4"` dependencies.
- `src/lib.rs` — introduce `log_plugin_builder()`, register the plugin, add startup rotation-cleanup helper `cleanup_old_logs`, migrate `println!`/`eprintln!` to `log::*`.
- `src/tray.rs` — new menu item `"Open log folder…"`, extended `TrayMenuHandles` / `TrayLabels`, new `open_log_folder` handler, migrate `eprintln!` to `log::error!`.
- `src/cli.rs` — migrate the `TODO` comment context only (the `println!("typo {version}")` line stays — it is the user-facing `--version` CLI stdout, not a log).
- `capabilities/default.json` — add `"log:default"` permission.

**Modified on the frontend side** (`apps/desktop/`):

- `package.json` — add `@tauri-apps/plugin-log`.
- `src/main.ts` — call `attachConsole()` before mounting Vue.
- `src/tray.ts` — include `open_log_folder` in the labels payload.
- `src/windows/Settings.vue` — add a "Logs" row with an "Open log folder" button at the end of the basic tab.
- `src/locales/en.json` — 3 new keys.
- `src/locales/jp.json` — 3 new keys.
- `src/locales/zh.json` — 3 new keys.

`keyboard.rs` is not modified — it contains no `println!` or `eprintln!` calls.

Scope reminder: no changes under `core/`, `apps/www`, `packages/`, root CI, or `tauri.conf.json`.

---

## Task 1: Add Rust logging dependencies

**Files:**
- Modify: `apps/desktop/src-tauri/Cargo.toml`

- [ ] **Step 1: Add `tauri-plugin-log` and `log` to `[dependencies]`**

Open `apps/desktop/src-tauri/Cargo.toml` and, inside the existing `[dependencies]` block (right after `tokio = { version = "1.52.0", features = ["time"] }`), add:

```toml
tauri-plugin-log = "2"
log = "0.4"
```

- [ ] **Step 2: Resolve the new dependencies**

Run from the repo root:

```bash
cd apps/desktop/src-tauri && cargo check
```

Expected: a successful `Finished` line. Build may take a couple of minutes on the first run because Cargo downloads both crates and compiles `tauri-plugin-log`'s transitive deps. If it errors, inspect; do not proceed.

- [ ] **Step 3: Commit**

```bash
cd /Users/yule/Projects/typo
git add apps/desktop/src-tauri/Cargo.toml apps/desktop/src-tauri/Cargo.lock
git commit -m "📦 [desktop]: add tauri-plugin-log and log crate dependencies"
```

---

## Task 2: Register the log plugin and define targets

**Files:**
- Modify: `apps/desktop/src-tauri/src/lib.rs:1-10` (imports), `apps/desktop/src-tauri/src/lib.rs:157-205` (the `run()` function)

- [ ] **Step 1: Add imports at the top of `lib.rs`**

Add these lines immediately after the existing `use serde::Serialize;` import at the top of the file:

```rust
use tauri::Manager;
use tauri_plugin_log::{RotationStrategy, Target, TargetKind, TimezoneStrategy};
```

The existing file already has `use tauri::Emitter;` — leave it alone; we're adding `Manager` separately because `app.path()` requires it.

- [ ] **Step 2: Add a private `log_plugin_builder()` fn above `run()`**

Insert this block directly before `#[cfg_attr(mobile, tauri::mobile_entry_point)]` (which sits on the line above `pub fn run() {`):

```rust
fn log_plugin_builder() -> tauri_plugin_log::Builder {
    let builder = tauri_plugin_log::Builder::new()
        .timezone_strategy(TimezoneStrategy::UseLocal)
        .max_file_size(5 * 1024 * 1024)
        .rotation_strategy(RotationStrategy::KeepAll);

    if cfg!(debug_assertions) {
        builder
            .level(log::LevelFilter::Debug)
            .targets([
                Target::new(TargetKind::Stdout),
                Target::new(TargetKind::Webview),
            ])
    } else {
        builder
            .level(log::LevelFilter::Info)
            .targets([Target::new(TargetKind::LogDir {
                file_name: Some("typo".into()),
            })])
    }
}
```

- [ ] **Step 3: Register the plugin as the first `.plugin(...)` call in `run()`**

In `lib.rs`, locate the chain that currently starts with:

```rust
tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
```

Change it to:

```rust
tauri::Builder::default()
    .plugin(log_plugin_builder().build())
    .plugin(tauri_plugin_updater::Builder::new().build())
```

Order matters only in the sense that we want the logger initialized first so that later plugins' startup messages go through it.

- [ ] **Step 4: Compile to verify the wiring**

```bash
cd apps/desktop/src-tauri && cargo check
```

Expected: `Finished` with no errors. Warnings about unused `Manager` import are acceptable here — we will consume it in Task 3.

- [ ] **Step 5: Commit**

```bash
cd /Users/yule/Projects/typo
git add apps/desktop/src-tauri/src/lib.rs
git commit -m "✨ [desktop]: register tauri-plugin-log with dev/prod targets"
```

---

## Task 3: Implement rotation cleanup (keep newest 3 log files)

**Files:**
- Modify: `apps/desktop/src-tauri/src/lib.rs` (add helper fn and call site in `setup`)

- [ ] **Step 1: Add the `cleanup_old_logs` helper above `run()`**

Place this helper directly after `log_plugin_builder()`:

```rust
fn cleanup_old_logs(app: &tauri::AppHandle) {
    let Ok(dir) = app.path().app_log_dir() else {
        return;
    };
    let Ok(entries) = std::fs::read_dir(&dir) else {
        return;
    };

    let mut logs: Vec<(std::path::PathBuf, std::time::SystemTime)> = entries
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_name()
                .to_string_lossy()
                .to_ascii_lowercase()
                .starts_with("typo")
                && e.file_name()
                    .to_string_lossy()
                    .to_ascii_lowercase()
                    .ends_with(".log")
        })
        .filter_map(|e| {
            let modified = e.metadata().ok()?.modified().ok()?;
            Some((e.path(), modified))
        })
        .collect();

    logs.sort_by(|a, b| b.1.cmp(&a.1));

    for (path, _) in logs.into_iter().skip(3) {
        if let Err(err) = std::fs::remove_file(&path) {
            log::warn!("failed to prune old log file {:?}: {}", path, err);
        }
    }
}
```

- [ ] **Step 2: Call it from `setup(...)`**

In `lib.rs`, find the existing `setup(move |app| { ... })` block. Insert the cleanup call as the **first** line inside the closure, before the `if let Err(error) = tray::init(app)` line:

```rust
.setup(move |app| {
    cleanup_old_logs(&app.handle());
    if let Err(error) = tray::init(app) {
        eprintln!("Failed to initialize system tray: {}", error);
    }
    // ... rest unchanged ...
```

(The `eprintln!` on the `tray::init` error line will be migrated in Task 5 — leave it as-is for now.)

- [ ] **Step 3: Compile**

```bash
cd apps/desktop/src-tauri && cargo check
```

Expected: `Finished` with no errors. `Manager` is now consumed by `app.path()`.

- [ ] **Step 4: Commit**

```bash
cd /Users/yule/Projects/typo
git add apps/desktop/src-tauri/src/lib.rs
git commit -m "✨ [desktop]: prune old rotated log files, keep newest 3"
```

---

## Task 4: Grant the `log:default` capability

**Files:**
- Modify: `apps/desktop/src-tauri/capabilities/default.json`

- [ ] **Step 1: Append `"log:default"` to the `permissions` array**

Insert immediately after `"process:allow-restart"` (the current last entry):

```json
    "process:allow-restart",
    "log:default"
```

(Preserve the closing `]` and `}` below.)

- [ ] **Step 2: Verify the JSON parses**

```bash
node -e "JSON.parse(require('fs').readFileSync('apps/desktop/src-tauri/capabilities/default.json','utf8'))"
```

Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/yule/Projects/typo
git add apps/desktop/src-tauri/capabilities/default.json
git commit -m "🔧 [desktop]: grant log:default capability for webview console bridging"
```

---

## Task 5: Migrate `lib.rs` and `tray.rs` from `println!`/`eprintln!` to `log::*`

**Files:**
- Modify: `apps/desktop/src-tauri/src/lib.rs`
- Modify: `apps/desktop/src-tauri/src/tray.rs`

- [ ] **Step 1: Migrate `lib.rs`**

Apply each replacement exactly.

In `lib.rs`:

```rust
// line ~20 (inside request_mac_accessibility_permissions, the macOS cfg block):
print!("Application is totally trusted!");
// →
log::info!("application is totally trusted");
```

```rust
print!("Application isn't trusted :(");
// →
log::warn!("application is not trusted");
```

```rust
// line ~75 in app_cli_selection_trigger:
println!("app_cli_selection_trigger");
// →
log::debug!("app_cli_selection_trigger");
```

```rust
// line ~85:
println!("text: {}", text);
// →
log::debug!("selected text: {}", text);
```

```rust
// line ~91:
eprintln!("Failed to emit set-input event: {}", error);
// →
log::error!("failed to emit set-input event: {}", error);
```

```rust
// line ~144 in consume_pending_selection_input:
eprintln!("Failed to access pending selection payload: {}", error);
// →
log::error!("failed to access pending selection payload: {}", error);
```

```rust
// line ~161 in run(), startup banner:
println!(
    "in_linux_wayland={}",
    in_linux_wayland()
);
// →
log::info!("in_linux_wayland={}", in_linux_wayland());
```

```rust
// line ~185 inside setup closure:
eprintln!("Failed to initialize system tray: {}", error);
// →
log::error!("failed to initialize system tray: {}", error);
```

- [ ] **Step 2: Migrate `tray.rs`**

Every `eprintln!` in `tray.rs` becomes `log::error!` with the same format arguments. There are six call sites (lines ~101, ~113, ~118, ~124, ~128, ~138, ~141, ~151 — verify by `rg 'eprintln!' apps/desktop/src-tauri/src/tray.rs`).

Example transformation:

```rust
eprintln!("Failed to emit {}: {}", EV_TOGGLE_CLICKED, err);
// →
log::error!("failed to emit {}: {}", EV_TOGGLE_CLICKED, err);
```

Apply the same pattern (`eprintln!("Failed to …")` → `log::error!("failed to …")`, lowercasing the leading word to follow Rust log-message convention) to every remaining occurrence in `tray.rs`.

- [ ] **Step 3: Verify no stray `println!`/`eprintln!` remain in `lib.rs` and `tray.rs`**

```bash
rg '^\s*(println|eprintln|print)!' apps/desktop/src-tauri/src/lib.rs apps/desktop/src-tauri/src/tray.rs
```

Expected: no matches (empty output).

- [ ] **Step 4: Compile**

```bash
cd apps/desktop/src-tauri && cargo check
```

Expected: `Finished` with no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/yule/Projects/typo
git add apps/desktop/src-tauri/src/lib.rs apps/desktop/src-tauri/src/tray.rs
git commit -m "♻️ [desktop]: migrate println!/eprintln! to log crate macros"
```

---

## Task 6: Add "Open log folder" tray menu item

**Files:**
- Modify: `apps/desktop/src-tauri/src/tray.rs`

- [ ] **Step 1: Add the new id constant and event plumbing**

Near the other `ID_*` constants (after `ID_ABOUT` and before `ID_QUIT`), add:

```rust
const ID_OPEN_LOG_FOLDER: &str = "open-log-folder";
```

- [ ] **Step 2: Extend `TrayMenuHandles` and `TrayLabels`**

Add a field to each struct (keep field order consistent with menu order: show, settings, check_updates, about, open_log_folder, quit):

```rust
pub struct TrayMenuHandles {
    pub show: MenuItem<Wry>,
    pub settings: MenuItem<Wry>,
    pub check_updates: MenuItem<Wry>,
    pub about: MenuItem<Wry>,
    pub open_log_folder: MenuItem<Wry>,
    pub quit: MenuItem<Wry>,
}

#[derive(Deserialize)]
pub struct TrayLabels {
    pub show: Option<String>,
    pub settings: Option<String>,
    pub check_updates: Option<String>,
    pub about: Option<String>,
    pub open_log_folder: Option<String>,
    pub quit: Option<String>,
    pub tooltip: Option<String>,
}
```

- [ ] **Step 3: Build the new `MenuItem` in `init()`**

Inside `pub fn init(app: &tauri::App) -> tauri::Result<()>`, after the `about` item is constructed and before `quit`, add:

```rust
let open_log_folder = MenuItem::with_id(
    handle,
    ID_OPEN_LOG_FOLDER,
    "Open log folder…",
    true,
    None::<&str>,
)?;
```

Then update the `Menu::with_items` call to include the new item between `&about` and `&quit`:

```rust
let menu = Menu::with_items(
    handle,
    &[&show, &settings, &check_updates, &separator, &about, &open_log_folder, &quit],
)?;
```

And include `open_log_folder` in the `handle.manage(TrayMenuHandles { ... })` block:

```rust
handle.manage(TrayMenuHandles {
    show,
    settings,
    check_updates,
    about,
    open_log_folder,
    quit,
});
```

- [ ] **Step 4: Handle the menu event**

In `handle_menu_event`, add a new arm between the `ID_ABOUT` and `ID_QUIT` cases:

```rust
ID_OPEN_LOG_FOLDER => open_log_folder_action(app),
```

Then add this helper function below `handle_menu_event`:

```rust
fn open_log_folder_action(app: &AppHandle) {
    use tauri::Manager;
    match app.path().app_log_dir() {
        Ok(dir) => {
            if let Err(err) = app.opener().open_path(dir.to_string_lossy(), None::<&str>) {
                log::error!("failed to open log folder: {}", err);
            }
        }
        Err(err) => {
            log::error!("failed to resolve app log dir: {}", err);
        }
    }
}
```

- [ ] **Step 5: Relabel support in `update_tray_menu`**

Inside `update_tray_menu`, after the existing `if let Some(text) = labels.about.as_deref()` block and before the `quit` block, add:

```rust
if let Some(text) = labels.open_log_folder.as_deref() {
    state
        .open_log_folder
        .set_text(text)
        .map_err(|e| e.to_string())?;
}
```

- [ ] **Step 6: Compile**

```bash
cd apps/desktop/src-tauri && cargo check
```

Expected: `Finished` with no errors. A warning about `tauri::Manager` being unused at the module top would indicate the helper wasn't saved — recheck Step 4.

- [ ] **Step 7: Commit**

```bash
cd /Users/yule/Projects/typo
git add apps/desktop/src-tauri/src/tray.rs
git commit -m "✨ [desktop]: add 'Open log folder' item to the tray menu"
```

---

## Task 7: Frontend — add `@tauri-apps/plugin-log` and call `attachConsole`

**Files:**
- Modify: `apps/desktop/package.json`
- Modify: `apps/desktop/src/main.ts`

- [ ] **Step 1: Install `@tauri-apps/plugin-log`**

```bash
cd /Users/yule/Projects/typo/apps/desktop
pnpm add '@tauri-apps/plugin-log@~2'
```

Expected: the command adds the dependency to `apps/desktop/package.json` and updates `pnpm-lock.yaml`. Verify the new entry appears in `apps/desktop/package.json`'s `dependencies` block with a `~2.x` range next to the other `@tauri-apps/*` plugins.

- [ ] **Step 2: Call `attachConsole` in `main.ts`**

Replace the current contents of `apps/desktop/src/main.ts`:

```typescript
import { createApp } from 'vue'
import App from './App.vue'
```

with:

```typescript
import { attachConsole } from '@tauri-apps/plugin-log'
import { createApp } from 'vue'
import App from './App.vue'

attachConsole().catch(() => {})

createApp(App).mount('#app')
```

- [ ] **Step 3: Typecheck the frontend**

From the repo root:

```bash
pnpm desktop:build:frontend
```

Expected: `vue-tsc --noEmit && vite build` completes successfully. A `dist/` folder is produced but we will not ship it — it's a byproduct of the typecheck script.

- [ ] **Step 4: Commit**

```bash
cd /Users/yule/Projects/typo
git add apps/desktop/package.json pnpm-lock.yaml apps/desktop/src/main.ts
git commit -m "✨ [desktop]: bridge webview console.* to Rust logger via tauri-plugin-log"
```

---

## Task 8: i18n — add keys for Logs row and tray item

**Files:**
- Modify: `apps/desktop/src/locales/en.json`
- Modify: `apps/desktop/src/locales/jp.json`
- Modify: `apps/desktop/src/locales/zh.json`

All three files use a flat-key format (see existing keys like `"tray.settings"`). Keep keys in the logical grouping and add a trailing comma to the preceding line as needed.

- [ ] **Step 1: `en.json`**

Insert these two keys immediately after `"settings.basic.deepseek.api_key_placeholder": ...`:

```json
  "settings.basic.logs.label": "Logs",
  "settings.basic.logs.open_button": "Open log folder",
```

Insert this key immediately after `"tray.about": ...`:

```json
  "tray.open_log_folder": "Open log folder…",
```

- [ ] **Step 2: `jp.json`**

Same positions. Values:

```json
  "settings.basic.logs.label": "ログ",
  "settings.basic.logs.open_button": "ログフォルダを開く",
```

```json
  "tray.open_log_folder": "ログフォルダを開く…",
```

- [ ] **Step 3: `zh.json`**

Same positions. Values:

```json
  "settings.basic.logs.label": "日志",
  "settings.basic.logs.open_button": "打开日志文件夹",
```

```json
  "tray.open_log_folder": "打开日志文件夹…",
```

- [ ] **Step 4: Validate all three files still parse**

```bash
node -e "['en','jp','zh'].forEach(l => JSON.parse(require('fs').readFileSync(\`apps/desktop/src/locales/\${l}.json\`,'utf8')))"
```

Expected: no output, exit code 0.

- [ ] **Step 5: Commit**

```bash
cd /Users/yule/Projects/typo
git add apps/desktop/src/locales/en.json apps/desktop/src/locales/jp.json apps/desktop/src/locales/zh.json
git commit -m "🌐 [desktop]: add i18n for logs row and 'open log folder' tray item"
```

---

## Task 9: Wire the new tray label into `tray.ts`

**Files:**
- Modify: `apps/desktop/src/tray.ts`

- [ ] **Step 1: Add `open_log_folder` to the labels payload**

In `syncTrayMenu`'s `push()` function, update the `invoke('update_tray_menu', { labels: {...} })` call to include the new label. The final shape:

```typescript
await invoke('update_tray_menu', {
  labels: {
    show: t('tray.show'),
    settings: t('tray.settings'),
    check_updates: t('tray.check_updates'),
    about: t('tray.about', { version: __APP_VERSION__ }),
    open_log_folder: t('tray.open_log_folder'),
    quit: t('tray.quit'),
    tooltip: t('tray.tooltip'),
  },
})
```

- [ ] **Step 2: Typecheck**

```bash
pnpm desktop:build:frontend
```

Expected: success.

- [ ] **Step 3: Commit**

```bash
cd /Users/yule/Projects/typo
git add apps/desktop/src/tray.ts
git commit -m "🌐 [desktop]: push 'open log folder' label to the tray menu"
```

---

## Task 10: Settings "Logs" row with "Open log folder" button

**Files:**
- Modify: `apps/desktop/src/windows/Settings.vue`

- [ ] **Step 1: Add imports**

In the `<script setup lang="ts">` block near the top of the file, add alongside the existing `@tauri-apps/api/core` import:

```typescript
import { appLogDir } from '@tauri-apps/api/path'
import { openPath } from '@tauri-apps/plugin-opener'
```

- [ ] **Step 2: Add the `openLogFolder` handler**

Below the existing `onLocaleChange` function in the `<script setup>` block, add:

```typescript
async function openLogFolder(): Promise<void> {
  try {
    await openPath(await appLogDir())
  }
  catch (err) {
    console.error('failed to open log folder:', err)
  }
}
```

- [ ] **Step 3: Add the "Logs" row at the bottom of the basic tab**

In the `<template>`, inside `<template v-if="activeTab === 'basic'">`, after the closing `</div>` of the DeepSeek API key block (`<div v-if="form.ai_provider === 'deepseek'" …>`), add a new block:

```vue
<div class="grid w-full items-center gap-2">
  <Label>{{ t('settings.basic.logs.label') }}</Label>
  <div>
    <Button type="button" variant="outline" @click="openLogFolder">
      {{ t('settings.basic.logs.open_button') }}
    </Button>
  </div>
</div>
```

It reuses the existing `Button` + `Label` imports — no new UI component imports needed.

- [ ] **Step 4: Typecheck**

```bash
pnpm desktop:build:frontend
```

Expected: success.

- [ ] **Step 5: Commit**

```bash
cd /Users/yule/Projects/typo
git add apps/desktop/src/windows/Settings.vue
git commit -m "✨ [desktop]: add 'Open log folder' row to the Settings basic tab"
```

---

## Task 11: End-to-end manual smoke test

This task is verification only — no code changes or commits.

- [ ] **Step 1: Dev bridge — webview → terminal**

Run from the repo root:

```bash
pnpm desktop:dev
```

While the app runs, briefly edit `apps/desktop/src/App.vue` to add `console.log('typo:plan:smoke')` inside an `onMounted` block (or any component lifecycle hook that fires at startup), then save so HMR triggers.

Expected: the dev terminal prints a line containing both `[DEBUG]` (or `[INFO]` if the log is promoted) and the literal string `typo:plan:smoke`, along with the `webview` target. Remove the temporary `console.log` before moving on.

- [ ] **Step 2: Dev bridge — Rust logs also formatted**

In the same `pnpm desktop:dev` session, observe startup. Expected: the startup line `in_linux_wayland=...` now shows with a `[INFO]` level tag and a `typo_lib` target (proof that the `log::info!` migration in Task 5 is effective).

- [ ] **Step 3: Tray menu entry**

Right-click the tray icon while `pnpm desktop:dev` runs. Expected: a new entry "Open log folder…" appears between "About typo …" and "Quit typo". Click it.

Expected dev behavior: the opener resolves `appLogDir()` and the OS file manager opens. In dev, the directory may be empty or may contain older log files from previous prod runs — both are fine. The menu click must not produce an error in the terminal.

- [ ] **Step 4: Settings row**

In the running app, open Settings (tray → "Settings…"). Expected: the basic tab shows a "Logs" row at the bottom with an "Open log folder" button. Click it — same behavior as Step 3.

- [ ] **Step 5: Locale switching**

In Settings, change the display language from the dropdown between `en`, `jp`, and `zh`. Expected: the tray menu entry and Settings row relabel without requiring a restart.

- [ ] **Step 6: Production file logging**

```bash
pnpm desktop:build
```

Launch the produced `.app` (macOS) / `.deb` or `.AppImage` (Linux). Exercise the app (open Settings, trigger a selection, etc.), then click tray → "Open log folder…".

Expected: the OS file manager opens a directory containing at least one file named `typo.log` (or similar — the plugin may append a date suffix). The file contains multiple recent lines, including both `[webview]` and `typo_lib` targets.

- [ ] **Step 7: Rust hygiene check**

```bash
rg '^\s*(println|eprintln|print)!' apps/desktop/src-tauri/src
```

Expected output — exactly one line from `apps/desktop/src-tauri/src/cli.rs`:

```
apps/desktop/src-tauri/src/cli.rs:29:        println!("typo {}", env!("CARGO_PKG_VERSION"));
```

This `println!` is preserved on purpose: it is the user-facing `typo --version` CLI stdout, not a log entry.

- [ ] **Step 8: Lint**

```bash
pnpm lint
```

Expected: exit code 0 (or autofixable warnings only, which CI will fix on PR).

- [ ] **Step 9: No smoke regressions outside scope**

```bash
git status
git diff --stat main
```

Expected: only files listed in the "File Structure" section appear. Nothing under `core/`, `apps/www/`, `packages/`, `.github/workflows/`, or `tauri.conf.json` is touched.

---

## Acceptance Criteria (from spec)

Each criterion maps to concrete evidence in the tasks above:

| # | Spec criterion | Evidence |
|---|---|---|
| 1 | `console.log` in Vue → `[webview] …` in dev terminal | Task 11 Step 1 |
| 2 | Rust logs formatted consistently with webview logs | Task 11 Step 2 |
| 3 | Prod build writes to `appLogDir()/typo.log` at `info`+ | Task 11 Step 6 |
| 4 | Log file rotates at ~5 MB; at most 3 files kept | Tasks 2 (size) + 3 (cleanup) |
| 5 | Tray menu shows "Open log folder…" between About and Quit | Tasks 6 + 11 Step 3 |
| 6 | Settings basic tab shows "Logs / Open log folder" row | Tasks 10 + 11 Step 4 |
| 7 | Localized in `en`, `jp`, `zh`; live relabel on locale change | Tasks 8 + 9 + 11 Step 5 |
| 8 | No stray `println!`/`eprintln!` except `cli.rs:29` | Task 5 + 11 Step 7 |
| 9 | `cargo check`, `pnpm desktop:build:frontend`, `pnpm lint` pass | Tasks 2, 7, 11 Step 8 |
| 10 | No changes outside `apps/desktop` | Task 11 Step 9 |
