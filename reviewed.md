# PR #105 Code Review: Wayland 选区捕获与 Omarchy Indicator 支持

- **PR 链接**: [yuler/typo#105](https://github.com/yuler/typo/pull/105)
- **分支**: `fix-wayland-copy-selection` -> `main`
- **审查时间**: 2026-10-16

---

## 总体评价

本 PR 的核心目标非常明确且切中关键痛点：
1. **解决 XWayland 应用（如微信）在 Hyprland 下剪贴板桥接挂起**：通过 `x11rb` 直接读取 X11 `CLIPBOARD`，绕过挂起 15s 的 `wl-paste`。
2. **解耦单例事件线程**：将选区捕获异步化，防止阻塞 `tauri-plugin-single-instance` 导致后续快捷键挂死。
3. **避免启动时弹出主窗口**：规范桌面后台工具的生命周期，增加悬浮 Indicator 窗口规则脚本。

整体技术路线方向正确，但在**时序同步、窗口生命周期、快捷键触发链**上存在 **2 个严重缺陷 (P0 Bug)**、**2 个设计缺陷 (P1)** 以及若干细节问题。建议按以下清单调整后再合并。

---

## 一、 严重缺陷 (Critical / Bugs)

### 1. Sentinel 哨兵机制在 XWayland 下完全失效（极易误读历史旧剪贴板）

- **文件定位**: 
  - `apps/desktop/src-tauri/src/lib.rs` (L112-L174)
  - `apps/desktop/src-tauri/src/keyboard.rs` (L145-L200)

- **现象与根因**:
  在 PR 测试计划中有一项作者未确认原因的问题：
  > `- [ ] Repeated captures in WeChat with fresh selections (an early repeat run missed; cause not yet confirmed)`

  **这正是本 Bug 导致的直接现象**：
  1. `get_selected_text_wayland` 写入 Sentinel 哨兵使用的是 `keyboard::wl_copy_text(SELECTION_CLIPBOARD_SENTINEL)`，即通过 `wl-copy` 写入 **Wayland 剪贴板**。
  2. 但对 XWayland 窗口（`xwayland == true`），读取是通过 `keyboard::x11_clipboard_text` 直接从 **X11 CLIPBOARD** 读取。
  3. **X11 剪贴板中从未被写入过该 Sentinel！** X11 剪贴板内依然是上一次复制的旧文本。
  4. 当发送复制快捷键后，`read_copied_text_after_shortcut` 立即轮询：
     ```rust
     if text != SELECTION_CLIPBOARD_SENTINEL && !text.contains('\0') {
         return Some(text);
     }
     ```
     在目标应用（如微信）处理 `Ctrl+C` 的前几毫秒内，`x11_clipboard_text` 读取到的是 X11 的**历史旧内容**。因为历史内容 `!= SELECTION_CLIPBOARD_SENTINEL`，函数在**第一次轮询（~10ms 内）就误认为复制已成功并直接返回旧内容**！
  5. **衍生问题**：如果用户在微信空白处点击（未选中任何文本）按快捷键，预期应捕获不到内容返回 `None`，但当前实现会错误地返回历史剪贴板内容。

- **修复方案**:
  在 X11 协议中，可以在触发复制前，主动将 Selection Owner 清空：
  ```rust
  conn.set_selection_owner(x11rb::NONE, clipboard, x11rb::CURRENT_TIME)?;
  conn.flush()?;
  ```
  清空后，在微信真正响应 `Ctrl+C` 并调用 `SetSelectionOwner` 之前，任何对 X11 CLIPBOARD 的查询都会返回 `property == x11rb::NONE`，使 `read_clipboard(true)` 准确返回 `None` 处于等待状态，直到新文本到达。

---

### 2. 取消启动时创建主窗口后，用户通过桌面启动器二次运行 `typo` 无法唤起窗口

- **文件定位**: 
  - `apps/desktop/src-tauri/src/lib.rs` (L303-L305)
  - `apps/desktop/src-tauri/src/cli.rs` (L53-L57)

- **现象与根因**:
  1. `lib.rs` 中去掉了 `windows::create_main_window(&app.handle())`，避免自启时直接弹出 1200x800 的大主窗口，这一初衷是合理的。
  2. 但在 `cli.rs` 的单例事件处理中：
     ```rust
     if let Some(window) = app.get_webview_window("main") {
         let _ = window.show();
     }
     ```
  3. 如果应用启动后用户从未点击过托盘或悬浮条的“设置”，`main` 窗口在进程中**根本尚未创建**。
  4. 用户在系统的应用启动器（App Launcher / 终端）中再次点击或运行 `typo` 时，`app.get_webview_window("main")` 恒为 `None`，**导致点击应用图标毫无反应，主窗口彻底打不开**。

- **修复方案**:
  `cli.rs` 应与托盘 `tray.rs` 的行为保持一致，调用 `windows::show_and_focus_main(app)`：
  ```rust
  // apps/desktop/src-tauri/src/cli.rs
  pub fn handle_single_instance_event(...) {
      ...
      crate::windows::show_and_focus_main(app);
  }
  ```
  `show_and_focus_main` 会在窗口不存在时自动调用 `create_main_window` 并聚焦显示。

---

## 二、 关键设计与可靠性缺陷 (Design & Reliability)

### 3. Omarchy `Super+C` 路径脆弱，且屏蔽了更可靠的原生 `hyprland_tap`

- **文件定位**: 
  - `apps/desktop/src-tauri/src/keyboard.rs` (L370-L374, L429-L444)

- **现象与根因**:
  在 PR 测试计划中：
  > `- [ ] Super+C / Super+V path with the real Ctrl+Shift+X hotkey (modifiers still held on release may block the Omarchy binding)`

  这里的逻辑存在明显的设计冗余与竞态：
  1. **层层绕道，本末倒置**：
     查阅 Omarchy 自身的剪贴板配置（`$OMARCHY_PATH/default/hypr/bindings/clipboard.lua`），Omarchy 的 `SUPER + C` 绑定的实现本质就是调用：
     ```lua
     hl.dispatch(hl.dsp.send_key_state({ mods = mods, key = key, state = "down" }))
     ```
     而 Typo 在下方 `hyprland_tap` 中**已经原生实现了直接调用 `hl.dsp.send_key_state`**。
  2. **物理修饰键污染与假成功截断**：
     Typo 在 `on_omarchy()` 时使用 `ydotool` 去虚拟注入 `Super+C`：
     - 当用户通过快捷键（如 `Ctrl+Shift+X`）触发 Typo 时，物理键盘上的 `Shift` 或 `Ctrl` 往往尚未完全松开。
     - 虚拟键盘注入的 `Super+C` 在 Wayland seat 会与物理按下的修饰键合并，Hyprland 实际接收到的是 `Super+Shift+C` 或 `Super+Ctrl+C`，**Omarchy 的 `SUPER + C` 绑定根本不会触发**！
     - 更加致命的是：`ydotool` 命令执行完毕就会返回退出码 0，导致 `omarchy_super_shortcut` **恒返回 `true`**。
     - 于是代码直接 `return true`，**使得下方真正可靠且不受物理修饰键干扰的 `hyprland_tap` 永远没有机会执行**！

- **修复方案**:
  在 Hyprland 环境下（不论是否是 Omarchy），直接统一走 `hyprland_tap(mods, key)`：
  ```rust
  if on_hyprland() {
      let (mods, key) = copy_chord();
      log::debug!("copy via hyprland send_key_state {mods}+{key}");
      if hyprland_tap(mods, key) {
          return true;
      }
      log::warn!("hyprland copy shortcut failed, falling back to ydotool");
  }
  ```
  直接将按键事件通过 Hyprland dispatch 投递到目标 surface，不需要依赖 ydotool 虚拟设备，不会被物理修饰键污染，且执行速度最快。

---

### 4. 手写字符串切片解析 JSON 极其脆弱 (`json_field`)

- **文件定位**: 
  - `apps/desktop/src-tauri/src/keyboard.rs` (L301-L318)

- **问题**:
  ```rust
  fn json_field<'a>(json: &'a str, name: &str) -> Option<&'a str> {
      let key = format!("\"{name}\"");
      let rest = json.get(json.find(&key)? + key.len()..)?;
      Some(rest.get(rest.find(':')? + 1..)?.trim_start())
  }
  ```
  1. `hyprctl activewindow -j` 输出的 JSON 中，如果窗口的 `title`（例如浏览器标签页标题或代码内容）包含 `"class":` 或 `"xwayland": true`，这种字符串子串搜索会直接匹配到 `title` 内部，导致误判。
  2. 项目的 `Cargo.toml` 中早已引入了 `serde_json = "1"`，完全无需使用这种手写切片。
  3. 此外，每次捕获选择先后调用 `focused_xwayland()` 和 `focused_terminal()`，导致在数十毫秒内**连续两次 fork 执行 `hyprctl activewindow -j`**。

- **修复方案**:
  使用 `serde_json::Value` 一次性解析当前活动窗口，同时获取 `xwayland`、`class` 以及 `tags`（Omarchy 会在 `tags` 中标记 `"terminal*"`，比硬编码终端程序名更准）。

---

## 三、 体验与边界细节 (UX & Edge Cases)

### 5. `scripts/omarchy-indicator.sh` 的静态定位与 Indicator 动态宽度冲突

- **文件定位**: 
  - `scripts/omarchy-indicator.sh` (L70-L77)
  - `apps/desktop/src/windows/Indicator.vue` (L340-L385)

- **问题**:
  脚本生成规则时将移动坐标写死为：
  ```lua
  move = { "(monitor_w-$((WIDTH + MARGIN)))", "(monitor_h-$((HEIGHT + MARGIN)))" }
  ```
  默认 `WIDTH=204`。
  但在前端 `Indicator.vue` 中，悬浮条在处理中（`processing`）、显示结果（`result`）或快捷键提示时，会根据文字长度动态调用 `appWindow.setSize` 将宽度调整到 300px+ 甚至更宽。
  因为 Hyprland 规则将左上角 X 坐标死死定在 `monitor_w - 224`，当窗口动态变宽时，**它只能向右侧伸展，导致右半部分超出屏幕可视区域被裁剪**。

---

### 6. 移除了 Wayland primary selection fallback，却留下了 `copyq_selection()`

- **文件定位**: 
  - `apps/desktop/src-tauri/src/lib.rs` (L138-L147)

- **问题**:
  代码注释明确写道：
  ```rust
  // Do not fall back to the Wayland primary selection. It keeps the last
  // highlight (here, "日") after Ctrl+C/Ctrl+Shift+C fails to copy.
  ```
  但紧随其后的 `copyq_selection()` 实际上读取的依然是系统 Primary Selection（而且 `ensure_copyq_server_start()` 还会无意启动 CopyQ 守护进程）。既然决定不再使用鼠标高亮残留，建议按照代码中的 TODO 将 `copyq_selection` fallback 一并彻底清理。

---

### 7. `x11_clipboard_text` 在轮询中反复建立/销毁 X11 连接

- **文件定位**: 
  - `apps/desktop/src-tauri/src/keyboard.rs` (L145-L200)

- **问题**:
  在 `budget`（1000ms）轮询中，每次重试都会调用 `x11rb::connect(None)`，重新与 XWayland 建立 socket 连接、进行握手、创建窗口并进行 3 次同步的 `intern_atom` 往返。
  虽然有超时退出机制，但若在重试循环中复用连接，整体系统开销和延迟会小得多。

---

## 四、 修改建议清单 (Actionable Checklist)

| 优先级 | 修改项 | 文件 | 建议操作 |
| :--- | :--- | :--- | :--- |
| 🔴 **P0** | X11 剪贴板清空机制 | `keyboard.rs` / `lib.rs` | 触发快捷键前调用 `conn.set_selection_owner(x11rb::NONE, ...)` 清空 X11 剪贴板归属，解决误读旧内容问题 |
| 🔴 **P0** | 二次启动唤醒主界面 | `cli.rs` | `handle_single_instance_event` 改用 `crate::windows::show_and_focus_main(app)` |
| 🟡 **P1** | 统一 Hyprland 按键投递 | `keyboard.rs` | 移除 `omarchy_super_shortcut`，Hyprland 环境统一直接调用 `hyprland_tap`（走 `hl.dsp.send_key_state`） |
| 🟡 **P1** | 规范 JSON 解析与合并请求 | `keyboard.rs` | 使用 `serde_json::Value` 解析 `activewindow -j`，一次性获取 `xwayland`、`class` 和 `tags` |
| 🟢 **P2** | Indicator 定位自适应 | `scripts/omarchy-indicator.sh` | 评估在 Hyprland 规则或前端 resize 时动态处理位置计算，避免变宽溢出屏幕 |
| 🟢 **P2** | 清理 CopyQ 遗留 | `lib.rs` | 移除 `copyq_selection()` 兜底代码 |
