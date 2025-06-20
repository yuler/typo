> [!WARNING]
> Still in early development

---

# typo

An AI-powered desktop tool that helps you write better English with smart suggestions and corrections.

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

- Enable accessibility permission for the app
- Run: `xattr -cr /Applications/typo.app`

### Ollma

- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)

## Roadmap

- [ ] Update app icon
- [ ] Improve main window UI with streaming responses
- [ ] Add system tray menu
- [ ] Enhance settings interface
- [ ] Better error handling for AI API calls
