# Spec: Desktop App Auto-start (Launch at login)

## 1. Objective
Add an "Auto-start" (Launch at login) option to the desktop application settings. This allows users to choose whether the application should automatically start when they log into their computer (macOS, Windows, or Linux).

## 2. Requirements
- Support macOS (Login Items), Windows (Registry), and Linux (.desktop files).
- Provide a toggle in the "Settings" window under the "Basic" tab.
- Persist the user preference in the application's store.
- Sync the system-level auto-start state with the application's internal state.
- Handle potential errors (e.g., permission issues on macOS).

## 3. Implementation Plan

### 3.1. Backend (Rust/Tauri)
- Add `tauri-plugin-autostart` to `apps/desktop/src-tauri/Cargo.toml`.
- Initialize the plugin in `apps/desktop/src-tauri/src/lib.rs`.
- Ensure the plugin is configured to handle different platforms correctly.

### 3.2. Data Store (TypeScript)
- Update `apps/desktop/src/store.ts` to include an `autostart` field in `DEFAULT_STORE`.
- Default value: `false`.

### 3.3. Frontend (Vue)
- Install `@tauri-apps/plugin-autostart` package.
- Update `apps/desktop/src/windows/Settings.vue`:
    - Import `enable`, `disable`, and `isEnabled` from `@tauri-apps/plugin-autostart`.
    - Add an "Auto-start" toggle switch in the "Basic" settings section.
    - Synchronize the switch state with the system's auto-start status on component mount.
    - Call `enable()` or `disable()` when the user toggles the switch.

### 3.4. Localization (i18n)
- Add new translation keys to `apps/desktop/src/locales/en.json`, `zh.json`, and `jp.json`:
    - `settings.basic.autostart.label`: "Launch at login" / "开机自启动" / "ログイン時に起動"
    - `settings.basic.autostart.description`: "Automatically start the app when you log in." / "登录系统时自动启动应用。" / "ログイン時にアプリを自動的に起動します。"

## 4. Technical Details

### Dependencies
- Cargo: `tauri-plugin-autostart = "2.0"`
- NPM: `@tauri-apps/plugin-autostart`

### Security/Permissions
- On macOS, the user might need to grant permission or the app might be listed in "Login Items".
- On Windows, it adds an entry to `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`.

## 5. Testing Strategy
- **macOS**: Toggle the setting and verify the app appears/disappears in System Settings -> General -> Login Items.
- **Windows**: Toggle the setting and verify the app appears/disappears in Task Manager -> Startup tab.
- **Linux**: Toggle the setting and verify the `.desktop` file in `~/.config/autostart/`.
- **Persistence**: Ensure the setting is remembered after restarting the application.
