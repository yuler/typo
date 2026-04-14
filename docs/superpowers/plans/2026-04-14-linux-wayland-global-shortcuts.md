# Linux / Wayland global shortcuts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On Linux Wayland, register Typo’s two global shortcuts through XDG Desktop Portal `GlobalShortcuts` when possible, fall back to `tauri-plugin-global-shortcut`, expose registration status to the UI, and never fail silently.

**Architecture:** Pure-Rust helpers detect session type and map accelerators to XDG “shortcuts” trigger strings. A Linux-only async task owns the `ashpd` `GlobalShortcut` session and streams `Activated` events into Tauri `emit` payloads. The Vue app listens for those emits and runs the same handlers as today; it only calls `@tauri-apps/plugin-global-shortcut` `register` when the backend reports the plugin path is active (no double registration).

**Tech stack:** Tauri 2, Vue 3, TypeScript, Rust 2021, `ashpd` 0.13.x (`tokio`, `wayland` features), `futures-util`, `raw-window-handle` (via Tauri), existing `tauri-plugin-global-shortcut` 2.x.

**Note:** The superpowers writing-plans skill suggests a dedicated git worktree for execution; optional here. If you use one, branch from the commit that contains `docs/superpowers/specs/2026-04-14-linux-wayland-shortcuts-design.md`.

---

## File map (create / modify)

| Path | Responsibility |
|------|----------------|
| `src-tauri/src/session_linux.rs` | `SessionKind` from `WAYLAND_DISPLAY` / `DISPLAY` (injected for tests). |
| `src-tauri/src/accelerator_xdg.rs` | Map Typo accelerator strings → XDG `preferred_trigger` (unit-tested). |
| `src-tauri/src/linux_global_shortcuts.rs` | Portal bind + `receive_activated` loop + `AppHandle` emits; optional plugin fallback signal. |
| `src-tauri/src/lib.rs` | `mod` declarations, `#[cfg(target_os = "linux")]` setup spawn, new `invoke_handler` commands, shared emit helper used by portal task. |
| `src-tauri/Cargo.toml` | Linux-only deps: `ashpd`, `futures-util`. |
| `src/shortcut.ts` | Query backend status, `listen` for Rust emits, conditional `register` / skip to avoid double bind. |
| `src/shortcut_policy.ts` | Pure TS: given status JSON, decide whether frontend should call plugin `register` (Vitest). |
| `src/App.vue` | Await backend init before or alongside `setupGlobalShortcut()` (exact call order in task). |
| `src/windows/Settings.vue` | Banner when `registration.degraded` or `registration.error_message` set. |
| `README.md` | Typo-on-Wayland + Portal + limitations (per spec §5). |
| `package.json` / `vitest.config.ts` | Add `vitest` + `happy-dom`, `test` script. |

