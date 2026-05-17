# Sidebar & Settings UI Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the desktop navigation to move settings from a dialog into the main content area with a reorganized sidebar.

**Architecture:** Split `AppSettings.vue` into three sub-components (`BasicSettings`, `AppearanceSettings`, `PromptsSettings`) and integrate them into the `Main.vue` navigation flow using `v-if` based on `activeTab`.

**Tech Stack:** Vue 3, TypeScript, Tailwind CSS, Lucide icons, Shadcn UI (components).

---

### Task 1: Internationalization Updates

**Files:**
- Modify: `apps/desktop/src/locales/en.json`
- Modify: `apps/desktop/src/locales/zh.json`
- Modify: `apps/desktop/src/locales/jp.json`

- [ ] **Step 1: Add new i18n keys for navigation and groups**

Update `apps/desktop/src/locales/en.json`:
```json
{
  "main.sidebar.workspace": "WORKSPACE",
  "main.sidebar.preferences": "PREFERENCES",
  "main.nav.basic": "Basic",
  "main.nav.appearance": "Appearance",
  "main.nav.prompts": "Prompts"
}
```

- [ ] **Step 2: Update zh.json and jp.json with corresponding translations**

- [ ] **Step 3: Commit**
```bash
git add apps/desktop/src/locales/*.json
git commit -m "i18n: add sidebar group and navigation keys"
```

---

### Task 2: Create `BasicSettings.vue`

**Files:**
- Create: `apps/desktop/src/components/BasicSettings.vue`

- [ ] **Step 1: Extract basic settings logic and UI from AppSettings.vue**

Include: Autostart, Autoselect, Copy Result, Global Shortcut, and Open Log Folder.

- [ ] **Step 2: Implement the component**

```vue
<script setup lang="ts">
// Import necessary stores, icons, and components
// Implement shortcut capture logic (copied from AppSettings.vue)
// Implement autostart toggle and log folder opening
</script>
<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">{{ t('settings.basic.title') }}</h1>
    <!-- Autostart, Autoselect, Copy Result, Shortcut, Logs UI -->
  </div>
</template>
```

- [ ] **Step 3: Commit**
```bash
git add apps/desktop/src/components/BasicSettings.vue
git commit -m "feat: create BasicSettings component"
```

---

### Task 3: Create `AppearanceSettings.vue`

**Files:**
- Create: `apps/desktop/src/components/AppearanceSettings.vue`

- [ ] **Step 1: Extract appearance and AI provider logic from AppSettings.vue**

Include: Language selection and AI Provider configuration (DeepSeek/Ollama).

- [ ] **Step 2: Implement the component**

```vue
<script setup lang="ts">
// Import useI18n, store, icons
// Implement locale change and AI provider change logic
</script>
<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">{{ t('main.nav.appearance') }}</h1>
    <!-- Language Select, AI Provider Select, and Provider Details UI -->
  </div>
</template>
```

- [ ] **Step 3: Commit**
```bash
git add apps/desktop/src/components/AppearanceSettings.vue
git commit -m "feat: create AppearanceSettings component"
```

---

### Task 4: Create `PromptsSettings.vue`

**Files:**
- Create: `apps/desktop/src/components/PromptsSettings.vue`

- [ ] **Step 1: Extract prompts logic from AppSettings.vue**

Include: System Prompt and Slash Commands.

- [ ] **Step 2: Implement the component**

```vue
<script setup lang="ts">
// Import store, icons, UI components
// Implement add/remove slash command logic
</script>
<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">{{ t('settings.prompts.title') }}</h1>
    <!-- System Prompt and Slash Commands UI -->
  </div>
</template>
```

- [ ] **Step 3: Commit**
```bash
git add apps/desktop/src/components/PromptsSettings.vue
git commit -m "feat: create PromptsSettings component"
```

---

### Task 5: Refactor `AppSidebar.vue`

**Files:**
- Modify: `apps/desktop/src/components/AppSidebar.vue`

- [ ] **Step 1: Update NavItem interface to support grouping**

```typescript
interface NavItem {
  id: string
  label: string
  icon: any // Or specific LucideIcon type
  group: 'workspace' | 'preferences'
}
```

- [ ] **Step 2: Update template to render grouped items**

Use two `SidebarGroup` elements for "WORKSPACE" and "PREFERENCES".

- [ ] **Step 3: Commit**
```bash
git add apps/desktop/src/components/AppSidebar.vue
git commit -m "refactor: update sidebar for grouped navigation"
```

---

### Task 6: Refactor `Main.vue`

**Files:**
- Modify: `apps/desktop/src/windows/Main.vue`

- [ ] **Step 1: Update navItems array with groups and new items**

```typescript
const navItems = [
  { id: 'main', label: t('main.nav.main'), icon: HomeIcon, group: 'workspace' },
  { id: 'history', label: t('main.nav.history'), icon: HistoryIcon, group: 'workspace' },
  { id: 'basic', label: t('main.nav.basic'), icon: Settings2Icon, group: 'preferences' },
  { id: 'appearance', label: t('main.nav.appearance'), icon: PaletteIcon, group: 'preferences' },
  { id: 'prompts', label: t('main.nav.prompts'), icon: MessageSquareIcon, group: 'preferences' },
]
```

- [ ] **Step 2: Remove Dialog and isSettingsOpen logic**

- [ ] **Step 3: Update template to render new components based on activeTab**

```vue
<BasicSettings v-if="activeTab === 'basic'" />
<AppearanceSettings v-else-if="activeTab === 'appearance'" />
<PromptsSettings v-else-if="activeTab === 'prompts'" />
```

- [ ] **Step 4: Commit**
```bash
git add apps/desktop/src/windows/Main.vue
git commit -m "refactor: integrate new settings views into Main window"
```

---

### Task 7: Cleanup

**Files:**
- Delete: `apps/desktop/src/components/AppSettings.vue`

- [ ] **Step 1: Remove the old AppSettings.vue component**

- [ ] **Step 2: Commit**
```bash
git rm apps/desktop/src/components/AppSettings.vue
git commit -m "cleanup: remove obsolete AppSettings component"
```
