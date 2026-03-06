> [!WARNING]
> Still in early development

---

# typo

An AI-powered desktop tool for improving English writing with smart suggestions.

[![Download](https://img.shields.io/github/v/release/yuler/typo)](https://github.com/yuler/typo/releases)

## Screenshot

![Screenshot](https://github.com/user-attachments/assets/fd2ff3f3-ea57-4ab9-934f-b9a92c5c5b0e)

## Quick Start

```bash
pnpm install
pnpm dev
```

## Usage

1. Select any text to improve
2. Press `Ctrl/Cmd + Shift + X`
3. Replace with AI suggestion

## Features

- DeepSeek & Ollama AI support
- Global hotkey activation (`Ctrl/Cmd + Shift + X`)

## FAQ

### macOS
```bash
xattr -cr /Applications/typo.app
```
Enable accessibility permission in System Settings.

### Linux (AppImage)

```bash
# Install
mv ~/Downloads/typo_*.AppImage ~/Applications/typo.appimage
chmod +x ~/Applications/typo.appimage

# Desktop entry
sudo curl -L -o /usr/share/icons/hicolor/256x256/apps/typo.png \
  https://raw.githubusercontent.com/yuler/typo/main/resources/logo.png

sudo vim /usr/share/applications/typo.desktop
```

```text
[Desktop Entry]
Name=Typo
Exec=/home/<USER>/Applications/typo.appimage --no-sandbox
Icon=typo
Type=Application
Categories=Utility;TextEditor;
```

### Wayland (VS Code)

VS Code needs X11 mode:
```bash
code --ozone-platform=x11
```

Or edit `~/.local/share/applications/code.desktop`:
```text
Exec=/usr/share/code/code %F --ozone-platform=x11
```

### Ollama

- [Ollama API Docs](https://github.com/ollama/ollama/blob/main/docs/api.md)
