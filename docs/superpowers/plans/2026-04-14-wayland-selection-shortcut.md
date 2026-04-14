# Linux Wayland `typo --selection` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On Linux Wayland, use a system custom shortcut bound to `typo --selection` to capture selection via `Ctrl+C` + clipboard read and feed it into Typo's existing flow; other platforms keep current behavior.

**Architecture:** Add a CLI flag `--selection` that is forwarded to the running instance via Tauri single-instance, then handle it centrally in Rust by simulating `Ctrl+C`, reading the clipboard, and emitting the same UI event used by the existing global shortcut path. Gate behavior to Linux Wayland and reduce reliance on plugin global shortcuts for that environment.

**Tech Stack:** Tauri (Rust), Vue (TypeScript), `tauri-plugin-single-instance`, `tauri-plugin-clipboard-manager`, `enigo` for synthetic key events.

---

## File structure (planned changes)

**Modify**

- `src-tauri/src/lib.rs`: parse `--selection` from argv; implement Linux Wayland selection capture pipeline; forward captured text to frontend.
- `src/shortcut.ts`: gate global shortcut registration/behavior for Linux Wayland (keep non-Wayland unchanged).
- `src/App.vue`: fetch session info on startup if needed to drive shortcut gating or UI messaging.
- `README.md`: add explicit steps for system custom shortcuts on Linux Wayland.

**Potential add**

- `src-tauri/src/platform.rs` (or similar): small helper utilities for session detection + argument parsing (only if `lib.rs` gets unwieldy).

## Task 1: Detect Linux Wayland session reliably

**Files:**

- Modify: `src-tauri/src/lib.rs`
- **Step 1: Add a helper function for Wayland detection**

Implement a best-effort Wayland check without external deps:

```rust
fn is_linux_wayland_session() -> bool {
    if !cfg!(target_os = "linux") {
        return false;
    }
    // Common indicators:
    // - WAYLAND_DISPLAY is set in native Wayland sessions
    // - XDG_SESSION_TYPE may be "wayland"
    let wayland_display = std::env::var_os("WAYLAND_DISPLAY").is_some();
    let session_type = std::env::var("XDG_SESSION_TYPE").ok().unwrap_or_default();
    wayland_display || session_type.eq_ignore_ascii_case("wayland")
}
```

- **Step 2: Add a debug log when Wayland path is active**

Add a `println!` (or `log` if project already uses it) at app startup:

```rust
println!("is_linux_wayland_session={}", is_linux_wayland_session());
```

- **Step 3: Build to ensure no Rust errors**

Run: `pnpm -C src-tauri tauri build` (or project’s existing build command)  
Expected: compilation succeeds.

- **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat(linux): detect Wayland session for selection flow"
```

## Task 2: Implement selection capture via `Ctrl+C` + clipboard read

**Files:**

- Modify: `src-tauri/src/lib.rs`
- **Step 1: Implement a synchronous copy-to-clipboard function**

Add a function that:

1. sends `Ctrl+C` via enigo
2. sleeps 80-150ms
3. reads clipboard text from a window or app handle

Example shape:

```rust
fn copy_selection_and_read_clipboard(window: &tauri::Window) -> Result<String, String> {
    let mut enigo = enigo::Enigo::new(&enigo::Settings::default()).map_err(|e| e.to_string())?;

    // Ctrl + C
    enigo.key(enigo::Key::Control, enigo::Direction::Press).map_err(|e| e.to_string())?;
    enigo.key(enigo::Key::Unicode('c'), enigo::Direction::Click).map_err(|e| e.to_string())?;
    enigo.key(enigo::Key::Control, enigo::Direction::Release).map_err(|e| e.to_string())?;

    std::thread::sleep(std::time::Duration::from_millis(120));

    let text = window.clipboard().read_text().unwrap_or_default();
    Ok(text)
}
```

- **Step 2: Add bounded retry to mitigate clipboard race**

If first read is empty, wait and try once more:

```rust
let mut text = window.clipboard().read_text().unwrap_or_default();
if text.trim().is_empty() {
    std::thread::sleep(std::time::Duration::from_millis(120));
    text = window.clipboard().read_text().unwrap_or_default();
}
```

- **Step 3: Surface failures as notifications**

Use the existing notification plugin (`NotificationExt`) to show actionable feedback on:

- synthetic copy failure
- empty result after retries

Expected messages:

- “No selected text captured. Make sure the target app supports Ctrl+C.”
- “Failed to read clipboard text.”
- **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat(linux-wayland): capture selection via Ctrl+C and clipboard"
```