Reference implementation for Portal call sequence: ashpd demo `bind_shortcuts` + `request.response()` after `await` (see `/tmp/ashpd-src` clone from upstream or [ashpd demo global_shortcuts.rs](https://github.com/bilelmoussaoui/ashpd/blob/master/demo/client/src/portals/desktop/global_shortcuts.rs)).

---

### Task 1: `SessionKind` detection (Linux-oriented, unit-tested)

**Files:**

- Create: `src-tauri/src/session_linux.rs`
- Modify: `src-tauri/src/lib.rs` (add `mod session_linux;` near top with `#[cfg(target_os = "linux")]`)

**Test:** inline `#[cfg(test)]` in `session_linux.rs`

- [ ] **Step 1: Write the failing test**

Add `session_linux.rs`:

```rust
#[cfg(target_os = "linux")]
pub fn session_kind_from_env() -> SessionKind {
    session_kind_from(
        std::env::var_os("WAYLAND_DISPLAY"),
        std::env::var_os("DISPLAY"),
    )
}

#[cfg(target_os = "linux")]
fn session_kind_from(
    wayland_display: Option<std::ffi::OsString>,
    x11_display: Option<std::ffi::OsString>,
) -> SessionKind {
    if wayland_display.is_some() {
        return SessionKind::Wayland;
    }
    if x11_display.is_some() {
        return SessionKind::X11;
    }
    SessionKind::Unknown
}

#[cfg(target_os = "linux")]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SessionKind {
    Wayland,
    X11,
    Unknown,
}

#[cfg(all(test, target_os = "linux"))]
mod tests {
    use super::*;

    #[test]
    fn wayland_wins_when_both_set() {
        assert_eq!(
            session_kind_from(
                Some(":1".into()),
                Some(":0".into()),
            ),
            SessionKind::Wayland
        );
    }

    #[test]
    fn x11_only_when_wayland_missing() {
        assert_eq!(
            session_kind_from(None, Some(":0".into())),
            SessionKind::X11
        );
    }

    #[test]
    fn unknown_when_neither_set() {
        assert_eq!(session_kind_from(None, None), SessionKind::Unknown);
    }
}
```

- [ ] **Step 2: Run tests (Linux host or cross-target)**

Run:

```bash
cd /home/yule/Sides/typo/src-tauri && cargo test session_kind_from -- --exact
```

Expected: **FAIL** with `cannot find session_linux` or unresolved `SessionKind` until `mod session_linux` exists.

- [ ] **Step 3: Wire module in `lib.rs`**

Add (inside `lib.rs`, after existing `use` block):

```rust
#[cfg(target_os = "linux")]
mod session_linux;
```

- [ ] **Step 4: Re-run tests**

Run:

```bash
cd /home/yule/Sides/typo/src-tauri && cargo test session_kind_from -- --exact
```

Expected: **PASS** (3 tests on Linux). On non-Linux CI matrix rows this module is cfg’d out; those rows skip this test file — acceptable; optional follow-up is `#[cfg(test)]` stubs if you need macOS/Windows CI to compile tests (not required by this plan).

- [ ] **Step 5: Commit**

```bash
cd /home/yule/Sides/typo && git add src-tauri/src/session_linux.rs src-tauri/src/lib.rs && git commit -m "feat(linux): add SessionKind env detection with unit tests"
```

---

### Task 2: Accelerator → XDG `preferred_trigger` mapping

**Files:**

- Create: `src-tauri/src/accelerator_xdg.rs`
- Modify: `src-tauri/src/lib.rs` — `#[cfg(target_os = "linux")] mod accelerator_xdg;`

**Test:** `#[cfg(test)]` in same file (runs on all targets; no Linux cfg needed).

- [ ] **Step 1: Write failing tests**

```rust
pub fn typo_default_accelerators_to_xdg() -> Vec<(&'static str, &'static str, &'static str)> {
    vec![
        ("typo.open_main", "Open Typo on selected text", "<Primary><Shift>x"),
        ("typo.open_settings", "Open Typo settings", "<Primary>comma"),
    ]
}

/// Maps the subset of strings Typo uses today to XDG shortcut triggers.
/// Spec: https://specifications.freedesktop.org/shortcuts-spec/shortcuts-latest.html
pub fn tauri_style_to_xdg_trigger(input: &str) -> Option<String> {
    let parts: Vec<&str> = input.split('+').map(str::trim).collect();
    let mut mods: Vec<&str> = Vec::new();
    let mut key: Option<&str> = None;
    for p in parts {
        match p {
            "CommandOrControl" | "Ctrl" => mods.push("<Primary>"),
            "Shift" => mods.push("<Shift>"),
            "Alt" => mods.push("<Alt>"),
            "Super" => mods.push("<Super>"),
            k if key.is_none() => key = Some(k),
            _ => return None,
        }
    }
    let k = key?;
    let key_part = match k {
        "X" | "x" => "x",
        "," => "comma",
        _ => return None,
    };
    let mut out = String::new();
    for m in mods {
        out.push_str(m);
    }
    out.push_str(key_part);
    Some(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_main_shortcut() {
        assert_eq!(
            tauri_style_to_xdg_trigger("CommandOrControl+Shift+X").as_deref(),
            Some("<Primary><Shift>x")
        );
    }

    #[test]
    fn maps_settings_shortcut() {
        assert_eq!(
            tauri_style_to_xdg_trigger("CommandOrControl+,").as_deref(),
            Some("<Primary>comma")
        );
    }
}
```

- [ ] **Step 2: Run tests before implementation**

Run:

```bash
cd /home/yule/Sides/typo/src-tauri && cargo test tauri_style_to_xdg_trigger -- --exact
```

Expected: **FAIL** (missing module / function).

- [ ] **Step 3: Add module + implementation**

Create `accelerator_xdg.rs` with the code from Step 1 (tests included), add `mod accelerator_xdg` in `lib.rs` under `#[cfg(target_os = "linux")]` **or** without cfg if you want tests on macOS CI — recommended: **no cfg on mod** so `cargo test` runs mapping tests everywhere.

- [ ] **Step 4: Run tests**

Run:

```bash
cd /home/yule/Sides/typo/src-tauri && cargo test tauri_style_to_xdg_trigger -- --exact
```

Expected: **PASS**.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/accelerator_xdg.rs src-tauri/src/lib.rs && git commit -m "feat(linux): map Typo accelerators to XDG shortcut triggers"
```

---

### Task 3: Vitest + pure TS policy helper

**Files:**

- Create: `src/shortcut_policy.ts`
- Create: `vitest.config.ts`
- Modify: `package.json` (add `vitest`, `happy-dom`, script `"test": "vitest run"`)

- [ ] **Step 1: Add devDependencies**

Run:

```bash
cd /home/yule/Sides/typo && pnpm add -D vitest happy-dom @vitejs/plugin-vue
```

(If `@vitejs/plugin-vue` is already present, omit duplicate.)

- [ ] **Step 2: Write `vitest.config.ts`**

```ts
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.spec.ts'],
  },
})
```

- [ ] **Step 3: Write failing test `src/shortcut_policy.spec.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { shouldRegisterPluginGlobalShortcuts } from './shortcut_policy'

