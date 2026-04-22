---
name: setup
description: Sets up the typo monorepo development environment. Installs Node.js via fnm/nvm from `.nvmrc`, enables Corepack so the pnpm version pinned in `package.json#packageManager` is used, installs workspace dependencies with `pnpm install`, installs the Rust toolchain required by the Tauri desktop app, and optionally Ruby for the `core/` Rails app. Use when the user asks to set up the project, bootstrap a fresh clone, install dependencies, or resolves environment errors running `pnpm`, `cargo`, `tauri`, or `bin/rails` commands.
---

# setup

## Purpose

Bring a fresh clone of the `typo` monorepo to a working state: correct Node.js, correct pnpm, workspace deps installed, Rust installed for the Tauri desktop app, and Ruby + Bundler for the `core/` Rails app when needed.

## When to use

Use this skill when:

- The user asks to "set up", "bootstrap", or "install everything".
- A fresh clone needs its environment prepared.
- Commands like `pnpm install`, `pnpm desktop:dev`, `cargo`, `tauri`, or `pnpm core:dev` fail because the toolchain is missing or the wrong version.

Do not use this skill for:

- Publishing releases or CI config. Use dedicated release/CI workflows instead.
- Installing OS-level Tauri prerequisites in depth — link to Tauri docs instead of trying to automate system package installs.

## Source of truth

- Node.js version: `.nvmrc` at the repo root (for example `v24.8.0`).
- pnpm version: `packageManager` field in root `package.json` (for example `pnpm@10.33.0`).
- Rust: stable toolchain from [`rustup`](https://rustup.rs).
- Ruby: version from `core/.ruby-version` (read the file; do not invent a version).

Never hardcode versions in the skill output. Read them from the files above when reporting to the user.

## Workflow

1. **Detect current state**
   - Run `node -v`, `pnpm -v`, `rustc --version`, `cargo --version` and note what is missing or mismatched.
   - Read `.nvmrc` and `package.json` to know the expected Node and pnpm versions.

2. **Install / select Node.js from `.nvmrc`**
   - Prefer `fnm`; fall back to `nvm` if the user already uses it.
   - With `fnm`:
     ```bash
     fnm install
     fnm use
     ```
   - With `nvm`:
     ```bash
     nvm install
     nvm use
     ```
   - If neither is installed, recommend `fnm` (faster, Rust-based) and link to <https://github.com/Schniz/fnm>. Do not auto-install a version manager without the user's ok.

3. **Enable Corepack and activate the pinned pnpm**
   - Corepack ships with Node.js and reads `packageManager` from `package.json`.
     ```bash
     corepack enable
     corepack prepare --activate
     ```
   - `corepack prepare --activate` (no version) activates the exact `pnpm@<version>` from `package.json`.
   - Verify: `pnpm -v` should match the version in `packageManager`.

4. **Install workspace dependencies**
   - From the repo root:
     ```bash
     pnpm install
     ```

5. **Install Rust (only if the user will work on the desktop app)**
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

6. **Install Ruby and gems (only if the user will work on `core/`)**
   - Read `core/.ruby-version` for the expected Ruby version.
   - Install Ruby with any manager that respects that file (`mise`, `rbenv`, `asdf`, `chruby`). Example with `mise`:
     ```bash
     mise install Ruby@"$(cat core/.ruby-version)"   # skip if already installed
     ./core/bin/setup --skip-server
     ```
   - Verify from the repo root:
     ```bash
     pnpm core:test
     pnpm core:lint
     ```

7. **Smoke test**
   - Only after the steps above, suggest:
     ```bash
     pnpm desktop:dev
     ```
   - If it fails on native build, the fix is almost always a missing Tauri system dependency from the link above.
   - For the Rails app, optionally:
     ```bash
     pnpm core:dev
     ```

## Rules

- Always derive Node and pnpm versions from `.nvmrc` and `package.json`; do not invent versions.
- Prefer Corepack over `npm i -g pnpm`; the pinned version must win.
- Do not install Rust unless the user is touching `apps/desktop/` or Tauri build output.
- Do not install Ruby unless the user is touching `core/` or running Rails commands.
- Do not attempt to install OS-level Tauri prerequisites automatically — point the user to the official prerequisites page.
- Run commands from the repo root unless a step explicitly requires a subdirectory.

## Quick reference

```bash
# Node from .nvmrc
fnm install && fnm use            # or: nvm install && nvm use

# pnpm from package.json#packageManager
corepack enable
corepack prepare --activate

# Workspace deps
pnpm install

# Rust (only for desktop app)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Run the desktop app
pnpm desktop:dev

# Ruby & Rails (core/) — only when working on the backend
mise install Ruby@"$(cat core/.ruby-version)"
./core/bin/setup --skip-server
pnpm core:dev
```

