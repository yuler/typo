# Linux Deep Link 开发环境配置指南

在 Linux (如 Ubuntu, Debian, Arch 等) 开发环境下，系统不会像 macOS 或 Windows 那样在开发阶段自动关联自定义协议（如 `typo://`）。为了使浏览器或终端能够拉起开发中的 Tauri App，需要手动进行 MIME 注册。

## 1. 创建桌面入口文件 (`.desktop`)

在 Linux 中，协议关联是基于 `.desktop` 文件的。你需要创建一个指向你当前项目开发二进制文件的桌面文件。

创建文件 `~/.local/share/applications/typo-dev.desktop`：

```ini
[Desktop Entry]
Name=Typo Dev
# 注意：Exec 必须使用绝对路径，并且结尾必须带有 %u 以接收 URL 参数
Exec=/home/yourname/path/to/typo/apps/desktop/src-tauri/target/debug/typo %u
Type=Application
Terminal=false
MimeType=x-scheme-handler/typo;
Categories=Utility;
```

> **提示**：你可以运行 `pwd` 获取当前项目根目录，确保 `Exec` 路径正确。

## 2. 注册协议关联

执行以下命令通知系统处理 `typo://` 协议：

```bash
# 1. 设置默认处理器
xdg-mime default typo-dev.desktop x-scheme-handler/typo

# 2. 刷新桌面数据库
update-desktop-database ~/.local/share/applications

# 3. 验证关联是否成功 (应该输出 typo-dev.desktop)
gio mime x-scheme-handler/typo
```

## 3. 测试拉起功能

你可以通过以下命令测试系统是否能够识别并拉起 App：

```bash
xdg-open "typo://import-prompt?id=english-polisher"
```

## 常见问题排查

1. **"The specified location is not supported"**:
   - 检查 `.desktop` 文件是否位于 `~/.local/share/applications/` 目录下。
   - 检查 `MimeType` 行末尾是否有分号 `;`。
   - 确保运行了 `update-desktop-database`。
2. **App 启动了但没有处理数据**:
   - 确保 `Exec` 路径后面带有 `%u`。
   - 确保你正在运行的是开发版单实例模式（Tauri v2 默认处理）。
3. **路径无效**:
   - 如果你移动了项目目录，必须更新 `.desktop` 文件中的 `Exec` 绝对路径。

## 生产环境说明

当你通过 `.deb` 包分发应用时，Tauri 的打包工具会自动处理上述所有步骤，用户安装后即可直接使用，无需手动配置。此指南仅针对**开发调试阶段**。