describe('shouldRegisterPluginGlobalShortcuts', () => {
  it('returns false when portal owns shortcuts', () => {
    expect(
      shouldRegisterPluginGlobalShortcuts({
        backend: 'portal',
        plugin_fallback_attempted: false,
        error_message: null,
      }),
    ).toBe(false)
  })

  it('returns true when plugin path is active', () => {
    expect(
      shouldRegisterPluginGlobalShortcuts({
        backend: 'plugin',
        plugin_fallback_attempted: true,
        error_message: null,
      }),
    ).toBe(true)
  })
})
```

- [ ] **Step 4: Run Vitest (expect failure)**

Run:

```bash
cd /home/yule/Sides/typo && pnpm exec vitest run src/shortcut_policy.spec.ts
```

Expected: **FAIL** (`shouldRegisterPluginGlobalShortcuts` not exported).

- [ ] **Step 5: Implement `src/shortcut_policy.ts`**

```ts
export type ShortcutRegistrationBackend = 'portal' | 'plugin' | 'none'

export interface ShortcutRegistrationStatus {
  backend: ShortcutRegistrationBackend
  plugin_fallback_attempted: boolean
  error_message: string | null
}

export function shouldRegisterPluginGlobalShortcuts(
  s: ShortcutRegistrationStatus,
): boolean {
  return s.backend === 'plugin'
}
```

- [ ] **Step 6: Re-run Vitest**

Run:

```bash
pnpm exec vitest run src/shortcut_policy.spec.ts
```

Expected: **PASS**.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts src/shortcut_policy.ts src/shortcut_policy.spec.ts && git commit -m "test: add vitest and shortcut_policy helper"
```

---

### Task 4: `ShortcutRegistrationStatus` + `get_shortcut_registration_status` command

**Files:**

- Create: `src-tauri/src/shortcut_status.rs` (serde struct + `OnceLock` or `Mutex` holder)
- Modify: `src-tauri/src/lib.rs` — register command, initialize status to `none` before setup

- [ ] **Step 1: Write failing Rust test for JSON shape**

In `shortcut_status.rs`:

