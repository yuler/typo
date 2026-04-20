# System Tray Menu — Design

- **Status:** Approved; ready for implementation plan.
- **Target workspace:** `apps/desktop` (Tauri 2 + Vue 3).
- **Tracking:** `TODO.md` → "Add system tray menu".
- **Date:** 2026-04-20.

## 1. Goal

Give every user a reliable way to reach the app and quit it, without relying on the Dock (macOS) or on killing the process (Linux/Windows). typo already assumes the tray exists (see the single-instance notification in `apps/desktop/src-tauri/src/cli.rs` — *"You can find it in the tray menu."*), so we close that loop and take the opportunity to turn typo into a proper menu-bar utility on macOS.

## 2. Non-goals

- Recent-corrections submenu.
- Per-prompt shortcut submenu (`/tr:zh`, `/prompt`, …).
- Dynamic `Show`/`Hide` label that toggles based on current window visibility.
- Tray badge / status indicator (e.g. red dot while processing).
- User-configurable "show Dock icon" toggle on macOS.
- Separate `WebviewWindow` for Settings (Settings stays a mode of the main window).

These may be picked up in later PRs.

## 3. User-visible behavior

### 3.1 Tray icon

- Appears on all platforms (macOS menu bar, Windows system tray, Linux indicator/status area).
- Monochrome template silhouette; adapts to light/dark menu bar on macOS automatically.
- Tooltip: `"typo"` (static, not translated).
- **Left-click** → toggles the `main` capsule window between `show() + set_focus()` and `hide()`.
- **Right-click / ctrl-click** → opens the menu.
- On desktop environments that don't honor left-click-to-toggle (some GNOME/Wayland setups), any click opens the menu — acceptable fallback because `Show typo` is always in the menu.

### 3.2 Menu items

| ID              | Label (en)             | Accelerator   | Action                                                                 |
|-----------------|------------------------|---------------|------------------------------------------------------------------------|
| `show`          | `Show typo`            | —             | `window.show(); window.set_focus()`                                    |
| `settings`      | `Settings…`            | —             | show window, then emit `tray:open-settings`                            |
| `check-updates` | `Check for updates…`   | —             | emit `tray:check-updates`                                              |
| *(separator)*   |                        |               |                                                                        |
| `about`         | `About typo v1.2.1`    | —             | `opener::open_url("https://github.com/yuler/typo")`                    |
| `quit`          | `Quit typo`            | `CmdOrCtrl+Q` | `app.exit(0)`                                                          |

- Version in the `About` label is injected at label-update time via `{version}` placeholder interpolation, so bumping the app version updates the menu automatically.
- `Settings…` first shows the window, *then* emits the event. This avoids a race where Vue swaps to Settings while the window is still hidden.

### 3.3 macOS activation policy

On macOS only, the app switches to `ActivationPolicy::Accessory`:

- No Dock icon.
- Excluded from Cmd-Tab.
- Windows still work normally.
- Accessibility-permission prompts continue to work (bundle-based, independent of activation policy).
- `macOSPrivateApi: true` stays enabled — still needed for window transparency.

Migration impact: existing macOS users will see the Dock icon disappear on first launch after the update. The tray icon is visible from the moment the app starts, so discoverability is fine. Release notes should call this out.

### 3.4 Check-for-updates UX change

Today the app auto-checks on launch and opens the `Upgrade` window only if an update is found. With this change:

- The startup auto-check stays silent when no update is available (unchanged).
- The explicit `Check for updates…` tray click *always* surfaces a result: `Upgrade` window on hit, OS notification `"You're up to date"` (via `tauri-plugin-notification`) on miss.

## 4. Architecture

### 4.1 Overview

```
┌──────────────────────────────────────────────────────────┐
│ macOS menu bar / Windows tray / Linux indicator          │
│           [𝒕 typo]  ← left-click toggles capsule          │
│                     right-click shows menu:              │
│                       Show typo                          │
│                       Settings…                          │
│                       Check for updates…                 │
│                       ─────────────                      │
│                       About typo v1.2.1      → opens URL │
│                       Quit typo              (⌘Q)        │
└──────────────────────────────────────────────────────────┘
     │                            │
     │ local action               │ event: tray:open-settings
     ▼                            ▼           tray:check-updates
 window.show/hide               Vue (App.vue)
 app.exit                          │
 opener::open_url                  ├─ setCurrentWindow('Settings')
                                   └─ checkUpgrade() (refactored to toast on miss)
```

### 4.2 Responsibility split

- **Rust owns the tray.** Builds the `TrayIcon` + `Menu` in `setup()`, stores menu-item handles in `tauri::State<TrayMenuHandles>`, and handles clicks.
- **Local actions stay in Rust** (show/hide window, open URL, quit). No round-trip through the webview → no race with webview load.
- **App-state actions** (open Settings mode, run update check) fire events that Vue listens for. These need the Vue app anyway, so the extra hop is appropriate.
- **i18n labels come from Vue** because that's where the i18n bundles live. Vue calls a single `update_tray_menu(labels)` command on mount and whenever the locale changes; Rust replaces item texts in place.

