> [!WARNING]
> Still in early development

---

# typo

> An AI-powered desktop tool that helps you write better English with smart suggestions and corrections.

[Download](https://github.com/yuler/typo/releases)

## Screenshots

Screenshot

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

## Linux Wayland: Typo global shortcuts

On Wayland, the built-in global shortcut is not registered for you. Add a shortcut manually:

1. Open **Settings → Keyboard → Custom Shortcuts** (wording may differ slightly by desktop).
2. Create a new shortcut that runs Typo with selection capture, for example:

   ```bash
   typo --selection
   ```

   Use the full path to the Typo binary or AppImage if `typo` is not on your `PATH`.

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

This section applies to **Linux Wayland only**.

Set up a system shortcut:

1. Open `Settings -> Keyboard -> Custom Shortcuts`
2. Add a shortcut command: `typo --selection`
3. Set keys to: `Ctrl + Shift + X`

In Linux Wayland sessions, use this system shortcut instead of relying on app-level global shortcuts.

If selection capture still fails in specific apps (for example some Electron apps), running that app in X11 (XWayland) can be an optional workaround.

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

https://copyq.readthedocs.io/en/stable/known-issues.html#on-linux-global-shortcuts-pasting-or-clipboard-monitoring-does-not-work

你好

### wayland

My solution that works.

**Add your user to group input**

```
usermod -aG input <USER>
```

**Add udev rule for `uinput`**

```
echo '## ydotoold fix
##     https://github.com/ReimuNotMoe/ydotool/issues/25#issuecomment-535842993
KERNEL=="uinput", GROUP="input", MODE="0660", OPTIONS+="static_node=uinput"
' | sudo tee /etc/udev/rules.d/80-uinput.rules > /dev/null
```

**Autostart ydotool**
`/home/<USER>/.config/autostart/ydotoold.desktop`

```
[Desktop Entry]
Type=Application
Terminal=false
Name=ydotool deamon
Exec=/usr/bin/ydotoold
Comment=Generic Linux command-line automation tool (no X!).
Categories=GNOME;GTK;System;
```

```bash
sudo apt install dex
dex ~/.config/autostart/ydotoold.desktop
```