```rust
use serde::Serialize;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ShortcutRegistrationBackend {
    None,
    Portal,
    Plugin,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct ShortcutRegistrationStatus {
    pub backend: ShortcutRegistrationBackend,
    pub plugin_fallback_attempted: bool,
    pub error_message: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_snake_case() {
        let s = ShortcutRegistrationStatus {
            backend: ShortcutRegistrationBackend::Portal,
            plugin_fallback_attempted: false,
            error_message: None,
        };
        let v = serde_json::to_value(&s).unwrap();
        assert_eq!(v["backend"], "portal");
    }
}
```

- [ ] **Step 2: Run test (fail until mod wired)**

```bash
cd /home/yule/Sides/typo/src-tauri && cargo test serializes_snake_case -- --exact
```

Expected: **FAIL** if module not in `lib.rs`.

- [ ] **Step 3: Add `mod shortcut_status;` and minimal `get_shortcut_registration_status` command**

```rust
// in lib.rs
mod shortcut_status;

use shortcut_status::ShortcutRegistrationStatus;
use std::sync::Mutex;

static SHORTCUT_STATUS: Mutex<ShortcutRegistrationStatus> = Mutex::new(
    ShortcutRegistrationStatus {
        backend: shortcut_status::ShortcutRegistrationBackend::None,
        plugin_fallback_attempted: false,
        error_message: None,
    },
);

#[tauri::command]
fn get_shortcut_registration_status() -> ShortcutRegistrationStatus {
    SHORTCUT_STATUS.lock().unwrap().clone()
}
```

Register in `generate_handler![..., get_shortcut_registration_status]`.

Export `ShortcutRegistrationBackend` from `shortcut_status.rs` as above.

- [ ] **Step 4: Run tests + compile**

```bash
cd /home/yule/Sides/typo/src-tauri && cargo test serializes_snake_case -- --exact && cargo check
```

Expected: **PASS**.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/shortcut_status.rs src-tauri/src/lib.rs && git commit -m "feat: expose shortcut registration status to frontend"
```

---

### Task 5: Linux Portal bind + activated stream → Tauri emit

**Files:**

- Create: `src-tauri/src/linux_global_shortcuts.rs`
- Modify: `src-tauri/src/lib.rs` — `setup` hook to `spawn` this module’s entry only when `session_linux::session_kind_from_env() == Wayland`
- Modify: `src-tauri/Cargo.toml`:

```toml
[target.'cfg(target_os = "linux")'.dependencies]
ashpd = { version = "0.13.9", default-features = false, features = ["tokio", "wayland"] }
futures-util = "0.3.31"
```

(Patch `0.13.9` to the latest 0.13.x if lockfile resolves newer patch.)

- [ ] **Step 1: Write `#[ignore]` integration test skeleton**

In `linux_global_shortcuts.rs`:

```rust
#[cfg(all(test, target_os = "linux"))]
mod portal_smoke {
    #[tokio::test]
    #[ignore = "requires interactive Wayland session with xdg-desktop-portal"]
    async fn global_shortcuts_new_succeeds_on_wayland_desktop() {
        let gs = ashpd::desktop::global_shortcuts::GlobalShortcuts::new().await;
        assert!(gs.is_ok(), "{:?}", gs.err());
    }
}
```

Run:

```bash
cd /home/yule/Sides/typo/src-tauri && cargo test global_shortcuts_new_succeeds -- --exact --ignored
```

Expected on CI without portal: may **FAIL** inside test body — that is acceptable for `--ignored`; default `cargo test` must **PASS** (ignored tests not run).

- [ ] **Step 2: Implement `pub async fn try_register_portal(app: tauri::AppHandle) -> Result<(), String>`**

Implementation outline (real code for engineer to paste and adjust types against `cargo check`):

