# System Tray Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a cross-platform system tray (macOS menu bar / Windows tray / Linux indicator) to `apps/desktop` with a 5-item menu (Show · Settings… · Check for updates… · About · Quit), left-click window toggling, i18n, and menu-bar-only mode on macOS.

**Architecture:** Rust builds and owns the tray + menu via Tauri 2's native `tauri::tray` API; click handlers either run locally in Rust (show/hide window, open URL, quit) or emit events that Vue listens for (open Settings, run update check). Vue pushes translated labels to Rust via a single `update_tray_menu` command, re-running whenever the locale changes. On macOS, the activation policy switches to `Accessory` so the app becomes a proper menu-bar utility (no Dock icon, no Cmd-Tab).

**Tech Stack:** Tauri 2 (`tray-icon` + `image-png` features), Rust, Vue 3 + TypeScript, existing `@typo/languages` i18n, `tauri-plugin-opener`, `tauri-plugin-notification`.

**Spec:** `docs/superpowers/specs/2026-04-20-system-tray-menu-design.md`.

---

## File Structure

| Path | Status | Responsibility |
|---|---|---|
| `apps/desktop/src-tauri/Cargo.toml` | modify | Enable `tray-icon` and `image-png` features on the `tauri` crate. |
| `apps/desktop/src-tauri/icons/tray.png` | create | Monochrome template icon (44×44, transparent PNG). |
| `apps/desktop/src-tauri/src/tray.rs` | create | Build tray + menu, route clicks, expose `update_tray_menu` command. |
| `apps/desktop/src-tauri/src/lib.rs` | modify | Register `tray` module; call `tray::init`; set macOS activation policy; register command. |
| `apps/desktop/src-tauri/capabilities/default.json` | modify (conditional) | Only if runtime reports permission errors — add `opener:allow-open-url`. |
| `apps/desktop/src/locales/en.json` | modify | Add `tray.*` and `updates.up_to_date` keys. |
| `apps/desktop/src/locales/zh.json` | modify | Same keys, translated. |
| `apps/desktop/src/locales/jp.json` | modify | Same keys, translated. |
| `apps/desktop/src/tray.ts` | create | Vue helper that pushes translated labels to Rust on mount and on locale change. |
| `apps/desktop/src/App.vue` | modify | Call `syncTrayMenu`; listen for `tray:open-settings` / `tray:check-updates`; refactor `checkUpgrade` to accept `{ verbose }`. |

No test files are created. Tray behavior is OS-integration-heavy and not practical to unit-test without a display server; the plan uses manual verification steps instead.

---

## Task 1: Enable the Tauri `tray-icon` feature

**Files:**
- Modify: `apps/desktop/src-tauri/Cargo.toml`

- [ ] **Step 1: Add `tray-icon` and `image-png` features to the `tauri` dependency**

Open `apps/desktop/src-tauri/Cargo.toml`. Replace the existing `tauri = { ... }` line with:

```toml
tauri = { version = "2", features = ["macos-private-api", "devtools", "tray-icon", "image-png"] }
```

- [ ] **Step 2: Build to verify the features resolve and the ACL manifest regenerates**

Run from the repo root:

```bash
pnpm desktop:tauri build --debug --no-bundle
```

Expected: compile succeeds (may take a few minutes on first run because Tauri pulls tray-icon deps). If compilation fails, the error will be a missing transitive dep — report and stop.

- [ ] **Step 3: Confirm the tray ACL identifiers are now available**

Run from the repo root:

```bash
grep -c '"core:tray:default"\|"core:menu:default"' apps/desktop/src-tauri/gen/schemas/acl-manifests.json
```

