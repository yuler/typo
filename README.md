> [!WARNING]
> Still in early development

---

# typo

> An AI-powered desktop tool that helps you write better English with smart suggestions and corrections.

[![Download](https://img.shields.io/github/v/release/yuler/typo)](https://github.com/yuler/typo/releases)

## Screenshots

![Screenshot](https://github.com/user-attachments/assets/fd2ff3f3-ea57-4ab9-934f-b9a92c5c5b0e)

## Development

```bash
pnpm install
pnpm dev
```

## Usage

1. Select any text you want to improve
2. Press `Ctrl/Cmd + Shift + X` to activate the application
3. Wait for the response and replace the selected content

## How it works

- Get the selected text
- Send it to AI with a custom prompt(your can custom it in settings)
- Copy the AI's response to the clipboard, then paste it at the current cursor position (using the clipboard helps avoid input method issues).

## Features

- Support for DeepSeek & Ollama AI models
- Global `Ctrl/Cmd + Shift + X` hotkey activation


## Prompt shortcuts

You can define up to **5** custom prompt shortcuts in **Settings -> Prompts**.

- Each shortcut has a `key` (for example `/tr:zh` or `/prompt`) and an instruction `value`.
- Trigger it from selected text with one of these forms:
  - first line: `/prompt make it formal`
  - last line: `/tr:ja`
  - trailing token: `hello world /tr:zh`
- Template placeholders in shortcut values:
  - `{{args}}`: arguments after the command, e.g. `/prompt xxx`
  - `{{text}}`: cleaned selected text after command line/token is removed

Example:

```text
你好啊

/prompt Translate to Japanese in polite style
```

## FAQ

### macOS

- Run: `xattr -cr /Applications/typo.app`
- Enable accessibility permission for the app

### Linux

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

Add the following content:

```bash
# Download icon for the desktop entry (Icon=typo)
sudo curl -L -o /usr/share/icons/hicolor/256x256/apps/typo.png https://raw.githubusercontent.com/yuler/typo/main/resources/logo.png
```

```text
[Desktop Entry]
Name=Typo
Comment=AI-powered text improvement tool
Exec=/home/<$USER>/Applications/typo.appimage --no-sandbox
Icon=typo
Type=Application
Categories=Utility;TextEditor;
Terminal=false
```

#### Wayland Compatibility (e.g., VS Code)

Typo may require Electron-based apps like VS Code to run in X11 (XWayland) rather than native Wayland.

**Verify if an app is using X11:**

```bash
sudo apt install x11-apps
xeyes
```

Hover your cursor over the app window. If the eyes follow your mouse, it's X11; if they freeze, it's Wayland.

**Force VS Code to use X11:**

Temporary via CLI:

```bash
code --ozone-platform=x11
```

Permanent via Desktop Shortcut:

```bash
cp /usr/share/applications/code.desktop ~/.local/share/applications/
vim ~/.local/share/applications/code.desktop
# Modify the Exec line to append the flag:
Exec=/usr/share/code/code %F --ozone-platform=x11
```

### Ollma

- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