```rust
use ashpd::desktop::global_shortcuts::{BindShortcutsOptions, GlobalShortcuts, NewShortcut};
use ashpd::desktop::session::CreateSessionOptions;
use ashpd::WindowIdentifier;
use futures_util::StreamExt;
use raw_window_handle::{HasDisplayHandle, HasWindowHandle};
use tauri::Manager;
use crate::accelerator_xdg::typo_default_accelerators_to_xdg;
use crate::shortcut_status::{ShortcutRegistrationBackend, ShortcutRegistrationStatus};
use crate::SHORTCUT_STATUS;

fn set_status(s: ShortcutRegistrationStatus) {
    *SHORTCUT_STATUS.lock().unwrap() = s;
}

pub async fn try_register_portal(app: tauri::AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "missing main webview window".to_string())?;

    let (tx, rx) = std::sync::mpsc::sync_channel::<Result<(raw_window_handle::RawWindowHandle, raw_window_handle::RawDisplayHandle), String>>(1);
    let win = window.clone();
    window
        .run_on_main_thread(move || {
            let res = (|| {
                let wh = win.window_handle().map_err(|e| e.to_string())?.as_raw();
                let dh = win.display_handle().map_err(|e| e.to_string())?.as_raw();
                Ok((wh, dh))
            })();
            let _ = tx.send(res);
        })
        .map_err(|e| e.to_string())?;

    let (raw_window, raw_display) = tokio::task::spawn_blocking(move || {
        let inner = rx.recv().map_err(|_| "window handle channel closed".to_string())?;
        inner.map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())??;

    let identifier = WindowIdentifier::from_raw_handle(&raw_window, Some(&raw_display))
        .await
        .ok_or_else(|| "WindowIdentifier::from_raw_handle returned None".to_string())?;

    let gs = GlobalShortcuts::new()
        .await
        .map_err(|e| format!("GlobalShortcuts::new: {e}"))?;

    let session = gs
        .create_session(CreateSessionOptions::default())
        .await
        .map_err(|e| format!("create_session: {e}"))?;

    let shortcuts: Vec<NewShortcut> = typo_default_accelerators_to_xdg()
        .into_iter()
        .map(|(id, desc, trigger)| {
            NewShortcut::new(id, desc).preferred_trigger(Some(trigger))
        })
        .collect();

    let mut bind_request = gs
        .bind_shortcuts(&session, &shortcuts, Some(&identifier), BindShortcutsOptions::default())
        .await
        .map_err(|e| format!("bind_shortcuts: {e}"))?;

    let _bound = bind_request
        .response()
        .map_err(|e| format!("bind_shortcuts response: {e}"))?;

    set_status(ShortcutRegistrationStatus {
        backend: ShortcutRegistrationBackend::Portal,
        plugin_fallback_attempted: false,
        error_message: None,
    });

    let app_for_task = app.clone();
    tauri::async_runtime::spawn(async move {
        let mut stream = match gs.receive_activated().await {
            Ok(s) => s,
            Err(e) => {
                tracing::error!("receive_activated: {e}");
                return;
            }
        };
        while let Some(ev) = stream.next().await {
            let id = ev.shortcut_id();
            let payload = if id == "typo.open_main" {
                "main"
            } else if id == "typo.open_settings" {
                "settings"
            } else {
                continue;
            };
            let _ = app_for_task.emit("typo-global-shortcut", payload);
        }
    });

    Ok(())
}
```

Notes for implementer:

- Add `raw-window-handle` as a **Linux-only** direct dependency if Tauri’s re-export is insufficient for `RawWindowHandle` / `RawDisplayHandle` paths in your toolchain version.
- Replace `tracing::error!` with `eprintln!` if you do not add `tracing` dependency; keep **one** style project-wide.
- Tauri 2 `emit` signature may be `app.emit(...)` or `app.emit_to(...)` — use whatever `cargo check` accepts for broadcasting to the main window’s webview.
- **Leak / lifetime:** keep `gs` and `session` alive inside the spawned task (e.g. `move` them into the same `spawn` block as the stream, before the `while let` loop) so the portal session is not dropped until app exit.

- [ ] **Step 3: Wire `setup` in `lib.rs`**

```rust
.setup(|app| {
    #[cfg(target_os = "linux")]
    {
        if session_linux::session_kind_from_env() == session_linux::SessionKind::Wayland {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = linux_global_shortcuts::try_register_portal(handle.clone()).await {
                    *SHORTCUT_STATUS.lock().unwrap() = ShortcutRegistrationStatus {
                        backend: ShortcutRegistrationBackend::None,
                        plugin_fallback_attempted: false,
                        error_message: Some(e),
                    };
                }
            });
        }
    }
    Ok(())
})
```

