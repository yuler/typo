# Deep Link 提示词导入功能设计文档

## 1. 概述
本设计方案旨在为 Typo 桌面端应用（Tauri v2）增加 Deep Link 支持，允许用户通过点击 Web 端的链接（如 `typo://import-prompt?id=123`）直接在 App 中导入提示词。

## 2. 核心流程
1.  **协议捕获**：系统识别 `typo://` 协议并将 URL 传递给已运行的 Typo 实例。
2.  **事件转发**：Tauri Rust 层通过 `tauri-plugin-deep-link` 拦截 URL，并触发前端事件。
3.  **解析与确认**：
    *   前端解析参数，提取 `id`。
    *   弹出全局对话框，询问用户是否导入。
4.  **数据抓取**：用户确认后，App 请求 `https://typo.yuler.cc/prompts/{id}.json` 获取数据。
5.  **导入执行**：将获取到的提示词内容保存至本地存储并给予反馈。

## 3. 技术实现细节

### 3.1 基础设施 (Rust 层)
*   **插件集成**：
    *   `tauri-plugin-deep-link`: 负责注册和监听系统层级的 Deep Link。
    *   `tauri-plugin-single-instance`: 确保 Deep Link 触发时激活现有窗口，而不是启动新实例。
*   **配置**：在 `tauri.conf.json` 中配置 `bundle > identifier` 和对应的协议方案。

### 3.2 协议定义
*   **Scheme**: `typo`
*   **Action**: `import-prompt`
*   **示例 URL**: `typo://import-prompt?id=p123`

### 3.3 数据结构 (JSON)
App 将从 `https://typo.yuler.cc/prompts/{id}.json` 下载以下格式的数据：
```json
{
  "version": "1.0",
  "type": "prompt",
  "metadata": {
    "id": "p123",
    "title": "中英翻译助手",
    "description": "专业的学术论文翻译提示词"
  },
  "content": "你现在是一名专业的学术翻译官..."
}
```

### 3.4 前端实现 (Vue 3)
*   **全局监听器**：在 `App.vue` 的 `onMounted` 钩子中使用 `listen('deep-link://link', ...)`（由插件提供）。
*   **交互逻辑**：
    *   解析 URL 参数。
    *   调用 `Dialog` 或 `Modal` 组件展示确认框。
    *   使用 `fetch` 获取远程数据。
    *   成功后使用 `tauri-plugin-notification` 提醒用户。

## 4. 安全考虑
*   **用户确认**：所有通过外部链接触发的写入操作必须经过用户手动点击“确认”。
*   **域名白名单**：App 仅从 `typo.yuler.cc` 获取数据，防止恶意链接诱导 App 下载第三方非法内容。
*   **输入校验**：对获取到的 JSON 内容进行格式校验，确保不包含恶意脚本。

## 5. 后续扩展
*   **登录同步**：未来可扩展 `action=auth` 流程，通过相同机制实现 Web 扫码登录后的 App 状态注入。
