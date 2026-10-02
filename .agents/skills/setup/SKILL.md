---
name: setup
description: Sets up the typo monorepo development environment via mise. Installs Node.js, pnpm, and Ruby from `.mise.toml`, runs `mise run setup` for workspace and Rails deps, and optionally installs the Rust toolchain for the Tauri desktop app. Use when the user asks to set up the project, bootstrap a fresh clone, install dependencies, or resolves environment errors running `pnpm`, `cargo`, `tauri`, or `bin/rails` commands.
---

# setup

## Purpose

Bring a fresh clone of the `typo` monorepo to a working state using [mise](https://mise.jdx.dev): correct Node.js, pnpm, and Ruby; workspace and Rails deps installed; Rust installed when working on the Tauri desktop app.

## When to use

Use this skill when:

- The user asks to "set up", "bootstrap", or "install everything".
- A fresh clone needs its environment prepared.
- Commands like `pnpm install`, `mise run desktop:dev`, `cargo`, `tauri`, or `mise run core:dev` fail because the toolchain is missing or the wrong version.

Do not use this skill for:

- Publishing releases or CI config. Use dedicated release/CI workflows instead.
- Installing OS-level Tauri prerequisites in depth — link to Tauri docs instead of trying to automate system package installs.

## Source of truth

- Tool versions and setup tasks: `.mise.toml` at the repo root.
  - Node.js: from `.nvmrc` (for example `v24.8.0`).
  - pnpm: from `packageManager` in root `package.json` (for example `pnpm@10.33.0`).
  - Ruby: from `core/.ruby-version` (read the file; do not invent a version).
- Rust: stable toolchain from [`rustup`](https://rustup.rs) (not managed by mise).

Never hardcode versions in the skill output. Read them from the files above when reporting to the user.

## Workflow

1. **Detect current state**
   - Confirm [mise](https://mise.jdx.dev) is installed (`mise --version`). If missing, install it and ask the user to activate it in their shell before continuing.
   - Run `node -v`, `pnpm -v`, `ruby -v`, `rustc --version`, `cargo --version` and note what is missing or mismatched.
   - Read `.mise.toml`, `.nvmrc`, and `package.json` to know the expected versions.

2. **Install toolchains with mise**
   - From the repo root:
     ```bash
     mise install
     ```
   - This installs Node, pnpm, and Ruby as declared in `.mise.toml`.
   - Verify: `node -v`, `pnpm -v`, and `ruby -v` match the pinned files.

3. **Install project dependencies**
   - From the repo root:
     ```bash
     mise run setup
     ```
   - This runs `pnpm install` and `./core/bin/setup --skip-server` (Bundler + Rails db prepare).

4. **Install Rust (only if the user will work on the desktop app)**
   - Install the stable toolchain via `rustup`:
     ```bash
     curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
     ```
   - Reload the shell or `source "$HOME/.cargo/env"`, then verify:
     ```bash
     rustc --version
     cargo --version
     ```
   - Remind the user that Tauri also needs **platform-specific system dependencies** (WebKit, build tools). Link to <https://tauri.app/start/prerequisites/> instead of automating OS package installs.

5. **Smoke test**
   - Only after the steps above, suggest:
     ```bash
      mise run desktop:dev
     ```
   - If it fails on native build, the fix is almost always a missing Tauri system dependency from the link above.
   - For the Rails app, optionally:
     ```bash
      mise run core:dev
     ```

## Rules

- Prefer mise over fnm/nvm/Corepack/`npm i -g pnpm`; `.mise.toml` is the single entry point.
- Always derive versions from `.mise.toml` / `.nvmrc` / `package.json` / `core/.ruby-version`; do not invent versions.
- Do not install Rust unless the user is touching `apps/desktop/` or Tauri build output.
- Do not skip `mise run setup` when the user needs Rails/`core/` — it prepares gems and the database.
- Do not attempt to install OS-level Tauri prerequisites automatically — point the user to the official prerequisites page.
- Run commands from the repo root unless a step explicitly requires a subdirectory.

## Quick reference

```bash
# Install mise: https://mise.jdx.dev

# Toolchains from .mise.toml (Node, pnpm, Ruby)
mise install

# Workspace + Rails deps
mise run setup

# Rust (only for desktop app)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Run apps
mise run desktop:dev
mise run core:dev
```