## Task 3: Add `--selection` argv handling and single-instance forwarding

**Files:**

- Modify: `src-tauri/src/lib.rs`
- **Step 1: Parse argv for `--selection`**

Inside the single-instance callback `tauri_plugin_single_instance::init(|app, argv, _cwd| { ... })`:

- detect `argv.iter().any(|a| a == "--selection")`
- if present and `is_linux_wayland_session()` is true, call a handler.
- **Step 2: Handle cold start (first instance)**

Add startup-time argv read (from `std::env::args()` early in `run()` before `.run(...)`) and store a boolean like `startup_selection = ...`.

After the app is ready (best place is after window exists), trigger the same handler if `startup_selection` is true.

Implementation detail options (pick one and keep it simple):

- Use `tauri::App::run` `RunEvent::Ready` or similar hook to ensure windows exist.
- Or, in `setup` closure if already present in the project.
- **Step 3: Implement the shared handler**

Shared function (example):

```rust
fn handle_selection_trigger(app: &tauri::AppHandle) {
    // 1) Get main window
    // 2) Make sure it’s visible / focused if required by UX
    // 3) Perform copy + clipboard read
    // 4) Emit to frontend: "set-input" { text, mode: "selected" }
}
```

Emit payload should match existing usage:

- event name: `set-input`
- payload shape: `{ text: string, mode: "selected" }`
- **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat(cli): handle typo --selection via single-instance argv"
```

## Task 4: Gate Typo internal global shortcut on Linux Wayland

**Files:**

- Modify: `src/shortcut.ts`
- Modify: `src/App.vue`
- **Step 1: Add a backend command for session info (if needed)**

If frontend cannot reliably know Wayland session, add a Tauri command returning:

- OS (`linux`, `macos`, `windows`)
- `is_wayland` boolean (based on `is_linux_wayland_session()`)

Example:

```rust
#[derive(serde::Serialize)]
struct SessionInfo {
    os: String,
    is_wayland: bool,
}

#[tauri::command]
fn get_session_info() -> SessionInfo {
    SessionInfo {
        os: std::env::consts::OS.to_string(),
        is_wayland: is_linux_wayland_session(),
    }
}
```

- **Step 2: In `App.vue`, fetch session info on mount**

Call `invoke('get_session_info')` and stash in a small store or module variable.

- **Step 3: In `setupGlobalShortcut`, skip registering DEFAULT shortcut on Linux Wayland**

Pseudo:

```ts
if (sessionInfo.os === 'linux' && sessionInfo.is_wayland) {
  // still allow settings shortcut if desired, but do not depend on Ctrl+Shift+X
  return
}
```

- **Step 4: Commit**

```bash
git add src/App.vue src/shortcut.ts src-tauri/src/lib.rs
git commit -m "feat(linux-wayland): prefer system shortcut over plugin global shortcut"
```

## Task 5: Update documentation for Linux Wayland system custom shortcut

**Files:**

- Modify: `README.md`
- **Step 1: Add explicit steps**

In the Wayland section, add:

- path: `Settings -> Keyboard -> Custom Shortcuts`
- command: `typo --selection`
- keys: `Ctrl + Shift + X`
- clarify this is only for Linux Wayland
- **Step 2: Add troubleshooting notes**
- selection empty → target app doesn’t support `Ctrl+C` or blocks synthetic events
- clipboard read issues → ensure clipboard portal / permissions as needed
- **Step 3: Commit**

```bash
git add README.md
git commit -m "docs(linux-wayland): document system custom shortcut for typo --selection"
```

## Task 6: Verification (no regressions)

**Files:**

- N/A (commands only)
- **Step 1: Build**

Run: `pnpm install` (if needed)  
Run: `pnpm dev` and/or `pnpm -C src-tauri tauri build`

Expected:

- App launches
- No Rust compile errors
- No TS build errors
- **Step 2: Manual smoke tests**

Linux Wayland:

- Bind system shortcut to `typo --selection`
- Test both “Typo running” and “Typo not running”

Non-Wayland:

- Verify existing `Ctrl/Cmd + Shift + X` still works as before
- **Step 3: Final commit if any fixes**

```bash
git status
```