- [ ] **Step 4: `cargo check` on Linux**

```bash
cd /home/yule/Sides/typo/src-tauri && cargo check
```

Expected: **PASS** (fix API drift until clean).

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/linux_global_shortcuts.rs src-tauri/src/lib.rs src-tauri/Cargo.toml src-tauri/Cargo.lock && git commit -m "feat(linux): bind global shortcuts via XDG portal on Wayland"
```

---

### Task 6: Plugin fallback + status updates + emit unification

**Files:**

- Modify: `src-tauri/src/lib.rs` — after portal failure on Wayland, set `plugin_fallback_attempted: true`, optionally call into `tauri_plugin_global_shortcut` from Rust **or** leave plugin to frontend only — **this plan chooses frontend plugin** for fallback to avoid duplicating handler logic: set status to `Plugin` with `error_message: None` when frontend successfully registers.

- Modify: `src/shortcut.ts` — on mount:

  1. `const status = await invoke<ShortcutRegistrationStatus>('get_shortcut_registration_status')`
  2. If `status.backend === 'none'` and `session` is Wayland (expose `get_session_kind` command or encode in status), call `register` as today.
  3. If `status.backend === 'portal'`, skip `register`, add `listen('typo-global-shortcut', handler)`.
  4. If portal failed (`error_message` set, backend none), call `register` and on success invoke new command `shortcut_mark_plugin_active` that sets backend to `Plugin` and `plugin_fallback_attempted: true`.

Add commands:

```rust
#[tauri::command]
fn shortcut_mark_plugin_active() {
    *SHORTCUT_STATUS.lock().unwrap() = ShortcutRegistrationStatus {
        backend: ShortcutRegistrationBackend::Plugin,
        plugin_fallback_attempted: true,
        error_message: None,
    };
}

#[cfg(target_os = "linux")]
#[tauri::command]
fn get_session_kind() -> String {
    match session_linux::session_kind_from_env() {
        session_linux::SessionKind::Wayland => "wayland".into(),
        session_linux::SessionKind::X11 => "x11".into(),
        session_linux::SessionKind::Unknown => "unknown".into(),
    }
}

#[cfg(not(target_os = "linux"))]
#[tauri::command]
fn get_session_kind() -> String {
    "unsupported".into()
}
```

- [ ] **Step 1: Refactor `src/shortcut.ts` handlers into named async functions** so both `register` callbacks and `listen` reuse them.

Example structure:

```ts
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import type { ShortcutRegistrationStatus } from './shortcut_policy'
import { shouldRegisterPluginGlobalShortcuts } from './shortcut_policy'

async function onMainShortcutReleased() { /* body moved from existing register callback */ }
async function onSettingsShortcutReleased() { /* ... */ }

export async function setupGlobalShortcut() {
  const status = await invoke<ShortcutRegistrationStatus>('get_shortcut_registration_status')
  await listen<string>('typo-global-shortcut', async (e) => {
    if (e.payload === 'main')
      await onMainShortcutReleased()
    else if (e.payload === 'settings')
      await onSettingsShortcutReleased()
  })

  if (!shouldRegisterPluginGlobalShortcuts(status))
    return

  // existing isRegistered / unregister / register flow, then:
  await invoke('shortcut_mark_plugin_active')
}
```

Align `ShortcutRegistrationStatus` TypeScript type with Rust serde field names (`snake_case`).

- [ ] **Step 2: Run typecheck**

```bash
cd /home/yule/Sides/typo && pnpm exec vue-tsc --noEmit
```

Expected: **PASS**.

- [ ] **Step 3: Run Vitest**

```bash
pnpm test
```

Expected: **PASS**.

- [ ] **Step 4: Commit**

```bash
git add src/shortcut.ts src-tauri/src/lib.rs src/shortcut_policy.ts && git commit -m "feat: unify portal and plugin global shortcut dispatch"
```

---

### Task 7: Degraded state UI + optional startup notification

**Files:**

- Modify: `src/windows/Settings.vue` — top of form: `Alert` when `error_message` or `(backend === 'none' && session === 'wayland')` after refresh.
- Modify: `src/App.vue` — `onMounted`: if status reports failure, `import('@tauri-apps/plugin-notification')` then `Notification` banner (optional if permission noisy — then Settings-only is enough per spec).

- [ ] **Step 1: Add status fetch in Settings `onMounted`**

```ts
const shortcutStatus = ref<ShortcutRegistrationStatus | null>(null)
onMounted(async () => {
  shortcutStatus.value = await invoke('get_shortcut_registration_status')
  // ...existing onMounted...
})
```

- [ ] **Step 2: Template block**

Use existing `@/components/ui/alert` to show `shortcutStatus?.error_message` or static text linking to README anchor `#wayland-global-shortcuts-typo`.