Expected output: a number ≥ `2`. If `0`, the `tray-icon` feature didn't expose the expected ACLs — re-run `pnpm desktop:tauri build --debug --no-bundle` and re-check. These identifiers aren't needed for this plan (tray is pure-Rust) but their presence confirms the feature is wired.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src-tauri/Cargo.toml apps/desktop/src-tauri/Cargo.lock
git commit -m "🔧 Enable Tauri tray-icon and image-png features"
```

---

## Task 2: Add the tray icon asset

**Files:**
- Create: `apps/desktop/src-tauri/icons/tray.png`

- [ ] **Step 1: Generate a 44×44 monochrome silhouette from the existing logo**

The source is `apps/desktop/src-tauri/resources/logo.png` (or `apps/desktop/src-tauri/icons/128x128.png` if the `resources/logo.png` is absent — verify with `ls apps/desktop/src-tauri/resources/`).

Preferred tool is ImageMagick (`convert` / `magick`); if not installed, use `sips` on macOS or Python + Pillow.

With ImageMagick:

```bash
magick apps/desktop/src-tauri/resources/logo.png \
  -resize 44x44 \
  -alpha extract \
  -threshold 50% \
  -negate \
  -transparent white \
  apps/desktop/src-tauri/icons/tray.png
```

If that produces a washed-out silhouette, try this flatten-and-recolor pipeline instead:

```bash
magick apps/desktop/src-tauri/resources/logo.png \
  -resize 44x44 \
  -background white -alpha remove -alpha off \
  -threshold 50% \
  -transparent white \
  apps/desktop/src-tauri/icons/tray.png
```

With Python + Pillow (fallback when ImageMagick is not available):

```python
# scripts/generate-tray-icon.py — ad hoc; you can delete after running.
from PIL import Image
im = Image.open("apps/desktop/src-tauri/resources/logo.png").convert("RGBA")
im = im.resize((44, 44), Image.LANCZOS)
pixels = im.load()
for y in range(im.height):
    for x in range(im.width):
        r, g, b, a = pixels[x, y]
        brightness = (r + g + b) / 3
        pixels[x, y] = (0, 0, 0, 0 if brightness > 127 or a < 32 else 255)
im.save("apps/desktop/src-tauri/icons/tray.png")
```

- [ ] **Step 2: Verify the output**

```bash
file apps/desktop/src-tauri/icons/tray.png
```

Expected output should contain `PNG image data, 44 x 44`. Open the PNG in a viewer and confirm it's a recognizable silhouette on a transparent background. If it looks unusable, try the other pipeline or hand-edit in any image editor — all that matters is that it's a 44×44 transparent PNG with a black silhouette.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src-tauri/icons/tray.png
git commit -m "🎨 Add 44x44 monochrome tray icon asset"
```

---

## Task 3: Create the Rust tray module

**Files:**
- Create: `apps/desktop/src-tauri/src/tray.rs`

- [ ] **Step 1: Create `apps/desktop/src-tauri/src/tray.rs` with the full module**

