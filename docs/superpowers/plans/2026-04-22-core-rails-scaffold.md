# `core/` Rails 8 Scaffold — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a Rails 8 monolith at `core/` in the repo root, wire it into the monorepo (pnpm scripts + CI + docs), no business features.

**Architecture:** `core/` is a standalone Ruby project — *not* a pnpm workspace. A thin layer of root-level `pnpm core:*` scripts wraps `bin/rails`. A single `.github/workflows/core-ci.yml` (relocated from Rails' generated template) runs scan / lint / test with a `core/**` path filter.

**Tech Stack:** Ruby 3.4.x, Rails 8.0.x, SQLite, Solid Queue / Solid Cache / Solid Cable, Importmap, Propshaft, Minitest, RuboCop rails-omakase, Brakeman, Dockerfile. Kamal and Thruster **skipped**.

**Spec:** [`docs/superpowers/specs/2026-04-22-core-rails-scaffold-design.md`](../specs/2026-04-22-core-rails-scaffold-design.md)

---

## Prerequisites Snapshot (verify once before starting)

Run these from the repo root and confirm each returns non-empty/current:

```bash
pwd                    # ends in /typo
git status --short     # clean or only intended WIP
node --version         # any — only needed for pnpm wrappers
pnpm --version         # per package.json packageManager (pnpm 10.x)
```

If Ruby is not yet installed, Task 1 handles it.

---

## Task 1: Install Ruby Toolchain

**Files:**
- None in this task — install to developer machine only. Final state is verified via shell.

**Why:** Rails generation requires Ruby + `rails` gem. The spec pins Ruby via `.ruby-version` (generated in Task 2), so we install the same major.minor now and let the file confirm the patch.

- [ ] **Step 1: Pick or confirm a Ruby version manager**

Any of these is fine (the `.ruby-version` file is tool-agnostic): `mise`, `rbenv`, `asdf`, `chruby`, `rvm`. Prefer whatever already exists on the machine.

Check what's installed:
```bash
command -v mise rbenv asdf chruby rvm 2>/dev/null
```

If none, install `mise` (lightest, modern, no shell integration surprises on macOS):
```bash
brew install mise
mise --version
```

- [ ] **Step 2: Install Ruby 3.4.x (latest patch)**

With `mise`:
```bash
mise use --global ruby@3.4
ruby --version
```

Expected: `ruby 3.4.x ...`

(If using `rbenv`: `rbenv install 3.4.5 && rbenv global 3.4.5`. Substitute the actual latest 3.4 patch from `rbenv install -l | grep '^ *3\.4'`.)

- [ ] **Step 3: Install the `rails` gem globally**

```bash
gem install rails
rails --version
```

Expected: `Rails 8.0.x`

If the installed Rails is not 8.0+, explicitly pin:
```bash
gem install rails -v '~> 8.0'
rails --version
```

- [ ] **Step 4: Verify — no commit in this task**

This task produces no repo changes. Proceed to Task 2.

**Satisfies acceptance criteria:** (prerequisite for #1)

---

## Task 2: Generate the Rails 8 App

**Files:**
- Create: `core/**` (full Rails 8 tree)

- [ ] **Step 1: Confirm you are at the repo root**

```bash
pwd
```

Expected path ends in `/typo`. `ls` should show `apps/`, `packages/`, `package.json`, `AGENTS.md`, and **not** `core/`.

- [ ] **Step 2: Generate the Rails app**

```bash
rails new core \
  --database=sqlite3 \
  --skip-kamal \
  --skip-thruster
```

This creates `core/` with the full Rails 8 tree, runs `bundle install` automatically, and initializes a git repo *inside* `core/`.

- [ ] **Step 3: Remove the nested `core/.git` directory**

Rails' generator runs `git init` inside the new app. We want the files tracked by the outer repo, not a nested repo.

```bash
rm -rf core/.git
```

Verify:
```bash
ls -la core | grep -E '\.git$' && echo "STILL NESTED" || echo "clean"
```

Expected: `clean`.

- [ ] **Step 4: Confirm the expected files exist**

Run and check each `echo`:
```bash
test -f core/Gemfile                     && echo "Gemfile OK"
test -f core/.ruby-version               && echo ".ruby-version OK"
test -f core/Dockerfile                  && echo "Dockerfile OK"
test -f core/config/database.yml         && echo "database.yml OK"
test -f core/config/cache.yml            && echo "cache.yml OK"
test -f core/config/queue.yml            && echo "queue.yml OK"
test -f core/config/cable.yml            && echo "cable.yml OK"
test -f core/config/importmap.rb         && echo "importmap.rb OK"
test -f core/.github/workflows/ci.yml    && echo "ci.yml OK (to relocate in Task 4)"
test ! -f core/config/deploy.yml         && echo "no deploy.yml (Kamal skipped)"
test ! -f core/bin/thrust                && echo "no bin/thrust (Thruster skipped)"
```

Every line must print its `OK` / `no …` message. If any fails, stop and investigate before proceeding.

- [ ] **Step 5: Spot-check Solid adapters are wired**

```bash
grep -E 'solid_queue|solid_cache|solid_cable' core/Gemfile
```

Expected: all three gem names present.

- [ ] **Step 6: Commit the generated scaffold**

```bash
git add core/
git commit -m "✨ Generate Rails 8 scaffold at core/

- rails new core --database=sqlite3 --skip-kamal --skip-thruster
- Solid Queue/Cache/Cable, Importmap, Propshaft, Minitest
- Dockerfile kept; Kamal and Thruster skipped"
```

**Satisfies acceptance criteria:** #1 (partial — version check in Task 3), #7, #8, #10.

---

## Task 3: Verify the Generated App Boots

**Files:** None modified; verification only.

- [ ] **Step 1: Install gems from lockfile**

`rails new` already ran `bundle install`, but re-run to confirm a clean state:

```bash
cd core && bundle install && cd ..
```

Expected: `Bundle complete!` with no errors.

- [ ] **Step 2: Prepare databases**

```bash
cd core && bin/rails db:prepare && cd ..
```

Expected: creates `core/storage/development.sqlite3`, `test.sqlite3`, and the Solid Queue / Cache / Cable schema databases (Rails 8 defaults put these in `core/storage/`).

- [ ] **Step 3: Confirm versions match the spec**

```bash
cd core && bin/rails --version && ruby --version && cd ..
```

Expected:
- `Rails 8.0.x`
- `ruby 3.4.x ...`

Record the exact patch versions shown — `core/.ruby-version` now pins Ruby, and `core/Gemfile.lock` pins Rails.

- [ ] **Step 4: Boot the server and probe it**

In one terminal:
```bash
cd core && bin/rails server
```

In another:
```bash
curl -sI http://localhost:3000/up | head -n 1
curl -s  http://localhost:3000/    | grep -qi 'rails' && echo "welcome page OK"
```

Expected:
- `HTTP/1.1 200 OK` from `/up`
- `welcome page OK` from `/`

Stop the server (`Ctrl-C`).

- [ ] **Step 5: Run the default test suite**

```bash
cd core && bin/rails test && cd ..
```

Expected: `0 runs, 0 assertions, 0 failures, 0 errors, 0 skips` (or similar zeroed output — fresh scaffolds have no tests).

- [ ] **Step 6: Run the linter**

```bash
cd core && bin/rubocop && cd ..
```

Expected: `no offenses detected`.

- [ ] **Step 7: Run Brakeman**

```bash
cd core && bin/brakeman --no-pager && cd ..
```

Expected: `No warnings found`.

- [ ] **Step 8: No commit — verification only**

If any check failed, fix the cause (often a missing system dep for a gem) and re-run; do not proceed with a broken scaffold.

**Satisfies acceptance criteria:** #1, #2, #3, #4, #5.

---

## Task 4: Relocate and Path-Filter the CI Workflow

**Files:**
- Delete: `core/.github/workflows/ci.yml`
- Delete: `core/.github/` (directory, once empty)
- Create: `.github/workflows/core-ci.yml` (based on the Rails-generated content)

- [ ] **Step 1: Read the generated workflow**

```bash
cat core/.github/workflows/ci.yml
```

Note its structure — you'll port the same jobs (`scan_ruby`, `scan_importmap`, `lint`, `test`) into the relocated file.

- [ ] **Step 2: Create the relocated workflow**

Write `.github/workflows/core-ci.yml`. Start from the content of `core/.github/workflows/ci.yml` (same jobs, same step contents), but apply these three differences at the top level and in each job:

1. Replace the `name:` line with `name: core-ci`.
2. Replace the `on:` block with:
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
3. Add a top-level `defaults` block so every `run:` executes in `core/`:
   ```yaml
   defaults:
     run:
       working-directory: core
   ```
4. In every `ruby/setup-ruby@v1` step, add:
   ```yaml
   with:
     bundler-cache: true
     working-directory: core
   ```
   (Keep any other existing `with:` keys from the generated file, e.g. `ruby-version: .ruby-version`.)
5. In every `actions/checkout@...` step, do **not** change it — we want the full repo checkout, not just `core/`.

Leave all other job content (step names, commands like `bin/brakeman --no-pager`, `bin/importmap audit`, `bin/rubocop -f github`, `bin/rails db:test:prepare test test:system`, and the headless-Chrome setup) untouched.

- [ ] **Step 3: Delete the original generated workflow**

```bash
rm core/.github/workflows/ci.yml
rmdir core/.github/workflows core/.github
```

Verify the directory is gone:
```bash
test ! -d core/.github && echo "removed"
```

- [ ] **Step 4: Validate YAML parses**

```bash
python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/core-ci.yml')); print('YAML OK')"
```

Expected: `YAML OK`. If Python isn't available, any YAML linter works; as a last resort, visually confirm indentation matches the structure above.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/core-ci.yml core/.github
git commit -m "👷 Relocate core CI to .github/workflows/core-ci.yml

- Move Rails-generated ci.yml from core/.github to repo-root .github
- Add paths filter so it only runs on core/** changes
- Add defaults.run.working-directory: core
- ruby/setup-ruby uses working-directory: core for lockfile discovery"
```

**Satisfies acceptance criteria:** #6.

---

## Task 5: Add Root `package.json` Scripts

**Files:**
- Modify: `package.json` (append 5 entries to `scripts`)

- [ ] **Step 1: Locate the insertion point**

Open `package.json` and find the `scripts` object. The existing order is roughly `desktop:* → www:* → bump → clean → lint*/format:fix → languages:* → release:notes → releases:* → deps:up`. Insert the new entries as a new block **between `www:deploy` and `bump`**, matching the existing `desktop:*` / `www:*` style.

- [ ] **Step 2: Add the 5 scripts**

Add exactly these 5 lines inside the `scripts` object, preserving surrounding commas:

```json
"core:dev": "cd core && bin/dev",
"core:test": "cd core && bin/rails test",
"core:console": "cd core && bin/rails console",
"core:lint": "cd core && bin/rubocop",
"core:lint:fix": "cd core && bin/rubocop -A",
```

- [ ] **Step 3: Validate JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('JSON OK')"
```

Expected: `JSON OK`.

- [ ] **Step 4: Smoke-test each new script resolves**

```bash
pnpm run core:test
```

Expected: the test suite runs (0 runs / 0 failures). This confirms `pnpm` finds the script and `cd core && bin/rails` works.

```bash
pnpm run core:lint
```

Expected: `no offenses detected`.

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "🔧 Add root pnpm scripts for core (dev/test/console/lint/lint:fix)

Thin wrappers over bin/rails matching the existing desktop:*/www:*
convention, so all commands can be invoked from the repo root."
```

**Satisfies acceptance criteria:** (enabling condition for #2, #3, #4 via pnpm).

---

## Task 6: Update `AGENTS.md`

**Files:**
- Modify: `AGENTS.md`

There are **four** edits. Apply each precisely.

- [ ] **Step 1: Normalize the `core/` line in the directory tree**

Open `AGENTS.md`, find the block under `## Directory Structure` that looks like:

```
├── .github/workflows/   # CI pipelines
|-- core                 # The rails server for backend services
├── apps/                # Client-facing apps
```

Replace the middle line (note the ASCII `|--`) with the proper tree character and a clearer comment:

```
├── core/                # Rails 8 monolith (backend services)
```

Order: keep it directly between `.github/workflows/` and `apps/`.

- [ ] **Step 2: Remove the "not yet in the tree" note**

Find and delete the paragraph:

```
> `core/` (the former server, to be repositioned as the monolith "brain") is planned but not yet in the tree. Do not reference it in code or docs until it lands.
```

Delete the entire blockquote line plus any adjacent blank line that would leave a double blank.

- [ ] **Step 3: Extend the Setup section**

In the `## Setup` section (around line 29–31), append a new sentence to the existing paragraph. The existing paragraph currently ends with "…and the Rust toolchain for Tauri." Append after it:

> `core/` uses Ruby (pinned in `core/.ruby-version`) and Rails 8; run `bundle install` inside `core/` to install gems.

- [ ] **Step 4: Add a `pnpm core:*` bullet in NPM Scripts**

In the `## NPM Scripts` section, after the bullet:

```
- `pnpm languages:<cmd>` — commands for `packages/languages` (e.g. `build`, `test`).
```

Insert a new bullet:

```
- `pnpm core:<cmd>` — commands for the `core/` Rails app (e.g. `dev`, `test`, `lint`, `console`).
```

- [ ] **Step 5: Clarify the lint boundary in Code Style**

In the `## Code Style & Formatting` section, append a new bullet at the end of the bullet list:

```
- `core/` uses RuboCop (rails-omakase); it is independent from the ESLint scope and is not run by `pnpm lint`.
```

- [ ] **Step 6: Verify the file still parses as clean Markdown**

Skim the diff: no stray `|--`, no dangling blockquote, no double blank lines.

```bash
git diff AGENTS.md
```

- [ ] **Step 7: Commit**

```bash
git add AGENTS.md
git commit -m "📝 Document core/ Rails app in AGENTS.md

- Normalize directory tree entry
- Remove 'planned but not yet in the tree' note
- Document Ruby/Rails setup expectation
- Document pnpm core:<cmd> scripts
- Clarify RuboCop is separate from the ESLint scope"
```

**Satisfies acceptance criteria:** #9 (partial — setup skill in Task 7).

---

## Task 7: Update `.agents/skills/setup/SKILL.md`

**Files:**
- Modify: `.agents/skills/setup/SKILL.md`

- [ ] **Step 1: Read the current setup skill**

```bash
cat .agents/skills/setup/SKILL.md
```

Note the existing sections and their headings style (e.g. `##` or `###` for each tool).

- [ ] **Step 2: Add a new section "Ruby & Rails (`core/`)"**

Append the following section at the end of the file (or place it adjacent to the other toolchain sections, matching the heading level already in use — match whichever heading depth the Rust section uses, typically `##`):

```markdown
## Ruby & Rails (`core/`)

`core/` is a Rails 8 app at the repo root. Its Ruby version is pinned in `core/.ruby-version`; install Ruby with any manager that reads that file (`mise`, `rbenv`, `asdf`, `chruby`).

1. Install Ruby:
   ```bash
   # With mise (example)
   mise install ruby
   ```
2. Install gems:
   ```bash
   cd core && bundle install
   ```
3. Prepare SQLite databases:
   ```bash
   bin/rails db:prepare
   ```
4. Verify from the repo root:
   ```bash
   pnpm core:dev
   # then: open http://localhost:3000
   ```

Tests and lint:

```bash
pnpm core:test
pnpm core:lint
```
```

Adjust heading level (`##` vs `###`) to match the surrounding sections in the file before saving.

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/setup/SKILL.md
git commit -m "📝 Document Ruby & Rails setup in setup skill"
```

**Satisfies acceptance criteria:** #9.

---

## Task 8: Full Acceptance-Criteria Sweep

**Files:** None modified; verification only.

Walk through each of the 10 acceptance criteria from the spec and execute the check. This is the gate between "done on my machine" and "ready to push".

- [ ] **AC-1: Rails 8 and Ruby pinned**

```bash
cd core && bin/rails --version && ruby --version && cd ..
```
Expected: `Rails 8.0.x` and `ruby 3.4.x ...`

- [ ] **AC-2: `pnpm core:dev` serves welcome + `/up` green**

Terminal A: `pnpm core:dev`
Terminal B:
```bash
curl -sI http://localhost:3000/up | head -n 1
curl -s  http://localhost:3000/    | grep -qi 'rails' && echo "welcome OK"
```
Expected: `HTTP/1.1 200 OK` and `welcome OK`. Stop the server.

- [ ] **AC-3: `pnpm core:test` passes**

```bash
pnpm core:test
```
Expected: `0 failures, 0 errors`.

- [ ] **AC-4: `pnpm core:lint` passes**

```bash
pnpm core:lint
```
Expected: `no offenses detected`.

- [ ] **AC-5: Brakeman clean**

```bash
cd core && bin/brakeman --no-pager && cd ..
```
Expected: `No warnings found`.

- [ ] **AC-6: CI path filter works**

Inspect the workflow:
```bash
grep -A4 'paths:' .github/workflows/core-ci.yml
```
Confirm both `pull_request:` and `push:` triggers list `core/**` and `.github/workflows/core-ci.yml`. (Real on-GitHub verification happens when the PR is opened.)

- [ ] **AC-7: Solid adapters + SQLite everywhere**

```bash
grep -E 'adapter: *sqlite3' core/config/database.yml | wc -l   # expect 3 (dev/test/prod)
grep -E 'solid_(queue|cache|cable)' core/config/{queue,cache,cable}.yml
```
Expected: 3 SQLite adapter entries; each Solid config references its solid_* adapter.

- [ ] **AC-8: Importmap wired**

```bash
test -f core/config/importmap.rb && echo "importmap.rb OK"
cd core && bin/importmap && cd ..
```
Expected: file present; `bin/importmap` prints its help/usage without error.

- [ ] **AC-9: Docs updated**

```bash
grep -q 'pnpm core:<cmd>' AGENTS.md && echo "AGENTS scripts OK"
grep -q 'core/' AGENTS.md && echo "AGENTS tree OK"
grep -qi 'ruby' .agents/skills/setup/SKILL.md && echo "setup skill OK"
```
Expected: all three `OK` lines.

- [ ] **AC-10: Kamal/Thruster absent, Dockerfile present**

```bash
test ! -f core/config/deploy.yml && echo "no Kamal OK"
test ! -f core/bin/thrust        && echo "no Thruster OK"
test -f core/Dockerfile          && echo "Dockerfile OK"
```
Expected: all three `OK` lines.

- [ ] **Final step: No commit if all pass**

If any criterion fails, fix in place and re-run the failing check. If you had to amend a prior commit's output, prefer a new corrective commit over `--amend`.

**Satisfies acceptance criteria:** all (verification).

---

## Task 9: Push Branch and Open PR

**Files:** None.

- [ ] **Step 1: Confirm clean working tree**

```bash
git status
```
Expected: `nothing to commit, working tree clean`.

- [ ] **Step 2: Review the commit series**

```bash
git log --oneline origin/main..HEAD
```

Expected commits (order matches the tasks above):

1. `✨ Generate Rails 8 scaffold at core/`
2. `👷 Relocate core CI to .github/workflows/core-ci.yml`
3. `🔧 Add root pnpm scripts for core (dev/test/console/lint/lint:fix)`
4. `📝 Document core/ Rails app in AGENTS.md`
5. `📝 Document Ruby & Rails setup in setup skill`

- [ ] **Step 3: Push and open the PR**

Use the `gh-pr-create` skill (`.claude/skills/gh-pr-create/SKILL.md`) to publish the branch and open a PR with a generated title and body drawn from the commits above.

**Satisfies acceptance criteria:** (delivery).

---

## Self-Review Notes

- **Spec coverage:** Each of the spec's 10 acceptance criteria is explicitly checked in Task 8; each spec section (§1 file inventory → Task 2; §2 scripts → Task 5; §3 CI → Task 4; §4 docs → Tasks 6–7; §5 acceptance → Task 8) has a task.
- **Placeholder scan:** No `TBD`, no "handle edge cases", no "similar to Task N". Every code/config change shows the exact text or the exact grep/test command.
- **Type consistency:** Script names `core:dev`, `core:test`, `core:console`, `core:lint`, `core:lint:fix` are used identically in Tasks 5, 6, 7, 8. Workflow filename `core-ci.yml` is used identically in Tasks 4, 6, 8.
