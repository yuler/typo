# Typo 桌面端窗口重构实施计划 (Capsule UI & Dynamic Windows)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Typo 桌面端的主窗口重构为动态创建的胶囊样式指示器，并实现基于窗口 Label 的多窗口管理模式。

**Architecture:** 在 Rust 端新增 `windows.rs` 模块负责 Webview 窗口的动态创建与配置。前端通过获取当前窗口的 Label 来决定渲染哪个顶级组件，彻底解耦窗口逻辑。

**Tech Stack:** Tauri (Rust), Vue 3, TypeScript, Tailwind CSS.

---

### Task 1: 创建 Rust 窗口管理模块 `windows.rs`

**Files:**
- Create: `apps/desktop/src-tauri/src/windows.rs`
- Modify: `apps/desktop/src-tauri/src/lib.rs`

- [ ] **Step 1: 创建 `windows.rs` 并定义窗口创建逻辑**
编写基础框架，包含创建主窗口的方法。

```rust
// apps/desktop/src-tauri/src/windows.rs
use tauri::{AppHandle, WebviewWindowBuilder, WebviewUrl};

pub fn create_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_focus();
        return;
    }

    let win_builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("typo")
        .inner_size(360.0, 56.0)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .visible(false); // 初始隐藏，由前端或 Rust 逻辑控制显示

    // TODO: 获取屏幕尺寸并计算居中位置
    let _ = win_builder.build();
}

pub fn create_settings_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.set_focus();
        return;
    }

    let _ = WebviewWindowBuilder::new(app, "settings", WebviewUrl::App("index.html".into()))
        .title("typo - Settings")
        .inner_size(800.0, 600.0)
        .build();
}
```

- [ ] **Step 2: 在 `lib.rs` 中注册模块**
修改 `lib.rs` 引入 `windows` 模块。

```rust
// apps/desktop/src-tauri/src/lib.rs
mod windows; // 添加这一行
```

- [ ] **Step 3: 提交**
```bash
git add apps/desktop/src-tauri/src/windows.rs apps/desktop/src-tauri/src/lib.rs
git commit -m "feat(rust): add windows management module"
```

---

### Task 2: 配置窗口居中算法与透明度支持

**Files:**
- Modify: `apps/desktop/src-tauri/src/windows.rs`

- [ ] **Step 1: 实现胶囊窗口的底部居中算法**

```rust
// apps/desktop/src-tauri/src/windows.rs
use tauri::{AppHandle, WebviewWindowBuilder, WebviewUrl, Manager};

pub fn create_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_focus();
        return;
    }

    // 获取主显示器信息
    let monitor = app.primary_monitor().ok().flatten();
    let (width, height) = if let Some(m) = monitor {
        let size = m.size();
        (size.width as f64, size.height as f64)
    } else {
        (1920.0, 1080.0)
    };

    let win_width = 360.0;
    let win_height = 56.0;
    let x = (width - win_width) / 2.0;
    let y = height - win_height - 80.0; // 距离底部 80px

    let win_builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("typo")
        .inner_size(win_width, win_height)
        .position(x, y)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .visible(false);

    let _ = win_builder.build();
}
```

- [ ] **Step 2: 提交**
```bash
git add apps/desktop/src-tauri/src/windows.rs
git commit -m "feat(rust): implement window positioning logic"
```

---

### Task 3: 移除 `tauri.conf.json` 中的静态窗口配置

**Files:**
- Modify: `apps/desktop/src-tauri/tauri.conf.json`

- [ ] **Step 1: 移除 `windows` 数组中的默认配置**
将其改为空数组，因为我们现在完全通过 Rust 动态创建。

```json
// apps/desktop/src-tauri/tauri.conf.json
{
  "app": {
    "windows": []
  }
}
```

- [ ] **Step 2: 在 `lib.rs` 的 `setup` 阶段初始化窗口**
修改 `run()` 函数，在启动时根据需要创建初始窗口（通常是主胶囊，但保持隐藏）。

```rust
// apps/desktop/src-tauri/src/lib.rs
.setup(move |app| {
    windows::create_main_window(&app.handle());
    // ... 原有的 setup 代码
})
```

- [ ] **Step 3: 提交**
```bash
git add apps/desktop/src-tauri/tauri.conf.json apps/desktop/src-tauri/src/lib.rs
git commit -m "refactor: move to dynamic window creation"
```

---

### Task 4: 前端 `App.vue` Label 驱动重构

**Files:**
- Create: `apps/desktop/src/views/CapsuleMain.vue`
- Create: `apps/desktop/src/views/SettingsView.vue`
- Create: `apps/desktop/src/views/UpgradeView.vue`
- Modify: `apps/desktop/src/App.vue`

- [ ] **Step 1: 创建视图组件占位符**
将原 `App.vue` 中的逻辑拆分到对应的视图中。

- [ ] **Step 2: 修改 `App.vue` 实现条件渲染**

```vue
<!-- apps/desktop/src/App.vue -->
<script setup lang="ts">
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import CapsuleMain from '@/views/CapsuleMain.vue'
import SettingsView from '@/views/SettingsView.vue'
import UpgradeView from '@/views/UpgradeView.vue'

const currentLabel = getCurrentWebviewWindow().label
</script>

<template>
  <main class="h-screen w-screen overflow-hidden bg-transparent">
    <CapsuleMain v-if="currentLabel === 'main'" />
    <SettingsView v-else-if="currentLabel === 'settings'" />
    <UpgradeView v-else-if="currentLabel === 'upgrade'" />
  </main>
</template>
```

- [ ] **Step 3: 提交**
```bash
git add apps/desktop/src/App.vue apps/desktop/src/views/*.vue
git commit -m "feat(frontend): implement label-based view switching"
```

---

### Task 5: 实现胶囊指示器 UI (`CapsuleMain.vue`)

**Files:**
- Modify: `apps/desktop/src/views/CapsuleMain.vue`

- [ ] **Step 1: 实现固定宽度的三段式 UI 布局**
参考设计模型，实现 Glassmorphism 风格。

- [ ] **Step 2: 实现状态机逻辑**
处理 `idle` -> `loading` -> `success` 的转换。

- [ ] **Step 3: 提交**
```bash
git add apps/desktop/src/views/CapsuleMain.vue
git commit -m "feat(frontend): implement capsule indicator UI"
```

---

### Task 6: 更新快捷键与菜单调用逻辑

**Files:**
- Modify: `apps/desktop/src-tauri/src/tray.rs`
- Modify: `apps/desktop/src-tauri/src/keyboard.rs`

- [ ] **Step 1: 修改菜单点击事件**
将原本的 `emit` 切换窗口改为调用 `windows::create_settings_window`。

- [ ] **Step 2: 提交**
```bash
git add apps/desktop/src-tauri/src/tray.rs
git commit -m "refactor: update tray menu to use dynamic windows"
```