- [ ] **Step 3: Run `vue-tsc`**

```bash
pnpm exec vue-tsc --noEmit
```

Expected: **PASS**.

- [ ] **Step 4: Commit**

```bash
git add src/windows/Settings.vue src/App.vue && git commit -m "feat: surface Wayland shortcut registration errors in UI"
```

---

### Task 8: README + capabilities if needed

**Files:**

- Modify: `README.md` — new section **Wayland: Typo’s own global shortcuts** with Portal requirement, link to freedesktop GlobalShortcuts portal, note GNOME/KDE version caveats, env-var limitations.
- Modify: `src-tauri/capabilities/desktop.json` only if `emit` / `event:default` is not already allowed for `typo-global-shortcut` (Tauri 2 often allows app events by default — verify and add explicit permission if `cargo tauri dev` logs a capability denial).

- [ ] **Step 1: Append README section** (concrete markdown text is left to implementer but must include anchor `wayland-global-shortcuts-typo` as `## Wayland: Typo global shortcuts` with HTML comment id if needed).

- [ ] **Step 2: Manual smoke**

Run on Wayland desktop:

```bash
cd /home/yule/Sides/typo && pnpm tauri dev
```

Expected: first bind may show portal UI; after accept, shortcut triggers main window behavior; Settings shows `portal` backend when status polled.

- [ ] **Step 3: Commit**

```bash
git add README.md src-tauri/capabilities/desktop.json && git commit -m "docs: Wayland portal global shortcuts for Typo"
```

---

### Task 9: Final verification gate

- [ ] **Step 1: Rust**

```bash
cd /home/yule/Sides/typo/src-tauri && cargo test && cargo clippy -- -D warnings
```

Expected: **PASS** (fix clippy or adjust code).

- [ ] **Step 2: Frontend**

```bash
cd /home/yule/Sides/typo && pnpm test && pnpm run build:frontend
```

Expected: **PASS**.

- [ ] **Step 3: Optional full Tauri build (Linux)**

```bash
pnpm tauri build
```

Expected: **PASS** on Ubuntu runner matching `release.yml` deps.

- [ ] **Step 4: Commit** (only if fixes were needed)

```bash
git add -A && git commit -m "chore: fix clippy and shortcut integration nits"
```

---

## Plan self-review (spec coverage)

| Spec section | Task coverage |
|--------------|---------------|
| §4.1 Session + expose summary | Task 1, 4, 6 (`get_session_kind` / status) |
| §4.2 Binding order Portal → unified → plugin → error | Tasks 5, 6 |
| §4.3 Single owner, no double register | Tasks 3, 6 |
| §5 Errors + README | Tasks 7, 8 |
| §6 CI | Task 9 (no workflow change expected) |

**Placeholder scan:** No `TBD` / `implement later` in this plan file.

**Type consistency:** `ShortcutRegistrationStatus` must match between Rust (`serde` snake_case), TS interface in `shortcut_policy.ts`, and `invoke` generics in `shortcut.ts` / `Settings.vue`.

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-14-linux-wayland-global-shortcuts.md`. Two execution options:**

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration. **REQUIRED SUB-SKILL:** superpowers:subagent-driven-development.

2. **Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints. **REQUIRED SUB-SKILL:** superpowers:executing-plans.

**Which approach do you want?**