```rust
use serde::Deserialize;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, Wry};
use tauri_plugin_opener::OpenerExt;

pub const TRAY_ID: &str = "main";

const ABOUT_URL: &str = "https://github.com/yuler/typo";

// Menu-item IDs. Keep in sync with the on_menu_event match arms below and with
// the spec's §3.2 table.
const ID_SHOW: &str = "show";
const ID_SETTINGS: &str = "settings";
const ID_CHECK_UPDATES: &str = "check-updates";
const ID_ABOUT: &str = "about";
const ID_QUIT: &str = "quit";

// Events emitted to the Vue side. Keep in sync with listeners in App.vue.
const EV_OPEN_SETTINGS: &str = "tray:open-settings";
const EV_CHECK_UPDATES: &str = "tray:check-updates";

/// Handles to mutable menu items so update_tray_menu can relabel them after
/// the tray has been built.
pub struct TrayMenuHandles {
    pub show: MenuItem<Wry>,
    pub settings: MenuItem<Wry>,
    pub check_updates: MenuItem<Wry>,
    pub about: MenuItem<Wry>,
    pub quit: MenuItem<Wry>,
}

#[derive(Deserialize)]
pub struct TrayLabels {
    pub show: Option<String>,
    pub settings: Option<String>,
    pub check_updates: Option<String>,
    pub about: Option<String>,
    pub quit: Option<String>,
    pub tooltip: Option<String>,
}

pub fn init(app: &tauri::App) -> tauri::Result<()> {
    let handle = app.handle();

    let show = MenuItem::with_id(handle, ID_SHOW, "Show typo", true, None::<&str>)?;
    let settings = MenuItem::with_id(handle, ID_SETTINGS, "Settings…", true, None::<&str>)?;
    let check_updates = MenuItem::with_id(
        handle,
        ID_CHECK_UPDATES,
        "Check for updates…",
        true,
        None::<&str>,
    )?;
    let separator = PredefinedMenuItem::separator(handle)?;
    let about = MenuItem::with_id(
        handle,
        ID_ABOUT,
        format!("About typo v{}", env!("CARGO_PKG_VERSION")),
        true,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(handle, ID_QUIT, "Quit typo", true, Some("CmdOrCtrl+Q"))?;

    let menu = Menu::with_items(
        handle,
        &[&show, &settings, &check_updates, &separator, &about, &quit],
    )?;

    let icon_bytes = include_bytes!("../icons/tray.png");
    let icon = tauri::image::Image::from_bytes(icon_bytes)?;

    TrayIconBuilder::with_id(TRAY_ID)
        .icon(icon)
        .icon_as_template(true)
        .tooltip("typo")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| handle_tray_icon_event(tray.app_handle(), event))
        .on_menu_event(|app, event| handle_menu_event(app, event.id().as_ref()))
        .build(handle)?;

    handle.manage(TrayMenuHandles {
        show,
        settings,
        check_updates,
        about,
        quit,
    });

    Ok(())
}

fn handle_tray_icon_event(app: &AppHandle, event: TrayIconEvent) {
    if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
    } = event
    {
        toggle_main_window(app);
    }
}

fn handle_menu_event(app: &AppHandle, id: &str) {
    match id {
        ID_SHOW => show_and_focus_main(app),
        ID_SETTINGS => {
            show_and_focus_main(app);
            if let Err(err) = app.emit(EV_OPEN_SETTINGS, ()) {
                eprintln!("Failed to emit {}: {}", EV_OPEN_SETTINGS, err);
            }
        }
        ID_CHECK_UPDATES => {
            if let Err(err) = app.emit(EV_CHECK_UPDATES, ()) {
                eprintln!("Failed to emit {}: {}", EV_CHECK_UPDATES, err);
            }
        }
        ID_ABOUT => {
            if let Err(err) = app.opener().open_url(ABOUT_URL, None::<&str>) {
                eprintln!("Failed to open {}: {}", ABOUT_URL, err);
            }
        }
        ID_QUIT => app.exit(0),
        other => eprintln!("Unknown tray menu event id: {}", other),
    }
}

fn toggle_main_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    match window.is_visible() {
        Ok(true) => {
            if let Err(err) = window.hide() {
                eprintln!("Failed to hide main window: {}", err);
            }
        }
        Ok(false) => show_and_focus_main(app),
        Err(err) => eprintln!("Failed to query main window visibility: {}", err),
    }
}

fn show_and_focus_main(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    if let Err(err) = window.show() {
        eprintln!("Failed to show main window: {}", err);
    }
    if let Err(err) = window.set_focus() {
        eprintln!("Failed to focus main window: {}", err);
    }
}

#[tauri::command]
pub fn update_tray_menu(
    app: AppHandle,
    state: tauri::State<'_, TrayMenuHandles>,
    labels: TrayLabels,
) -> Result<(), String> {
    if let Some(text) = labels.show.as_deref() {
        state.show.set_text(text).map_err(|e| e.to_string())?;
    }
    if let Some(text) = labels.settings.as_deref() {
        state.settings.set_text(text).map_err(|e| e.to_string())?;
    }
    if let Some(text) = labels.check_updates.as_deref() {
        state
            .check_updates
            .set_text(text)
            .map_err(|e| e.to_string())?;
    }
    if let Some(text) = labels.about.as_deref() {
        state.about.set_text(text).map_err(|e| e.to_string())?;
    }
    if let Some(text) = labels.quit.as_deref() {
        state.quit.set_text(text).map_err(|e| e.to_string())?;
    }
    if let Some(tooltip) = labels.tooltip.as_deref() {
        if let Some(tray) = app.tray_by_id(TRAY_ID) {
            tray.set_tooltip(Some(tooltip)).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
```

- [ ] **Step 2: Verify the module compiles in isolation**

