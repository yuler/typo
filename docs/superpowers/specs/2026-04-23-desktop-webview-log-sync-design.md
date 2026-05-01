# Sync desktop webview `console.*` output to terminal

- **Date**: 2026-04-23
- **Status**: Approved (design)
- **Scope**: `apps/desktop` only
- **Tracks**: [yuler/typo#40](https://github.com/yuler/typo/issues/40)

## Goal

Make webview `console.debug/log/info/warn/error` calls from the Vue frontend visible in the terminal during `pnpm desktop:dev`, and persist both webview and Rust logs to a rotating on-disk file in production. Unify Rust and webview log formatting through a single pipeline so developers and end-user bug reports share one log stream.

## Non-Goals

- No in-app log viewer UI.
- No remote/telemetry upload of logs.
- No structured JSON log schema.
- No Settings toggle for log level (use `RUST_LOG` in dev; prod is hard-coded).
- No changes to `core/` (Rails), `apps/www`, or `packages/*`.

## Tech Choices

| Area                 | Choice                                                     |
| -------------------- | ---------------------------------------------------------- |
| Logging pipeline     | `tauri-plugin-log` v2 (Rust) + `@tauri-apps/plugin-log` (JS) |
| Dev target           | `Target::Stdout` + `Target::Webview`                       |
| Prod target          | `Target::LogDir { file_name: Some("typo".into()) }`        |
| Dev level            | `log::LevelFilter::Debug`                                  |
| Prod level           | `log::LevelFilter::Info`                                   |
| Rotation             | Size-based, 5 MB per file, keep last 3 (custom cleanup)    |
| Env selector         | `cfg!(debug_assertions)`                                   |
| Open-folder action   | `tauri-plugin-opener` (already a dependency)               |

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│ Webview (Vue — Main and Settings views, single window)     │
│   console.log / warn / error / info / debug                │
│            │ patched by attachConsole()                     │
│            ▼                                                │
│   @tauri-apps/plugin-log → invoke("plugin:log|log")        │
└────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────────┐
│ Rust — tauri-plugin-log Dispatcher                         │
│   log::Record { target="webview", level, message }         │
│            │                                                │
│   dev  ────┼── Target::Stdout  (terminal running tauri dev)│
│            └── Target::Webview (mirrors into DevTools)     │
│   prod ────── Target::LogDir   (rotating typo.log)         │
│                       ▲                                     │
│                       │ log::info!/debug!/error!           │
│  Existing Rust: lib.rs, tray.rs, keyboard.rs, cli.rs       │
└────────────────────────────────────────────────────────────┘
```

Single pipeline: every log (webview or Rust) goes through `tauri-plugin-log`'s formatter, so output is consistent and grep-able.

## Log Format

Example terminal lines:

```
[2026-04-23T14:22:07+08:00][INFO][typo_lib] in_linux_wayland=false
[2026-04-23T14:22:09+08:00][DEBUG][webview] selected text: hello world
[2026-04-23T14:22:09+08:00][ERROR][typo_lib::tray] Failed to emit tray:toggle-clicked: channel closed
```

Components, in order: RFC-3339 local timestamp · `[LEVEL]` · `[target]` · message. The `target` for webview logs is the literal string `webview` (set by the plugin). The `target` for Rust logs is the module path (e.g. `typo_lib::tray`). This makes `rg '\[webview\]' log.txt` trivial.

## Rust — `apps/desktop/src-tauri/src/lib.rs`

Add the plugin in `run()` before the other plugins (order does not affect behavior, but first keeps logs from startup of later plugins visible):

```rust
use tauri_plugin_log::{Target, TargetKind, RotationStrategy, TimezoneStrategy};

fn log_plugin_builder() -> tauri_plugin_log::Builder {
    let mut builder = tauri_plugin_log::Builder::new()
        .timezone_strategy(TimezoneStrategy::UseLocal)
        .max_file_size(5 * 1024 * 1024)
        .rotation_strategy(RotationStrategy::KeepAll); // keep-3 enforced by startup cleanup

    if cfg!(debug_assertions) {
        builder = builder
            .level(log::LevelFilter::Debug)
            .targets([
                Target::new(TargetKind::Stdout),
                Target::new(TargetKind::Webview),
            ]);
    } else {
        builder = builder
            .level(log::LevelFilter::Info)
            .targets([Target::new(TargetKind::LogDir {
                file_name: Some("typo".into()),
            })]);
    }

    builder
}
```

Uses `tauri-plugin-log`'s default formatter, which produces `[timestamp][target][LEVEL] message`. No direct dependency on the `time` crate.

Register the plugin at the top of the builder chain:

```rust
tauri::Builder::default()
    .plugin(log_plugin_builder().build())
    .plugin(tauri_plugin_updater::Builder::new().build())
    // …rest unchanged
```

### Rotation: keep last 3 files

In `setup(|app| …)`, before other setup code, run a once-on-startup cleanup that lists `typo*.log` in `app.path().app_log_dir()?`, sorts by modification time descending, and deletes any beyond index 2. Logged at `warn!` on failure, non-fatal.

### Sweep existing `println!` / `eprintln!`

Files and migration rules:

| File              | `println!`/`print!` → `log::debug!` or `log::info!` | `eprintln!` → `log::error!` |
| ----------------- | --------------------------------------------------- | --------------------------- |
| `src/lib.rs`      | ✓                                                   | ✓                           |
| `src/tray.rs`     | —                                                   | ✓                           |
| `src/cli.rs`      | **No** (see exception below)                        | —                           |
| `src/keyboard.rs` | — (no matches)                                      | — (no matches)              |

Rule-of-thumb:

- Flow/trace messages (e.g. `"app_cli_selection_trigger"`, `"text: …"`) → `log::debug!`.
- One-off startup facts (e.g. `"in_linux_wayland=…"`) → `log::info!`.
- All `eprintln!` → `log::error!`.

**Preserved exception** — `src/cli.rs` contains `println!("typo {}", env!("CARGO_PKG_VERSION"));`. This is the user-facing `typo --version` CLI output and must remain a raw stdout write; it is not a log entry.

After the sweep, the only surviving `println!` under `src-tauri/src/` is that `cli.rs` line. Verification: `rg '^\s*(println|eprintln|print)!' apps/desktop/src-tauri/src` returns exactly one match (the `cli.rs` version line).

## Rust — `apps/desktop/src-tauri/Cargo.toml`

Add exactly one dependency:

```toml
tauri-plugin-log = "2"
```

No version range adjustments to other plugins.

## Frontend — `apps/desktop/src/main.ts`

Bridge `console.*` once per webview instance. Since the app uses a single `"main"` window that swaps views via `components/Window.vue`, `main.ts` executes once and covers every view.

```typescript
import { attachConsole } from '@tauri-apps/plugin-log'
import { createApp } from 'vue'
import App from './App.vue'

attachConsole().catch(() => { /* non-fatal: DevTools still shows originals */ })

createApp(App).mount('#app')
```

`attachConsole()` returns a `Promise<UnlistenFn>`; we intentionally do not detach for the lifetime of the app. The catch-all guard prevents a missing permission in a future custom window from breaking app boot.

## Frontend — `apps/desktop/package.json`

Add exactly one dependency, pinned in the same style as sibling Tauri plugins:

```json
"@tauri-apps/plugin-log": "~2.x"
```

Resolve `2.x` to the latest stable at install time via `pnpm add` from `apps/desktop/`. No other `package.json` edits.

## Capabilities — `apps/desktop/src-tauri/capabilities/default.json`

Add one permission (preserve existing ordering by group):

```json
"log:default"
```

Placed near the other plugin permissions (after `process:allow-restart`). No changes to the `"windows": ["main"]` array — the single main window covers all views.

## UX: "Open log folder"

### Tray menu — `apps/desktop/src-tauri/src/tray.rs`

1. Add a new menu-item id constant `ID_OPEN_LOG_FOLDER = "open-log-folder"`, placed between `ID_ABOUT` and `ID_QUIT`.
2. Construct a `MenuItem` with default English label `"Open log folder…"`.
3. Insert it into the `Menu::with_items` slice between `&about` and `&quit`.
4. Extend `TrayMenuHandles` with `open_log_folder: MenuItem<Wry>` and include it in the `handle.manage(...)` block, so i18n relabeling can reach it.
5. Extend `TrayLabels` with `open_log_folder: Option<String>` and handle it in `update_tray_menu` alongside the other items.
6. In `handle_menu_event`, add:

   ```rust
   ID_OPEN_LOG_FOLDER => open_log_folder(app),
   ```

   where `open_log_folder` resolves `app.path().app_log_dir()` and calls `app.opener().open_path(dir, None::<&str>)`, logging any error at `log::error!` level and (best-effort) showing a `tauri-plugin-notification` toast on failure so the user isn't left confused.

### Settings view — `apps/desktop/src/windows/Settings.vue`

In the `basic` tab, append a new row below the existing controls:

```
<Label>{{ t('settings.logs') }}</Label>
<Button variant="outline" @click="openLogFolder">{{ t('settings.openLogFolder') }}</Button>
```

Handler:

```typescript
import { appLogDir } from '@tauri-apps/api/path'
import { openPath } from '@tauri-apps/plugin-opener'

async function openLogFolder() {
  try {
    await openPath(await appLogDir())
  } catch (e) {
    console.error('failed to open log folder', e)
  }
}
```

Uses existing deps (`@tauri-apps/plugin-opener`, `@tauri-apps/api`); no new JS deps.

### i18n — `apps/desktop/src/locales/{en,jp,zh}.json`

Add three keys per locale (exact placement mirrors the existing key grouping):

| Key                   | en                    | jp                   | zh           |
| --------------------- | --------------------- | -------------------- | ------------ |
| `settings.logs`       | `Logs`                | `ログ`               | `日志`       |
| `settings.openLogFolder` | `Open log folder` | `ログフォルダを開く` | `打开日志文件夹` |
| `tray.openLogFolder`  | `Open log folder…`    | `ログフォルダを開く…`  | `打开日志文件夹…` |

When the locale changes, the frontend already calls `invoke('update_tray_menu', { labels })`; extend the TypeScript payload type and the `labels` object to include `open_log_folder`.

## Error Handling

- `attachConsole()` failure: swallowed with `.catch()`. DevTools continues to show original messages.
- Plugin build failure in Rust: unreachable under normal config; if it returns `Err`, propagate via `expect` inside `run()` during startup (same pattern as the existing `.run(tauri::generate_context!()).expect(...)`). Startup logging failure is fatal — we'd rather fail loudly than silently lose logs.
- `app_log_dir()` failure during tray "Open log folder": logged via `log::error!` and surfaced as a notification. Menu stays enabled.
- Rotation cleanup failure: logged at `log::warn!`, non-fatal.

## Testing

Manual smoke checks (no new unit tests — this is plumbing + UX):

1. **Dev bridge**: `pnpm desktop:dev`. In a Vue file, add `console.log('hello from webview')` on mount. Verify `[DEBUG][webview] hello from webview` appears in the terminal and that DevTools still shows the original line.
2. **Dev levels**: set `RUST_LOG=info pnpm desktop:dev`. Verify `console.debug` from the frontend is suppressed in the terminal but `console.log`+ still appears.
3. **Prod file**: `pnpm desktop:build`; launch the `.app`; open Settings → Open log folder; confirm `typo.log` exists and contains recent entries from app start.
4. **Tray entry**: right-click tray icon; click "Open log folder…"; the OS file manager opens at the log directory.
5. **i18n**: switch locale via the existing language selector; confirm both the tray item and Settings row relabel without restart.
6. **Rotation** (one-off): set `max_file_size(1024)` on a throwaway branch, spin in a loop logging 2 KB of text ~10 times, relaunch, confirm no more than 3 `typo*.log` files remain, newest first.
7. **Rust sweep**: `rg '^\s*(println|eprintln)!' apps/desktop/src-tauri/src` returns zero matches.
8. **Build & types**: `pnpm desktop:build:frontend` succeeds (runs `vue-tsc`). `cd apps/desktop/src-tauri && cargo check` succeeds.
9. **Lint**: `pnpm lint` passes (CI will auto-fix formatting regardless).

## File Inventory (what lands in the PR)

Modified:

- `apps/desktop/src-tauri/Cargo.toml` — add `tauri-plugin-log = "2"`.
- `apps/desktop/src-tauri/src/lib.rs` — register plugin, migrate `println!`/`eprintln!`, add rotation cleanup.
- `apps/desktop/src-tauri/src/tray.rs` — add `ID_OPEN_LOG_FOLDER`, extend `TrayMenuHandles` + `TrayLabels`, handle event, migrate `eprintln!`.
- `apps/desktop/src-tauri/src/cli.rs` — **no code change**; `println!("typo {version}")` is preserved as CLI `--version` output. (Listed here only for clarity during the migration sweep.)
- `apps/desktop/src-tauri/capabilities/default.json` — add `log:default`.
- `apps/desktop/package.json` — add `@tauri-apps/plugin-log`.
- `apps/desktop/src/main.ts` — call `attachConsole()`.
- `apps/desktop/src/windows/Settings.vue` — add Logs row + handler.
- `apps/desktop/src/locales/en.json` — add 3 keys.
- `apps/desktop/src/locales/jp.json` — add 3 keys.
- `apps/desktop/src/locales/zh.json` — add 3 keys.
- `apps/desktop/src/tray.ts` — include `open_log_folder` in the `labels` object passed to `invoke('update_tray_menu', …)`.

Not modified: `core/`, `apps/www`, `packages/*`, `tauri.conf.json`, any CI workflow.

## Acceptance Criteria

Done when all hold:

1. In `pnpm desktop:dev`, a `console.log('x')` in any Vue file produces a line containing `[webview] x` in the same terminal.
2. In `pnpm desktop:dev`, existing Rust log points (previously `println!`) appear formatted as `[LEVEL][typo_lib...] ...` in the terminal — consistent with webview lines.
3. In a release build, no logs appear on stdout; instead, `appLogDir()/typo.log` contains entries from app start at `info` level or above, including both Rust and webview origins.
4. The log file rotates at ~5 MB; after rotation, at most 3 `typo*.log` files exist in the log directory.
5. The tray menu shows a new "Open log folder…" item between "About" and "Quit"; clicking it opens the log directory in the OS file manager.
6. Settings (basic tab) shows a "Logs / Open log folder" row that behaves identically.
7. Both the tray item and Settings row are localized in `en`, `jp`, and `zh` and relabel live when locale changes.
8. `rg '^\s*(println|eprintln|print)!' apps/desktop/src-tauri/src` returns exactly one match: the `typo --version` line in `cli.rs`.
9. `cargo check`, `pnpm desktop:build:frontend`, and `pnpm lint` all succeed.
10. No changes under `core/`, `apps/www`, `packages/`, or to any root CI workflow.

## Out of Scope (deferred)

- In-app log viewer.
- Remote log upload / crash reporter.
- Structured JSON logs.
- Per-target or per-module log level overrides via UI.
- Logging in `apps/www` or `core/`.
