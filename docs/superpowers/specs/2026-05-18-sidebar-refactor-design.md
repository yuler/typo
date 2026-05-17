# Design Spec: Sidebar & Settings UI Refactor

## 1. Goal
Refactor the desktop application's navigation and settings UI to move away from dialog-based settings. Instead, settings will be integrated directly into the sidebar navigation and main content area.

## 2. Requirements
- **Sidebar Reorganization**:
  - Two main groups: **WORKSPACE** and **PREFERENCES**.
  - **WORKSPACE** Group: `Main`, `History`.
  - **PREFERENCES** Group: `Basic`, `Appearance`, `Prompts`.
- **Navigation Flow**:
  - Clicking a sidebar item switches the main content area using `activeTab`.
  - Remove the `isSettingsOpen` dialog logic from `Main.vue`.
- **Component Refactoring**:
  - Split `AppSettings.vue` into:
    - `BasicSettings.vue`: Behavioral settings (Launch at login, Auto select, Copy result, Global Shortcut, Logs).
    - `AppearanceSettings.vue`: UI settings (Language, AI Provider).
    - `PromptsSettings.vue`: AI logic (System Prompt, Slash Commands).
- **Internationalization (i18n)**:
  - Add/Update keys for the new groups and navigation items.

## 3. Architecture & Components

### 3.1 Sidebar Navigation (`AppSidebar.vue`)
- Update `navItems` structure to support grouping.
- Group 1: `WORKSPACE`
  - `main`: HomeIcon
  - `history`: HistoryIcon
- Group 2: `PREFERENCES`
  - `basic`: Settings2Icon (renamed from General)
  - `appearance`: PaletteIcon (new)
  - `prompts`: MessageSquareIcon (new)

### 3.2 Main Content Area (`Main.vue`)
- Update `activeTab` to handle all 5 views.
- Render corresponding components based on `activeTab`:
  - `main` -> `AppHome.vue`
  - `history` -> (Existing history view logic)
  - `basic` -> `BasicSettings.vue`
  - `appearance` -> `AppearanceSettings.vue`
  - `prompts` -> `PromptsSettings.vue`

### 3.3 Settings Components
- **`BasicSettings.vue`**:
  - Autostart toggle.
  - Autoselect toggle.
  - Copy result toggle.
  - Global Shortcut capture.
  - Open Log folder button.
- **`AppearanceSettings.vue`**:
  - Locale selection (Select).
  - AI Provider selection (Select).
  - Provider-specific config (Ollama Model selection, DeepSeek API Key).
- **`PromptsSettings.vue`**:
  - System Prompt (Textarea).
  - Slash Commands (List of items with key, aliases, and value).

## 4. Implementation Details

### 4.1 I18n Keys
New keys to be added to `en.json`, `zh.json`, and `jp.json`:
- `main.sidebar.workspace`: "WORKSPACE" / "工作区"
- `main.sidebar.preferences`: "PREFERENCES" / "偏好设置"
- `main.nav.basic`: "Basic" / "通用"
- `main.nav.appearance`: "Appearance" / "外观"
- `main.nav.prompts`: "Prompts" / "提示词"

### 4.2 State Management
- Continue using `src/stores/settings.ts` for persistence.
- Components will read and write to the store directly (via `store.get` / `store.set`).

## 5. Success Criteria
- [ ] Sidebar shows two groups: WORKSPACE and PREFERENCES.
- [ ] All 5 navigation items correctly switch the main content area.
- [ ] No more settings dialog pops up.
- [ ] All settings (Basic, Appearance, Prompts) are fully functional and persist correctly.
- [ ] I18n works correctly across all new items.
