# `core/` — Rails 8 Scaffold

- **Date**: 2026-04-22
- **Status**: Approved (design)
- **Scope**: Scaffold only — no business features

## Goal

Add `core/` at the repo root as the Rails 8 monolith ("brain") for future backend services. This spec delivers **only the scaffold, monorepo wiring, CI, and documentation**. No product features (LLM proxy, accounts, telemetry, etc.) are in scope; each will be a follow-up spec.

## Non-Goals

- No LLM proxy, no authentication/accounts, no billing, no telemetry.
- No deployment target (no Kamal config, no server provisioning, no hosted database).
- No Tailwind or CSS bundler beyond Rails defaults (Propshaft + plain CSS).
- No integration with `apps/desktop` or `apps/www`.
- No change to `pnpm-workspace.yaml` (Ruby projects do not participate in pnpm workspaces).

## Tech Stack (decisions)

| Area            | Choice                                          |
| --------------- | ----------------------------------------------- |
| Ruby            | Latest stable `3.4.x`, pinned via `.ruby-version` |
| Rails           | Latest stable `8.0.x`                           |
| Database        | SQLite (development / test / production)        |
| Background jobs | Solid Queue (Rails 8 default)                   |
| Cache           | Solid Cache (Rails 8 default)                   |
| Cable           | Solid Cable (Rails 8 default)                   |
| Assets          | Propshaft (Rails 8 default)                     |
| JS              | Importmap (no bundler)                          |
| Test framework  | Minitest (Rails default) + system tests via Capybara/Selenium |
| Lint            | `rubocop-rails-omakase` (Rails default)         |
| Security scan   | Brakeman + Importmap audit (Rails default)      |
| Container       | `Dockerfile` kept (Rails default)               |
| Deploy tooling  | **Skipped**: Kamal, Thruster                    |

## Generation Command

From the repo root:

```bash
rails new core \
  --database=sqlite3 \
  --skip-kamal \
  --skip-thruster
```

All other Rails 8 defaults are accepted (Solid stack, Importmap, Propshaft, Minitest, rails-omakase, Brakeman, Dockerfile, `/up` health endpoint).

## Monorepo Integration

### Directory placement

`core/` lives at the repo root, **outside** `apps/*` and `packages/*` globs — it is a Ruby project, not a pnpm workspace.

### Root `package.json` — thin npm wrappers

Append to `scripts` (placed after `www:*`, keeping existing alphabetical-by-workspace style):

```json
"core:dev": "cd core && bin/dev",
"core:test": "cd core && bin/rails test",
"core:console": "cd core && bin/rails console",
"core:lint": "cd core && bin/rubocop",
"core:lint:fix": "cd core && bin/rubocop -A"
```

Rationale:

- Mirrors the `desktop:*` / `www:*` / `languages:*` convention already in `package.json`.
- Upholds the `AGENTS.md` convention "run all scripts from the repo root".
- `bin/dev` is Rails 8's `foreman`-based launcher (Procfile.dev).
- `core:lint` is **not** wired into the root `pnpm lint` (ESLint): RuboCop and ESLint have separate scopes.
- Brakeman is intentionally **not** exposed as a top-level script — it is covered by CI, and can be run ad hoc with `cd core && bin/brakeman`.

## CI

Move Rails' generated `core/.github/workflows/ci.yml` to the repo root at `.github/workflows/core-ci.yml` with three changes:

1. **Path filter** — only run when `core/` or this workflow changes:
   ```yaml
   on:
     pull_request:
       paths:
         - 'core/**'
         - '.github/workflows/core-ci.yml'
     push:
       branches: [main]
       paths:
         - 'core/**'
         - '.github/workflows/core-ci.yml'
   ```
2. **`defaults.run.working-directory: core`** — every `run` step executes inside `core/` without repeating `cd core`.
3. **`ruby/setup-ruby@v1`** with `bundler-cache: true` and `working-directory: core` so it picks up `core/.ruby-version` and `core/Gemfile.lock`.

Jobs preserved from the Rails default template (unchanged otherwise):

- `scan_ruby` — Brakeman
- `scan_importmap` — `bin/importmap audit`
- `lint` — `bin/rubocop`
- `test` — `bin/rails db:test:prepare test test:system`

