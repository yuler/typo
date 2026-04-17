# typo

<p align="center">
  <img src="https://img.shields.io/badge/alpha-内测中-orange" alt="Alpha: 内测中" />
  <br />
  <a href="README.md">English</a> | <a href="README.zh.md">简体中文</a>
</p>

> An AI-powered desktop tool that refines your selected text with smart suggestions and corrections.

[Download](https://github.com/yuler/typo/releases)

## Screenshots

<!-- TODO: need updated screenshots -->

<video src="https://github.com/user-attachments/assets/fd2ff3f3-ea57-4ab9-934f-b9a92c5c5b0e" controls playsinline width="720"></video>

## Development

```bash
pnpm install
pnpm dev
```

## Usage

1. **Select** any text you want to improve.
2. **Press** `Ctrl/Cmd + Shift + X` to activate the application.
3. **Wait** for the AI response and let it replace the selected content automatically.

## How it works

1. **Capture**: Gets the currently selected text.
2. **AI processing**: Sends it to AI with a custom prompt (configurable in settings).
3. **Replacement**: Copies the AI's response to the clipboard, then pastes it at the current cursor position (using the clipboard helps avoid input method issues).

## Features

- **Multi-Model Support**: Works with DeepSeek and local Ollama models.
- **Global Hotkeys**: Quick activation with `Ctrl/Cmd + Shift + X`.
- **Intelligent Pasting**: Uses clipboard-based replacement for maximum compatibility.
- **Customizable**: Tailor the AI behavior via system prompts.

## Prompt shortcuts

You can define up to **5** custom prompt shortcuts in **Settings -> Prompts**.

- Each shortcut has a `key` (for example `/tr:zh` or `/prompt`) and an instruction `value`.
- Trigger it from selected text with one of these forms:
  - **Leading**: first line starts with `/command`
  - **Trailing**: last line starts with `/command`
- Template placeholders in shortcut values:
  - `{{args}}`: arguments after the command on the same line, e.g. `/prompt xxx`
  - `{{text}}`: cleaned selected text after command line is removed

Example:

```text
/prompt Translate to Japanese in polite style

你好啊
```

## FAQ

### macOS

- Run: `xattr -cr /Applications/typo.app`
- Enable **Accessibility Permission** for the app in System Settings.

### Linux Installation (AppImage)

For installation and auto-updates, we recommend using the AppImage version:

```bash
# Move the downloaded AppImage to a permanent location
mv ~/Downloads/typo_*.AppImage ~/Applications/typo.appimage
# Make it executable
chmod +x ~/Applications/typo.appimage
```

Create a desktop entry for easy access:

```bash
sudo vim /usr/share/applications/typo.desktop
```

Add the following content (replace `<$USER>` with your username):

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

Download the icon:

```bash
sudo curl -L -o /usr/share/icons/hicolor/256x256/apps/typo.png https://raw.githubusercontent.com/yuler/typo/main/resources/logo.png
```

### Linux Wayland Compatibility

Wayland restricts global hotkey listeners for security. Use a **System Shortcut** instead of the app-level internal hotkey.

#### 1. Add a Custom Shortcut

1. Open `Settings -> Keyboard -> Custom Shortcuts`.
2. Add a command: `typo --selection` (or the full path to your AppImage).
3. Set keys to: `Ctrl + Shift + X`.

#### 2. Enhanced Clipboard Support (Recommended)

To ensure reliable selection capture and pasting on Wayland, we highly recommend using **ydotool** for keyboard simulation:

- **ydotool**: Fast keyboard simulation but requires manual setup.
  <details open>
  <summary>Setup ydotool</summary>

  **Add your user to group input**

  ```bash
  sudo usermod -aG input $USER
  ```

  **Add udev rule for `uinput`**

  ```bash
  echo '## ydotoold fix
  ```

## <https://github.com/ReimuNotMoe/ydotool/issues/25#issuecomment-535842993>

`KERNEL=="uinput", GROUP="input", MODE="0660", OPTIONS+="static_node=uinput"
' | sudo tee /etc/udev/rules.d/80-uinput.rules > /dev/null`

**Autostart ydotool daemon**
Create `~/.config/autostart/ydotoold.desktop`:

```ini
[Desktop Entry]
Type=Application
Name=ydotool daemon
Exec=/usr/bin/ydotoold
```

  </details>

#### 3. XWayland Workaround (Optional)

If selection capture still fails in specific apps (like some Electron apps), running them in X11 mode can help:

```bash
# Force VS Code to use X11
code --ozone-platform=x11
```

### Ollama

- Ensure Ollama is running (`ollama serve`).
- See the [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md) for more details.
