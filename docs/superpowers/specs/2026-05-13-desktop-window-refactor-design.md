# 设计文档：Typo 桌面端窗口重构 (Capsule UI & Dynamic Windows)

## 1. 背景与目标
为了提升用户体验和系统响应速度，我们将 Typo 桌面端（Tauri）的窗口管理逻辑从静态配置重构为由 Rust 后端驱动的动态管理模式。

### 核心变更：
- **胶囊化 (Capsule UI)**：主窗口从传统应用窗口转变为屏幕底部固定的胶囊形状指示器。
- **Rust 驱动**：在 Rust 侧动态创建和配置窗口，实现更精细的操作系统级别控制（位置、置顶、透明度等）。
- **组件解耦**：基于窗口 Label 渲染对应组件，移除对前端路由的依赖。

## 2. 系统架构 (Rust 后端)

### 2.1 新增模块 `src-tauri/src/windows.rs`
负责所有窗口的生命周期管理，包含以下核心功能：
- **`create_main_window`**：创建胶囊样式的主窗口。
- **`create_settings_window`**：创建设置窗口。
- **`create_upgrade_window`**：创建更新/升级提示窗口。
- **单实例保障**：创建前检查 label 是否已存在，若存在则聚焦旧窗口。

### 2.2 窗口规格配置
| 窗口 Label | 尺寸 (WxH) | 装饰器 | 置顶 | 位置 | 背景 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `main` | 360px x 56px | False | True | 屏幕底部中央 (y: -100px) | 透明/毛玻璃 |
| `settings` | 800px x 600px | True | False | 屏幕中央 | 标准 |
| `upgrade` | 400px x 300px | False | True | 屏幕中央 | 透明/毛玻璃 |

## 3. 前端实现 (Vue)

### 3.1 动态组件渲染 (`App.vue`)
不再使用传统的单窗口模式。`App.vue` 作为根容器，根据当前窗口的 `label` 渲染对应的视图组件：
```vue
<script setup>
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
const currentLabel = getCurrentWebviewWindow().label;
</script>

<template>
  <CapsuleMain v-if="currentLabel === 'main'" />
  <SettingsView v-else-if="currentLabel === 'settings'" />
  <UpgradeView v-else-if="currentLabel === 'upgrade'" />
</template>
```

### 3.2 胶囊指示器逻辑 (`CapsuleMain.vue`)
实现固定的宽度布局，内部维护三种展示状态：
1. **Selection (提取)**：图标 + 文本片段预览 + 字符计数。
2. **Processing (处理)**：加载动画 (Spinner) + 状态文字。
3. **Success (成功)**：成功图标 + 复制确认提示。

## 4. 交互与通信流程

1. **触发器**：用户按下快捷键 `Ctrl+Shift+X` 或通过命令行 `typo --selection` 调用。
2. **Rust 层**：
   - 捕获选中文本。
   - 调用 `windows::create_main_window`（如果已开启则直接复用）。
   - 发送 `set-input` 事件，携带文本 Payload。
3. **前端层**：
   - `CapsuleMain` 监听到事件，进入 **Selection** 状态。
   - 调用 AI 接口，切换至 **Processing** 状态。
   - 处理完成后，写入剪贴板并执行粘贴，切换至 **Success** 状态。
   - 延迟 2-3 秒后，通知 Rust 隐藏或销毁窗口。

## 5. 视觉规范
- **风格**：毛玻璃效果 (Glassmorphism)，深色主题。
- **稳定性**：胶囊窗口宽度固定为 360px，避免长度抖动带来的视觉不适。
- **圆角**：24px (Pill shape)。

## 6. 测试策略
- **窗口定位测试**：在不同分辨率和多显示器环境下测试胶囊是否准确居中。
- **生命周期测试**：测试多次触发快捷键时，窗口是否正确复用和重置状态。
- **性能测试**：对比 Rust 侧创建窗口与前端控制窗口的响应延迟。