### 4.3 Event & command surface

- Events (Rust → Vue):
  - `tray:open-settings` — no payload.
  - `tray:check-updates` — no payload.
- Command (Vue → Rust):
  - `update_tray_menu(labels: TrayLabels) -> Result<(), String>`.

## 5. Implementation details

### 5.1 New Rust module: `apps/desktop/src-tauri/src/tray.rs`

```rust
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_opener::OpenerExt; // for app.opener().open_url(...)

pub const TRAY_ID: &str = "main";

pub struct TrayMenuHandles {
    pub show: MenuItem<tauri::Wry>,
    pub settings: MenuItem<tauri::Wry>,
    pub check_updates: MenuItem<tauri::Wry>,
    pub about: MenuItem<tauri::Wry>,
    pub quit: MenuItem<tauri::Wry>,
}

#[derive(serde::Deserialize)]
pub struct TrayLabels {
    pub show: Option<String>,
    pub settings: Option<String>,
    pub check_updates: Option<String>,
    pub about: Option<String>,
    pub quit: Option<String>,
    pub tooltip: Option<String>,
}

pub fn init(app: &tauri::App) -> tauri::Result<()> {
    // 1. Build MenuItems with stable IDs ("show", "settings", "check-updates",
    //    "about", "quit") and English defaults; the accelerator string for
    //    `quit` is "CmdOrCtrl+Q".
    // 2. Assemble them + a PredefinedMenuItem::separator() into a Menu.
    // 3. include_bytes! the icon, load as tauri::image::Image.
    // 4. TrayIconBuilder::with_id(TRAY_ID)
    //      .icon(icon).icon_as_template(true)
    //      .tooltip("typo").menu(&menu)
    //      .on_tray_icon_event(handle_tray_icon_event)
    //      .on_menu_event(handle_menu_event)
    //      .build(app)?;
    // 5. app.manage(TrayMenuHandles { ... });
    //    (The tray itself is reachable later via app.tray_by_id(TRAY_ID).)
    Ok(())
}

#[tauri::command]
pub fn update_tray_menu(
    app: AppHandle,
    state: tauri::State<'_, TrayMenuHandles>,
    labels: TrayLabels,
) -> Result<(), String> {
    // For each Some(text), call the matching item's set_text(text)
    // (e.g. state.show.set_text(text).map_err(|e| e.to_string())?;).
    // For the tooltip: look up the tray via `app.tray_by_id(TRAY_ID)` and
    // call `tray.set_tooltip(Some(text))`.
    Ok(())
}
```

Click routing:

- `on_tray_icon_event`: match `TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. }` → `toggle_main_window(app)`.
- `on_menu_event`: `match event.id().as_ref()`:
  - `"show"` → `show_and_focus_main(app)`.
  - `"settings"` → `show_and_focus_main(app)`; `app.emit("tray:open-settings", ())`.
  - `"check-updates"` → `app.emit("tray:check-updates", ())`.
  - `"about"` → `app.opener().open_url("https://github.com/yuler/typo", None::<&str>)`.
  - `"quit"` → `app.exit(0)`.

Helper: `fn main_window(app: &AppHandle) -> Option<tauri::WebviewWindow>` → `app.get_webview_window("main")`.

### 5.2 Changes to `apps/desktop/src-tauri/src/lib.rs`

```rust
mod cli;
mod keyboard;
mod tray;   // NEW

// in setup():
tray::init(app)?;
#[cfg(target_os = "macos")]
app.set_activation_policy(tauri::ActivationPolicy::Accessory);

// in invoke_handler!:
tray::update_tray_menu,
```

No other changes in `lib.rs`. `cli.rs` stays identical — its existing notification body is now accurate.

### 5.3 Changes to `apps/desktop/src-tauri/Cargo.toml`

```toml
tauri = { version = "2", features = ["macos-private-api", "devtools", "tray-icon", "image-png"] }
```

`image-png` is needed for `tauri::image::Image::from_bytes` on a PNG.

### 5.4 New JS module: `apps/desktop/src/tray.ts`

```ts
import { invoke } from '@tauri-apps/api/core'
import { watch } from 'vue'
import { useI18n } from '@/composables/useI18n'

export async function syncTrayMenu(): Promise<void> {
  const { t, locale } = useI18n()

  async function push(): Promise<void> {
    await invoke('update_tray_menu', {
      labels: {
        show: t('tray.show'),
        settings: t('tray.settings'),
        check_updates: t('tray.check_updates'),
        about: t('tray.about', { version: __APP_VERSION__ }),
        quit: t('tray.quit'),
        tooltip: t('tray.tooltip'),
      },
    })
  }

  await push()
  watch(locale, push)
}
```

`__APP_VERSION__` is injected via `vite.config.ts` `define`, sourced from `apps/desktop/package.json#version` (stays in sync with `Cargo.toml` via `pnpm bump`). If the Vite define is not already present, add it in this PR.

### 5.5 Changes to `apps/desktop/src/App.vue`

