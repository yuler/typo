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

<video src="https://github.com/user-attachments/assets/521a5285-aaaf-4f00-8012-1277904c2c27" controls playsinline width="720"></video>

## Key Features

- **Multi-Model Support**: Works with DeepSeek and local Ollama models.
- **Global Hotkeys**: Quick activation with `Ctrl/Cmd + Shift + X`.
- **Intelligent Pasting**: Uses clipboard-based replacement for maximum compatibility across applications.
- **Customizable Prompts**: Tailor AI behavior via system prompts and define custom shortcut commands.

## Documentation

For full usage instructions, authentication details, configuration guides, and FAQs, please visit the official documentation:

👉 **[typo Documentation](https://typo.yuler.cc)**

## Construct

```
.
├── .agents/skills/      # Reusable skills for AI agents
├── .github/workflows/  # CI pipelines
├── apps/               # Client-facing apps
│   ├── desktop/       # Tauri + Vue 3 (main product)
│   ├── intro-video/   # Remotion intro video (rendered into www/public)
│   └── www/           # Astro (marketing / SEO)
├── packages/          # Shared code across apps
│   ├── languages/     # i18n utilities and translation bundles
│   └── utils/         # Shared helpers and constants
├── scripts/           # Repo-wide automation scripts
├── package.json      # Workspaces and top-level scripts
└── README.md
```

## Setup

Requires [mise](https://mise.jdx.dev). Install toolchains (Node from `.nvmrc`, pnpm from `package.json`, Ruby from `core/.ruby-version`) and project dependencies:

```bash
mise install
mise run setup
```

For the Tauri desktop app, also install [Rust](https://rustup.rs) and the [platform prerequisites](https://tauri.app/start/prerequisites/).

### Run the desktop app

```bash
mise run desktop:dev
```

## Release flow

- `pnpm bump` to version and tag the release.
- `pnpm release:notes` to update the release notes in `latest.json`.
- `pnpm releases:pull` to `packages/releases`, edit the data, then `pnpm releases:push` to update the marketing website.
- `pnpm www:deploy` to deploy the www website
