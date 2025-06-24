> [!WARNING]
> Still in early development

---

# typo

An AI-powered desktop tool that helps you write better English with smart suggestions and corrections.

## Screenshots

![screenshot](./shots/screen.png)

## Development

```bash
pnpm install
pnpm dev
```

## Usage

1. Select any text you want to improve
2. Press `Ctrl/Cmd + Shift + X` to open the AI interface
3. Wait for the response and replace the selected content

## Features

- Support for DeepSeek & Ollama AI models
- Global hotkey activation
- Real-time text processing

## FAQ

### macOS

- Run: `xattr -cr /Applications/typo.app`
- Enable accessibility permission for the app

### Ollma

- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)

## Roadmap

- [x] Improve main window UI with streaming responses
- [x] Mac Accessibility permission request
- [ ] Add an upgrade notification alert for quick updates
- [ ] When the window appears, keep it centered, or position it near the current cursor location.
- [ ] Add an option to stop streaming responses and improve other UE, like hiding the window.
- [ ] Core interaction optimization
- [ ] More settings available
- [ ] Add system tray menu
- [ ] Ctrl+1 to 5 for custom prompts
- [ ] Add some rules for Cursor
