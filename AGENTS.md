# Agent Guide

Guidance for AI coding agents working in this repository. Prefer the conventions below over general defaults.

## Project Overview

`typo` is an AI-powered desktop tool that refines selected text. This repo is a pnpm monorepo containing the desktop app, the marketing website, and shared packages. See [`README.md`](README.md) for user-facing docs.

## Directory Structure

```
.
├── .agents/skills/      # Reusable skills for AI agents (read before acting)
├── .github/workflows/   # CI pipelines
├── apps/                # Client-facing apps
│   ├── desktop/         # Tauri + Vue 3 (main product)
│   └── www/             # Astro (marketing / SEO)
├── packages/            # Code shared across apps
│   └── languages/       # i18n utilities and translation bundles
├── scripts/             # Repo-wide automation scripts
├── package.json         # Workspaces and top-level scripts
└── README.md
```

> `core/` (the former server, to be repositioned as the monolith "brain") is planned but not yet in the tree. Do not reference it in code or docs until it lands.

## Setup

Follow [`.agents/skills/setup/SKILL.md`](.agents/skills/setup/SKILL.md) to bootstrap Node.js (`.nvmrc`), pnpm (pinned in `package.json#packageManager` via Corepack), workspace deps, and the Rust toolchain for Tauri.

## NPM Scripts

Run all scripts from the repo root. Each workspace is exposed through a `<workspace>:<command>` alias.

- `pnpm desktop:<cmd>` — commands for `apps/desktop` (e.g. `dev`, `build`, `preview`, `tauri`).
- `pnpm www:<cmd>` — commands for `apps/www` (e.g. `dev`, `build`, `preview`, `lint`).
- `pnpm languages:<cmd>` — commands for `packages/languages` (e.g. `build`, `test`).
- `pnpm lint` / `pnpm lint:fix` — ESLint across the workspace.
- `pnpm format:fix` — alias of `lint:fix`; the canonical formatter for this repo.
- `pnpm clean` — clean workspace build artifacts.
- `pnpm deps:up` — interactively update Node.js dependencies via `taze`.

## Code Style & Formatting

- ESLint (via [`@antfu/eslint-config`](eslint.config.js)) is the single source of truth for both linting and formatting. Do not introduce Prettier configs or other formatters.
- `editor.formatOnSave` is intentionally disabled in [`.vscode/settings.json`](.vscode/settings.json). You may run `pnpm format:fix` locally if you want, but it is not required — CI will autofix formatting on PRs.
- CI [`/.github/workflows/pr-format-fix.yml`](.github/workflows/pr-format-fix.yml) auto-commits autofixable formatting issues on PRs.

## Release & Deploy

- `pnpm www:deploy` — build and upload the static marketing site to the server.
- `pnpm bump` — bump the desktop app version and tag a release. CI [`/.github/workflows/desktop-release.yml`](.github/workflows/desktop-release.yml) builds the desktop artifacts and attaches them to the GitHub Release.
- `pnpm release:notes` — (re)generate release notes for the current release.

## Agent Conventions

- Prefer editing existing files over creating new ones; especially avoid adding new top-level docs unless asked.
- Before non-trivial tasks, check `.agents/skills/` for a matching skill and follow it.
- When a task spans multiple workspaces, make changes in the relevant workspace and run that workspace's scripts (e.g. `pnpm desktop:build`) to verify.
- Keep commit messages and PRs scoped to a single concern; don't mix formatting-only changes with logic changes.