The module is not registered yet, so `cargo check` won't exercise it. Move on — Task 4 will register and compile it.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src-tauri/src/tray.rs
git commit -m "✨ Add Rust tray module (menu, click routing, update command)"
```

---

## Task 4: Wire the tray module into the app

**Files:**
- Modify: `apps/desktop/src-tauri/src/lib.rs`

- [ ] **Step 1: Register the `tray` module at the top of `lib.rs`**

Find the existing module declarations:

```rust
mod cli;
mod keyboard;
```

Replace with:

```rust
mod cli;
mod keyboard;
mod tray;
```

- [ ] **Step 2: Call `tray::init` and set the macOS activation policy in `setup()`**

Find the `.setup(move |app| {` block. Replace its body so it reads:

```rust
.setup(move |app| {
    tray::init(app)?;

    #[cfg(target_os = "macos")]
    app.set_activation_policy(tauri::ActivationPolicy::Accessory);

    if startup_selection && in_linux_wayland() {
        app_cli_startup_selection_trigger(&app.handle());
    }
    Ok(())
})
```

- [ ] **Step 3: Register the `update_tray_menu` command**

Find the existing `.invoke_handler(tauri::generate_handler![ ... ])` block. Add `tray::update_tray_menu,` to the list so it reads:

```rust
.invoke_handler(tauri::generate_handler![
    request_mac_accessibility_permissions,
    get_system_info,
    get_selected_text,
    keyboard::keyboard_select_all,
    keyboard::keyboard_paste_text,
    consume_pending_selection_input,
    tray::update_tray_menu,
])
```

- [ ] **Step 4: Compile-check the Rust side**

Run from the repo root:

```bash
pnpm desktop:tauri build --debug --no-bundle
```

Expected: build succeeds. If `set_activation_policy` is flagged as missing on non-macOS, confirm the `#[cfg(target_os = "macos")]` attribute is applied to the **entire statement** (not just the method call). Expected warnings about unused imports under certain `cfg`s are acceptable; hard errors are not.

- [ ] **Step 5: Run the dev build and confirm the tray appears**

From the repo root:

```bash
pnpm desktop:dev
```

Wait for the webview to come up. Expected:

- A tray icon appears in the menu bar (macOS) / system tray (Windows) / indicator area (Linux).
- On macOS, the Dock icon does **not** appear.
- Right-clicking the tray shows the English menu (`Show typo`, `Settings…`, `Check for updates…`, separator, `About typo v1.2.1`, `Quit typo`).
- `Quit typo` exits the app.
- `About typo v1.2.1` opens https://github.com/yuler/typo in the browser.
- Left-clicking the tray toggles the capsule visibility.

If the tray does not appear on Linux (some minimal setups lack `StatusNotifierItem`), note it and continue; the app must still run.

If clicking `About` does nothing and the terminal logs a permission error like `opener.open_url not allowed`, proceed to Task 5 and re-test after.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src-tauri/src/lib.rs
git commit -m "✨ Wire tray module into Tauri setup"
```

---

## Task 5: Adjust opener capability scope (conditional)

**Files:**
- Modify (conditional): `apps/desktop/src-tauri/capabilities/default.json`

**Condition:** Only do this task if Task 4 Step 5 showed a permission error when clicking `About`. Skip otherwise.

- [ ] **Step 1: Add `opener:allow-open-url` to the permissions array**

Open `apps/desktop/src-tauri/capabilities/default.json`. Insert `"opener:allow-open-url"` immediately after the existing `"opener:default"` line:

```json
"opener:default",
"opener:allow-open-url",
```

- [ ] **Step 2: Re-run `pnpm desktop:dev` and confirm `About` opens the URL**

Expected: clicking `About typo v1.2.1` opens https://github.com/yuler/typo in the default browser.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src-tauri/capabilities/default.json
git commit -m "🔧 Allow opener:open_url for tray About item"
```

---

## Task 6: Add i18n keys

**Files:**
- Modify: `apps/desktop/src/locales/en.json`
- Modify: `apps/desktop/src/locales/zh.json`
- Modify: `apps/desktop/src/locales/jp.json`

- [ ] **Step 1: Append tray + update keys to `en.json`**

Insert the following key/value pairs immediately before the closing `}` of `apps/desktop/src/locales/en.json` (don't forget the trailing comma on the preceding `"upgrade.downloading"` line):

```json
"tray.tooltip": "typo",
"tray.show": "Show typo",
"tray.settings": "Settings…",
"tray.check_updates": "Check for updates…",
"tray.about": "About typo v{version}",
"tray.quit": "Quit typo",
"updates.up_to_date": "You're on the latest version (v{version})"
```

- [ ] **Step 2: Append the same keys with Chinese values to `zh.json`**

```json
"tray.tooltip": "typo",
"tray.show": "显示 typo",
"tray.settings": "设置…",
"tray.check_updates": "检查更新…",
"tray.about": "关于 typo v{version}",
"tray.quit": "退出 typo",
"updates.up_to_date": "已是最新版本 (v{version})"
```

- [ ] **Step 3: Append the same keys with Japanese values to `jp.json`**

```json
"tray.tooltip": "typo",
"tray.show": "typo を表示",
"tray.settings": "設定…",
"tray.check_updates": "アップデートを確認…",
"tray.about": "typo について v{version}",
"tray.quit": "typo を終了",
"updates.up_to_date": "最新版です (v{version})"
```

- [ ] **Step 4: Validate each JSON file parses**

Run:

```bash
for f in apps/desktop/src/locales/en.json apps/desktop/src/locales/zh.json apps/desktop/src/locales/jp.json; do
  node -e "require('./$f')" && echo "$f OK"
done
```

Expected: three `OK` lines, no parse errors.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/locales/en.json apps/desktop/src/locales/zh.json apps/desktop/src/locales/jp.json
git commit -m "🌐 Add tray and up-to-date i18n keys (en/zh/jp)"
```

---

## Task 7: Add the Vue tray helper

**Files:**
- Create: `apps/desktop/src/tray.ts`

- [ ] **Step 1: Create `apps/desktop/src/tray.ts`**

```ts
import { invoke } from '@tauri-apps/api/core'
import { watch } from 'vue'
import { useI18n } from '@/composables/useI18n'

export async function syncTrayMenu(): Promise<void> {
  const { t, locale } = useI18n()

  async function push(): Promise<void> {
    try {
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
    catch (err) {
      console.error('Failed to update tray menu labels:', err)
    }
  }

  await push()
  watch(locale, () => {
    void push()
  })
}
```

- [ ] **Step 2: Lint the new file**

```bash
pnpm lint -- apps/desktop/src/tray.ts
```

Expected: no errors. Autofixable formatting issues are also acceptable; run `pnpm lint:fix -- apps/desktop/src/tray.ts` to clean them up.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/tray.ts
git commit -m "✨ Add Vue tray sync helper (label push on mount + locale change)"
```

---

## Task 8: Refactor `checkUpgrade` and wire tray events in `App.vue`

**Files:**
- Modify: `apps/desktop/src/App.vue`

- [ ] **Step 1: Refactor `checkUpgrade` to accept a verbose option and notify on miss**

Open `apps/desktop/src/App.vue`. Find the import block and the existing `checkUpgrade` function:

```ts
import { check } from '@tauri-apps/plugin-updater'
```

Augment imports with the notification plugin and the tray helper. Replace the import block above the `<script>` body additions so the imports look like this (keep existing imports not shown here untouched):

```ts
import { invoke } from '@tauri-apps/api/core'
import type { UnlistenFn } from '@tauri-apps/api/event'
import { listen } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'
import { check } from '@tauri-apps/plugin-updater'
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import Navbar from '@/components/Navbar.vue'
import Ribbon from '@/components/Ribbon.vue'
import Window from '@/components/Window.vue'
import { useGlobalState } from '@/composables/useGlobalState'
import { useI18n } from '@/composables/useI18n'
import { initializeI18n } from '@/composables/useI18n'
import { setupGlobalShortcut } from '@/shortcut'
import { initializeStore } from '@/store'
import { syncTrayMenu } from '@/tray'
import { initializeWindow, setupMainWindow, setupSettingsWindow, setupUpgradeWindow } from '@/window'
```

(Deduplicate if identical imports already exist; keep `type CurrentWindow` import and any other existing imports.)

Then find the existing `checkUpgrade` implementation:

```ts
async function checkUpgrade() {
  try {
    const update = await check()
    if (update) {
      setUpdateInfo(update)
      setCurrentWindow('Upgrade')
    }
  }
  catch (err) {
    console.error(err)
  }
}
```

Replace with:

```ts
const { t } = useI18n()

interface CheckUpgradeOptions {
  verbose?: boolean
}

async function checkUpgrade(options: CheckUpgradeOptions = {}): Promise<void> {
  const { verbose = false } = options
  try {
    const update = await check()
    if (update) {
      setUpdateInfo(update)
      setCurrentWindow('Upgrade')
      return
    }
    if (verbose) {
      await notifyUpToDate()
    }
  }
  catch (err) {
    console.error(err)
  }
}

async function notifyUpToDate(): Promise<void> {
  try {
    let granted = await isPermissionGranted()
    if (!granted) {
      const requested = await requestPermission()
      granted = requested === 'granted'
    }
    if (!granted)
      return
    sendNotification({
      title: 'typo',
      body: t('updates.up_to_date', { version: __APP_VERSION__ }),
    })
  }
  catch (err) {
    console.error('Failed to send up-to-date notification:', err)
  }
}
```

- [ ] **Step 2: Call `syncTrayMenu` and register tray event listeners in `onMounted`**

Find the existing `onMounted(async () => { ... })`. Replace the body so it reads:

```ts
const trayUnlisteners: UnlistenFn[] = []

onMounted(async () => {
  const appWindow = WebviewWindow.getCurrent()
  await appWindow?.setVisibleOnAllWorkspaces(true)

  await initializeStore()
  await initializeI18n()
  initializeWindow()
  await syncTrayMenu()

  trayUnlisteners.push(
    await listen('tray:open-settings', () => {
      setCurrentWindow('Settings')
    }),
    await listen('tray:check-updates', () => {
      void checkUpgrade({ verbose: true })
    }),
  )

  void checkUpgrade()

  const systemInfo = await invoke<SystemInfo>('get_system_info')
  const isLinuxWayland = systemInfo.os === 'linux' && systemInfo.is_wayland
  if (!isLinuxWayland)
    await setupGlobalShortcut()
})

onUnmounted(() => {
  while (trayUnlisteners.length) {
    const unlisten = trayUnlisteners.pop()
    unlisten?.()
  }
})
```

(Preserve any existing `SystemInfo` import / `type` declaration. If the file already has an `onUnmounted`, merge this one into it rather than duplicating.)

- [ ] **Step 3: Lint the file**

```bash
pnpm lint -- apps/desktop/src/App.vue
```

Expected: no errors. If there are, address them (typical issues: missing `type` keyword for `UnlistenFn` import — in that case use `import { type UnlistenFn, listen } from '@tauri-apps/api/event'`).

- [ ] **Step 4: Build to confirm everything compiles**

```bash
pnpm desktop:tauri build --debug --no-bundle
```

Expected: Rust + Vue both compile; a few warnings are fine.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/App.vue
git commit -m "✨ Wire tray sync, tray events, and verbose update check in App.vue"
```

---

## Task 9: Manual verification on macOS

Run end-to-end checks on the primary development platform.

- [ ] **Step 1: Launch the dev build**

```bash
pnpm desktop:dev
```

- [ ] **Step 2: Verify tray presence and macOS activation policy**

- A tray icon is visible in the menu bar.
- The Dock does **not** show the typo icon.
- Cmd-Tab does not include typo.

If any of the above fails, check that `set_activation_policy` is inside `setup()` and gated by `#[cfg(target_os = "macos")]`.

- [ ] **Step 3: Verify click behaviors**

- Left-click tray icon → capsule toggles visibility.
- Right-click tray icon → menu opens. Each item behaves per the spec:
  - `Show typo` → capsule visible and focused.
  - `Settings…` → capsule visible, window is in Settings mode.
  - `Check for updates…` → either the Upgrade window opens (if an update exists) or an OS notification reads "You're on the latest version (v1.2.1)".
  - `About typo v1.2.1` → opens https://github.com/yuler/typo in the browser.
  - `Quit typo` (or ⌘Q with the menu focused) → app exits cleanly.

- [ ] **Step 4: Verify i18n refresh**

Open Settings from the tray, change the display language to `中文`, then open the tray menu again. Expected: all labels are Chinese. Repeat for `日本語`. Restore to `English`.

- [ ] **Step 5: Verify existing flows still work**

- `⌘⇧X` still triggers the correction flow against selected text.
- Clicking the gear on the capsule still opens Settings.
- Quitting and relaunching restores the capsule to its saved position.

If everything passes, move on.

---

## Task 10: Manual verification on Linux (X11 if available)

**Condition:** Skip this task if Linux is not available. Note the skip in the PR description.

- [ ] **Step 1: Launch the dev build on Linux**

```bash
pnpm desktop:dev
```

- [ ] **Step 2: Verify tray presence**

Tray icon appears in the indicator area on Ubuntu / KDE / etc. On some GNOME-only setups without a `StatusNotifierItem` host, the tray will not appear — verify that in that case the app still runs and the global hotkey still works.

- [ ] **Step 3: Verify menu items**

Right-click tray → all menu items work the same as on macOS. Left-click-to-toggle may or may not fire depending on desktop environment — either outcome is acceptable.

- [ ] **Step 4: Verify release bundle build**

```bash
pnpm desktop:tauri build --no-bundle
```

Expected: succeeds with no errors.

---

## Task 11: Update TODO.md

**Files:**
- Modify: `TODO.md`

- [ ] **Step 1: Mark the tray item complete**

Change line 3 of `TODO.md` from:

```markdown
- [ ] Add system tray menu
```

to:

```markdown
- [x] Add system tray menu
```

- [ ] **Step 2: Commit**

```bash
git add TODO.md
git commit -m "✅ Tick off 'Add system tray menu' in TODO.md"
```

---

## Self-review notes

**Spec coverage (§ → task):**
- §3.1 tray icon + click behavior → Tasks 2, 3 (`handle_tray_icon_event`, `show_menu_on_left_click(false)`), 9.3.
- §3.2 menu items + accelerator → Task 3 (`MenuItem::with_id(..., Some("CmdOrCtrl+Q"))`).
- §3.3 macOS activation policy → Task 4 Step 2.
- §3.4 verbose `Check for updates…` → Task 8.
- §4.3 event & command surface → Task 3 (Rust side), Task 8 (Vue side).
- §5.1 tray module → Task 3.
- §5.2 lib.rs wiring → Task 4.
- §5.3 Cargo features → Task 1.
- §5.4 tray.ts helper → Task 7.
- §5.5 App.vue changes → Task 8.
- §5.6 capabilities → Task 5 (conditional — covered by a runtime gate).
- §5.7 tray asset → Task 2.
- §5.8 i18n keys → Task 6.
- §6 edge cases → encoded in `handle_menu_event` (unknown-id logging), `toggle_main_window` (visibility-query error handling), `syncTrayMenu` (caught `invoke` failure), `notifyUpToDate` (permission handling), Task 11 note re: `cli.rs` left alone intentionally.
- §7 testing plan → Tasks 9 and 10.
- §8 rollout → outside the code change; will be part of the PR description.

**Placeholder scan:** no TBD/TODO/"add appropriate" language. Code blocks are complete in every step.

**Type consistency:**
- Rust IDs `show`, `settings`, `check-updates`, `about`, `quit` are constants (`ID_*`) used both when building menu items and when routing events.
- JS object keys `show`, `settings`, `check_updates`, `about`, `quit`, `tooltip` match the `TrayLabels` struct field names (serde uses field names as-is).
- Event names `tray:open-settings` / `tray:check-updates` appear in `const` on the Rust side and as string literals in `App.vue`.
- `__APP_VERSION__` is already declared in `apps/desktop/src/vite-env.d.ts` and defined in `apps/desktop/vite.config.ts#define` — no plan task needed.
- `useI18n().t` signature from `apps/desktop/src/composables/useI18n.ts`: `t(key, vars?)` with `vars: Record<string, string | number | undefined | null>` — compatible with the `{ version }` object we pass.
