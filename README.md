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

## Wayland: Typo global shortcuts

- On Wayland, Typo prefers **XDG Desktop Portal** `GlobalShortcuts` when the compositor or session exposes it.
- The first time this path is used, the system may show a permission or shortcut-binding dialog.
- This needs `xdg-desktop-portal` and a suitable portal backend on the host (for example GNOME or KDE). AppImage builds do not include these components.
- If portal registration fails, Typo falls back to the global-shortcut plugin, which may still not receive shortcuts when the focused app is a native Wayland client.
- Portal API reference: [org.freedesktop.portal.GlobalShortcuts](https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.GlobalShortcuts.html).
- Environment-variable workarounds that force **target applications** (for example editors) onto XWayland stay in the existing **Linux** FAQ: [Wayland Compatibility (e.g., VS Code)](#linux) (same subsection as the `xeyes` / VS Code notes).

### Error: “A portal frontend implementing `org.freedesktop.portal.GlobalShortcuts` was not found”

`xdg-desktop-portal` is running, but **no installed backend** advertises the **GlobalShortcuts** D-Bus API (or your compositor’s integration is missing). Typo cannot bind Wayland global shortcuts through the portal until you add a matching backend.

Install **one** stack that fits your session (then **log out and back in**):

| Session | Typical packages |
|--------|-------------------|
| GNOME on Debian/Ubuntu | `sudo apt install xdg-desktop-portal-gnome` |
| KDE on Debian/Ubuntu | `sudo apt install xdg-desktop-portal-kde` |
| Sway / other wlroots | `sudo apt install xdg-desktop-portal-wlr` |
| Hyprland | `sudo apt install xdg-desktop-portal-hyprland` (name varies by distro) |
| Fedora GNOME | `sudo dnf install xdg-desktop-portal-gnome` |
| Arch | `pacman -S xdg-desktop-portal-gnome` (or `-kde`, `-hyprland`, `-wlr`, …) |

Verify the interface exists (optional):

```bash
gdbus introspect --session --dest org.freedesktop.portal.Desktop --object-path /org/freedesktop/portal/desktop 2>/dev/null | grep -i GlobalShortcuts || true
```

Until a backend is available, use Typo **Settings → Global shortcut backend → Plugin only** if you need the legacy global-hotkey path (with Wayland limitations described above).

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

