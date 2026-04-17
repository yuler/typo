> [!WARNING]
> 仍处于早期开发阶段

---

# typo

<p align="center">
  <img src="https://img.shields.io/badge/alpha-内测中-orange" alt="Alpha: 内测中" />
  <br />
  <a href="README.md">English</a> | <a href="README.zh.md">简体中文</a>
</p>

> 一款人工智能驱动的桌面工具，通过智能建议和纠正帮助您润色所选文本。

[下载](https://github.com/yuler/typo/releases)

## 屏幕截图

<!-- TODO: 需要更新屏幕截图 -->

<video src="https://github.com/user-attachments/assets/fd2ff3f3-ea57-4ab9-934f-b9a92c5c5b0e" controls playsinline width="720"></video>

## 开发

```bash
pnpm install
pnpm desktop:dev
```

## 使用方法

1. **选择** 任何您想要改进的文本。
2. **按下** `Ctrl/Cmd + Shift + X` 激活应用程序。
3. **等待** AI 响应，让它自动替换所选内容。

## 工作原理

1. **捕获**: 获取当前选中的文本。
2. **AI 处理**: 将其发送给 AI，并附带自定义提示词（可在设置中配置）。
3. **替换**: 将 AI 的响应复制到剪贴板，然后粘贴到当前光标位置（使用剪贴板有助于避免输入法问题）。

## 功能特性

- **多模型支持**: 支持 DeepSeek 和本地 Ollama 模型。
- **全局热键**: 通过 `Ctrl/Cmd + Shift + X` 快速激活。
- **智能粘贴**: 使用基于剪贴板的替换以获得最大兼容性。
- **可定制性**: 通过系统提示词调整 AI 行为。

## 提示词快捷方式

您可以在 **设置 -> 提示词 (Prompts)** 中定义最多 **5** 个自定义提示词快捷方式。

- 每个快捷方式都有一个 `key`（例如 `/tr:zh` 或 `/prompt`）和一个指令 `value`。
- 通过以下形式从选中文本中触发：
  - **前置**: 第一行以 `/command` 开头
  - **后置**: 最后一行以 `/command` 开头
- 快捷方式值中的模板占位符：
  - `{{args}}`: 同一行命令后的参数，例如 `/prompt xxx`
  - `{{text}}`: 移除命令行后的清理过的选中文本

示例：

```text
/prompt 请用礼貌的风格翻译成日语

你好啊
```

## 常见问题 (FAQ)

### macOS

- 运行：`xattr -cr /Applications/typo.app`
- 在系统设置中为该应用启用 **辅助功能权限 (Accessibility Permission)**。

### Linux 安装 (AppImage)

为了方便安装和自动更新，建议使用 AppImage 版本：

```bash
# 将下载的 AppImage 移动到永久位置
mv ~/Downloads/typo_*.AppImage ~/Applications/typo.appimage
# 使其可执行
chmod +x ~/Applications/typo.appimage
```

创建一个桌面入口以便访问：

```bash
sudo vim /usr/share/applications/typo.desktop
```

添加以下内容（将 `<$USER>` 替换为您的用户名）：

```ini
[Desktop Entry]
Name=Typo
Comment=AI-powered text improvement tool
Exec=/home/<$USER>/Applications/typo.appimage --no-sandbox
Icon=typo
Type=Application
Categories=Utility;TextEditor;
Terminal=false
```

下载图标：

```bash
sudo curl -L -o /usr/share/icons/hicolor/256x256/apps/typo.png https://raw.githubusercontent.com/yuler/typo/main/resources/logo.png
```

### Linux Wayland 兼容性

出于安全考虑，Wayland 限制了全局热键监听器。请使用 **系统快捷键 (System Shortcut)** 而不是应用级别的内部热键。

#### 1. 添加自定义快捷键

1. 打开 `设置 -> 键盘 -> 自定义快捷键`。
2. 添加命令：`typo --selection`（或 AppImage 的完整路径）。
3. 设置键位：`Ctrl + Shift + X`。

#### 2. 增强剪贴板支持（推荐）

为了确保在 Wayland 上可靠地捕获选择和粘贴，我们强烈建议使用 **ydotool** 进行键盘模拟：

- **ydotool**: 快速的键盘模拟，但需要手动设置。
  <details open>
  <summary>设置 ydotool</summary>

  **将您的用户添加到 input 组**

  ```bash
  sudo usermod -aG input $USER
  ```

  **为 `uinput` 添加 udev 规则**

  ```bash
  echo '## ydotoold fix
  ```

## <https://github.com/ReimuNotMoe/ydotool/issues/25#issuecomment-535842993>

`KERNEL=="uinput", GROUP="input", MODE="0660", OPTIONS+="static_node=uinput"
' | sudo tee /etc/udev/rules.d/80-uinput.rules > /dev/null`

**自动启动 ydotool 守护进程**
创建 `~/.config/autostart/ydotoold.desktop`:

```ini
[Desktop Entry]
Type=Application
Name=ydotool daemon
Exec=/usr/bin/ydotoold
```

  </details>

#### 3. XWayland 变通方法（可选）

如果选择捕获在特定应用中（如某些 Electron 应用）仍然失败，在 X11 模式下运行它们可能会有所帮助：

```bash
# 强制 VS Code 使用 X11
code --ozone-platform=x11
```

### Ollama

- 确保 Ollama 正在运行 (`ollama serve`)。
- 更多详情请参阅 [Ollama API 文档](https://github.com/ollama/ollama/blob/main/docs/api.md)。