1. Import `syncTrayMenu`; call after `initializeI18n()` in `onMounted`.
2. Listen for tray events (register in `onMounted`, unregister in `onUnmounted`):
   - `tray:open-settings` → `setCurrentWindow('Settings')`.
   - `tray:check-updates` → refactored `checkUpgrade({ verbose: true })` that either opens the Upgrade window (unchanged path) or, on miss, fires an OS notification with title `typo` and body `t('updates.up_to_date', { version })`.
3. The existing silent auto-check at startup stays as-is (calls `checkUpgrade({ verbose: false })` — default).

Listener uses `@tauri-apps/api/event` `listen`, which returns an `UnlistenFn` stored in refs and called in `onUnmounted`.

### 5.6 Changes to `apps/desktop/src-tauri/capabilities/default.json`

Add:

- `core:tray:default`
- `core:menu:default`
- `opener:allow-open-url`

Exact permission identifiers will be verified against the installed Tauri version during implementation.

### 5.7 New asset: `apps/desktop/src-tauri/icons/tray.png`

- 44×44 PNG with alpha, single-color silhouette (`#000000` on transparent).
- Derived from `apps/desktop/src-tauri/resources/logo.png` (flatten → threshold → clean up).
- Embedded via `include_bytes!` — no `tauri.conf.json` resources entry needed.
- If specific Linux indicators render the silhouette poorly, add `tray-light.png`/`tray-dark.png` pair in a follow-up PR.

### 5.8 New i18n keys

Added to `apps/desktop/src/locales/{en,zh,jp}.json`:

```jsonc
// en.json
"tray.tooltip": "typo",
"tray.show": "Show typo",
"tray.settings": "Settings…",
"tray.check_updates": "Check for updates…",
"tray.about": "About typo v{version}",
"tray.quit": "Quit typo",
"updates.up_to_date": "You're on the latest version (v{version})"
```

```jsonc
// zh.json
"tray.tooltip": "typo",
"tray.show": "显示 typo",
"tray.settings": "设置…",
"tray.check_updates": "检查更新…",
"tray.about": "关于 typo v{version}",
"tray.quit": "退出 typo",
"updates.up_to_date": "已是最新版本 (v{version})"
```

```jsonc
// jp.json
"tray.tooltip": "typo",
"tray.show": "typo を表示",
"tray.settings": "設定…",
"tray.check_updates": "アップデートを確認…",
"tray.about": "typo について v{version}",
"tray.quit": "typo を終了",
"updates.up_to_date": "最新版です (v{version})"
```

`{version}` uses the existing `createGenericTranslator` interpolation syntax (see `apps/desktop/src/composables/useI18n.ts`).

## 6. Edge cases

- **Tray init failure** (no system tray host on Linux): log the error, swallow it, app continues. Global hotkey and capsule still work.
- **`update_tray_menu` called before tray built**: prevented by ordering — Vue calls it in `onMounted` after Rust `setup()` has run; `tauri::State<TrayMenuHandles>` guarantees presence or the command returns a clean error.
- **Locale watcher firing during quit**: tied to Vue app lifetime, torn down automatically.
- **Second-instance launch**: existing `cli::notify_existing_instance` behavior unchanged; its message is now accurate.
- **Capsule hidden when `Settings…` clicked**: handler shows/focuses the window *before* emitting the event.
- **First launch after upgrade on macOS**: Dock icon disappears once `setup()` sets the activation policy. Matches Rectangle/Raycast conventions; release notes flag this.
- **`Check for updates…` while already on Upgrade window**: no-op — `setCurrentWindow('Upgrade')` is idempotent.
- **`About` URL blocked by capability scope**: mitigated by allow-listing `opener:allow-open-url` and scoping to the GitHub URL if feasible.

## 7. Testing plan (manual)

Automated tests are not added — tray behavior is OS-integration-heavy and not practical to unit test without a display server. Manual QA across the two primary platforms is the bar.

1. `pnpm desktop:dev` on **macOS**:
   - No Dock icon, tray appears in menu bar.
   - Left-click tray → capsule toggles show/hide.
   - Right-click tray → menu opens; each item behaves per §3.2.
   - Switch locale → Chinese → reopen menu → labels are Chinese. Repeat for Japanese.
   - Global hotkey correction flow still works unchanged.
2. `pnpm desktop:dev` on **Linux (X11)**:
   - Tray icon appears. Menu items work. Left-click-to-toggle may or may not fire depending on DE — acceptable either way.
3. `pnpm desktop:build` on the release matrix — verify bundles still produce successfully.
4. Smoke: existing global-hotkey → correction flow, Settings from capsule gear, Upgrade window from silent auto-check.

## 8. Rollout

- Single PR scoped to this feature.
- Release notes entry for the next version noting: "typo is now a menu-bar app on macOS (Dock icon removed) and gained a system tray menu on all platforms."

## 9. Future work

- Hand-crafted monochrome tray icon (initial version is derived from the existing logo).
- Optional `Show Dock icon` setting on macOS.
- Separate `WebviewWindow` for Settings, if the "reuse main window" approach becomes a bottleneck.
- Tray badge while processing.
- Per-shortcut submenu for prompt shortcuts.
