# Deep Link 提示词导入实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现通过 `typo://import-prompt?id=xxx` 链接从 `typo.yuler.cc` 导入提示词到 App。

**Architecture:** 利用 Tauri v2 的 `deep-link` 插件捕获系统协议，通过 `single-instance` 确保单实例运行，并在前端 Vue 应用中监听事件并触发确认弹窗及数据抓取逻辑。

**Tech Stack:** Tauri v2 (Rust), Vue 3 (TypeScript), Fetch API.

---

### Task 1: 基础设施配置 (Rust)

**Files:**
- Modify: `apps/desktop/src-tauri/Cargo.toml`
- Modify: `apps/desktop/src-tauri/tauri.conf.json`

- [ ] **Step 1: 添加 Rust 依赖**

在 `apps/desktop/src-tauri/Cargo.toml` 中添加插件：
```toml
[dependencies]
tauri-plugin-deep-link = "2"
tauri-plugin-single-instance = "2"
```

- [ ] **Step 2: 配置 Deep Link 协议**

修改 `apps/desktop/src-tauri/tauri.conf.json`，确保 `identifier` 正确并配置 `deepLink`：
```json
{
  "bundle": {
    "identifier": "cc.yuler.typo"
  },
  "plugins": {
    "deep-link": {
      "schemes": ["typo"]
    }
  }
}
```

- [ ] **Step 3: 提交更改**
```bash
git add apps/desktop/src-tauri/Cargo.toml apps/desktop/src-tauri/tauri.conf.json
git commit -m "chore: add deep-link and single-instance plugins configuration"
```

---

### Task 2: 插件初始化与单实例设置 (Rust)

**Files:**
- Modify: `apps/desktop/src-tauri/src/lib.rs`

- [ ] **Step 1: 在 lib.rs 中注册插件**

```rust
// apps/desktop/src-tauri/src/lib.rs
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app.get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }))
        // ... 其他插件
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 2: 验证编译**
运行 `pnpm tauri build --no-bundle` (或 dev 模式) 确保插件正确集成。

- [ ] **Step 3: 提交更改**
```bash
git add apps/desktop/src-tauri/src/lib.rs
git commit -m "feat: initialize deep-link and single-instance in rust"
```

---

### Task 3: 前端全局监听器实现 (Vue)

**Files:**
- Modify: `apps/desktop/src/App.vue`

- [ ] **Step 1: 编写 Deep Link 监听逻辑**

在 `App.vue` 中添加监听代码：
```typescript
import { onMounted } from 'vue';
import { listen } from '@tauri-apps/api/event';

onMounted(async () => {
  await listen('deep-link://link', (event) => {
    const urls = event.payload as string[];
    const url = new URL(urls[0]);
    if (url.protocol === 'typo:' && url.host === 'import-prompt') {
      const id = url.searchParams.get('id');
      if (id) {
        // 触发弹窗逻辑 (将在下一步实现)
        console.log('Detected import-prompt with ID:', id);
      }
    }
  });
});
```

- [ ] **Step 2: 提交更改**
```bash
git add apps/desktop/src/App.vue
git commit -m "feat: add deep-link event listener in frontend"
```

---

### Task 4: 确认导入弹窗与数据抓取

**Files:**
- Create: `apps/desktop/src/components/DeepLinkImportModal.vue`
- Modify: `apps/desktop/src/App.vue`

- [ ] **Step 1: 创建弹窗组件逻辑**

```vue
<!-- apps/desktop/src/components/DeepLinkImportModal.vue -->
<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ id: string }>();
const emit = defineEmits(['close', 'success']);

const loading = ref(false);

async function handleConfirm() {
  loading.value = true;
  try {
    const response = await fetch(`https://typo.yuler.cc/prompts/${props.id}.json`);
    const data = await response.json();
    // 执行导入逻辑 (例如存入 Store)
    emit('success', data);
  } catch (error) {
    console.error('Failed to fetch prompt:', error);
  } finally {
    loading.value = false;
  }
}
</script>
```

- [ ] **Step 2: 集成到 App.vue 并测试**
在 `App.vue` 中引用该组件，并在监听到事件时显示。

- [ ] **Step 3: 提交更改**
```bash
git add apps/desktop/src/components/DeepLinkImportModal.vue apps/desktop/src/App.vue
git commit -m "feat: implement import confirmation modal and data fetching"
```
