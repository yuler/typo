# Desktop App Auto-start Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Auto-start" (Launch at login) option to the desktop application settings.

**Architecture:** We use the official `tauri-plugin-autostart` to handle cross-platform auto-start logic. The setting is persisted in the app's lazy store and synchronized with the system state on startup and toggle.

**Tech Stack:** Tauri 2.0, Rust, Vue 3, TypeScript, `tauri-plugin-autostart`.

---

### Task 1: Backend Setup (Rust)

**Files:**
- Modify: `apps/desktop/src-tauri/Cargo.toml`
- Modify: `apps/desktop/src-tauri/src/lib.rs`

- [ ] **Step 1: Add dependency to Cargo.toml**
    Add `tauri-plugin-autostart = "2.0"` to the `[dependencies]` section.
- [ ] **Step 2: Initialize plugin in lib.rs**
    Import and initialize the plugin in the `run()` function.
    ```rust
    // apps/desktop/src-tauri/src/lib.rs
    .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec!["--minimized"])))
    ```
- [ ] **Step 3: Verify build**
    Run `cargo check` in `apps/desktop/src-tauri` to ensure dependencies are resolved and code compiles.
- [ ] **Step 4: Commit**
    ```bash
    git add apps/desktop/src-tauri/Cargo.toml apps/desktop/src-tauri/src/lib.rs
    git commit -m "feat(desktop): add tauri-plugin-autostart backend"
    ```

### Task 2: Frontend Setup & Store Update

**Files:**
- Modify: `apps/desktop/package.json`
- Modify: `apps/desktop/src/store.ts`

- [ ] **Step 1: Install frontend plugin**
    Run `pnpm add @tauri-apps/plugin-autostart` in `apps/desktop`.
- [ ] **Step 2: Update DEFAULT_STORE in store.ts**
    Add `autostart: false` to `DEFAULT_STORE`.
    ```typescript
    const DEFAULT_STORE = {
      autoselect: false,
      autostart: false, // Add this
      // ...
    }
    ```
- [ ] **Step 3: Commit**
    ```bash
    git add apps/desktop/package.json apps/desktop/src/store.ts
    git commit -m "feat(desktop): add autostart to store and install frontend plugin"
    ```

### Task 3: Localization

**Files:**
- Modify: `apps/desktop/src/locales/en.json`
- Modify: `apps/desktop/src/locales/zh.json`
- Modify: `apps/desktop/src/locales/jp.json`

- [ ] **Step 1: Add English translations**
    Add `settings.basic.autostart.label` and `settings.basic.autostart.description`.
- [ ] **Step 2: Add Chinese translations**
- [ ] **Step 3: Add Japanese translations**
- [ ] **Step 4: Commit**
    ```bash
    git add apps/desktop/src/locales/*.json
    git commit -m "feat(desktop): add autostart localization"
    ```

### Task 4: Settings UI Implementation

**Files:**
- Modify: `apps/desktop/src/windows/Settings.vue`

- [ ] **Step 1: Import autostart API**
    ```typescript
    import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart'
    ```
- [ ] **Step 2: Add autostart to form and sync on mount**
    In `onMounted`, check `isEnabled()` and update `form.value.autostart`.
- [ ] **Step 3: Implement toggle logic**
    Add a watcher or a change handler for the autostart switch that calls `enable()` or `disable()`.
- [ ] **Step 4: Add UI element**
    Insert the Switch component for autostart in the "Basic" tab.
- [ ] **Step 5: Commit**
    ```bash
    git add apps/desktop/src/windows/Settings.vue
    git commit -m "feat(desktop): implement autostart toggle in settings UI"
    ```

### Task 5: Final Verification

- [ ] **Step 1: Manual Test (macOS/Windows/Linux)**
    Run the app, go to settings, toggle the switch, and verify system settings.
- [ ] **Step 2: Verify Persistence**
    Restart the app and ensure the toggle state matches the system state.
- [ ] **Step 3: Commit**
    ```bash
    git commit --allow-empty -m "test(desktop): verify autostart functionality"
    ```