Headless Chrome setup for system tests is kept even though no system tests exist yet — it is harmless and avoids a later CI amendment.

## Documentation Updates

### `AGENTS.md`

- Normalize the tree entry for `core/` (currently `|-- core`) to:
  ```
  ├── core/                # Rails 8 monolith (backend services)
  ```
  placed directly above `├── apps/`.
- Remove the "`core/` … planned but not yet in the tree" note (line 27).
- Setup section: append after the existing `.nvmrc` / pnpm / Rust sentence —
  > `core/` uses Ruby (version pinned in `core/.ruby-version`) and Rails 8; run `bundle install` inside `core/` to install gems.
- NPM Scripts section: insert under the `pnpm languages:<cmd>` bullet —
  > `pnpm core:<cmd>` — commands for the `core/` Rails app (e.g. `dev`, `test`, `lint`, `console`).
- Code Style section: append a sentence —
  > `core/` uses RuboCop (rails-omakase); it is independent from the ESLint scope and is not run by `pnpm lint`.

### `.agents/skills/setup/SKILL.md`

Add a section "Ruby & Rails (`core/`)" with these steps:

1. Install Ruby using any manager that reads `.ruby-version` (mise / rbenv / asdf / chruby).
2. `cd core && bundle install`.
3. `bin/rails db:prepare` (creates the SQLite databases).
4. Back at the repo root, verify with `pnpm core:dev` (expect `http://localhost:3000` to show the Rails welcome page).

### `README.md`

No changes. `README.md` is user-facing; `core/` has no user-visible behavior yet. Revisit when a real endpoint lands.

### `core/README.md`

Use Rails' generated README as-is. Do not author a custom one for a scaffold-only state.

## File Inventory (what lands in git)

- `core/` — full Rails 8 app tree as generated (Gemfile, Gemfile.lock, `bin/*`, `app/`, `config/*`, `db/*`, `test/*`, `public/*`, `storage/.keep`, `log/.keep`, `Dockerfile`, `.rubocop.yml`, `.ruby-version`, `.dockerignore`, `.gitignore`, etc.).
- `.github/workflows/core-ci.yml` — relocated + path-filtered CI.
- `package.json` — 5 new scripts.
- `AGENTS.md` — 4 small edits described above.
- `.agents/skills/setup/SKILL.md` — 1 new section.

Explicit **absences**:

- No `core/config/deploy.yml` (Kamal skipped).
- No `bin/thrust` / Thruster gem (Thruster skipped).
- No `core/.github/` directory (CI lives at the repo root).

## Acceptance Criteria

The scaffold is "done" when all of the following hold:

1. `core/` exists; `cd core && bin/rails --version` reports `Rails 8.0.x`; `ruby --version` resolves via `core/.ruby-version`.
2. From the repo root, `pnpm core:dev` serves `http://localhost:3000` (Rails welcome) and `http://localhost:3000/up` returns HTTP 200.
3. From the repo root, `pnpm core:test` passes.
4. From the repo root, `pnpm core:lint` passes with zero offenses.
5. `cd core && bin/brakeman --no-pager` reports zero warnings.
6. A PR that touches only `core/**` triggers `core-ci`; a PR that touches only `apps/www/**` does **not** trigger `core-ci`.
7. `core/config/database.yml` uses SQLite for all environments; `config/cache.yml`, `config/queue.yml`, `config/cable.yml` use the Solid adapters (Rails 8 defaults).
8. `core/config/importmap.rb` exists and `cd core && bin/importmap` runs without error.
9. `AGENTS.md` and `.agents/skills/setup/SKILL.md` match the updates in this spec.
10. `core/config/deploy.yml` does **not** exist; `core/bin/thrust` does **not** exist; `core/Dockerfile` **does** exist.

## Out of Scope (deferred to future specs)

- LLM proxy endpoint (hide provider keys, streaming, rate limiting).
- Desktop authentication & device tokens.
- Release manifest hosting (currently served by `apps/www`).
- Telemetry / logging pipeline.
- Prompt library sync.
- Production deployment (Kamal or alternative).
- `apps/desktop` or `apps/www` wiring to `core/`.
