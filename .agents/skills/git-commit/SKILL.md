---
name: git-commit
description: Use when the user wants to commit staged changes, asks for a commit message, or wants a concise summary of the staged diff before committing.
---

# git-commit

## Purpose

Use this skill to turn the staged diff into a short, human-readable commit message with a leading emoji, then create the commit without pushing.

This repo prefers the staged-diff helper in this skill over raw `git diff --staged` so common lockfiles do not dominate the summary.

## When to use

Use this skill when:

- The user asks you to commit staged changes.
- The user asks for a commit message based on what is staged.
- The user wants a quick summary of staged work before committing.

Do not use this skill for:

- Pull request titles or PR bodies. Use the PR skills instead.
- Branch-wide summaries based on commit history.
- Unstaged work unless the user first asks you to stage it.

## Commit message format

```text
<emoji> <summary>

[body]
```

Scoped subject:

```text
<emoji> [scope]: <summary>
```

Format details:

- `emoji` is required and should match the dominant change.
- `summary` is required and should be a single concise sentence in present tense and active voice.
- `scope` is required when the current workspace is a monorepo. Use the affected package, app, or subsystem name.
- In a non-monorepo repo, `scope` is optional and should be used only when it adds clarity.
- `body` is optional. Add it only when the reason or impact would be unclear from the subject alone.
- Do not add sign-offs or tool-generated trailers such as `Made-with: Cursor`.
- Focus on the main change, not a changelog of every file.
- Commit only. Do not push.

## Workflow

1. Gather the staged diff with the helper script.
   - Run `skills/git-commit/scripts/git-diff.sh`.
   - Use this output as the primary source for the commit summary.
   - The helper excludes common lockfiles such as `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `bun.lockb`, `Gemfile.lock`, `uv.lock`, `composer.lock`, `go.sum`, and `Cargo.lock`.

2. Stop cleanly when nothing is staged.
   - If the script prints `No changes to commit`, tell the user there are no staged changes and do not run `git commit`.

3. Derive the message from the staged diff.
   - Choose the emoji that best matches the dominant change.
   - If the current workspace is a monorepo, infer the `scope` from the staged paths and include it in the subject.
   - Do not ask the user whether a monorepo commit needs a scope. It does.
   - If multiple staged files map to one package, app, or subsystem, use that name as the scope.
   - If the staged changes span multiple monorepo areas, choose the narrowest honest shared scope instead of omitting scope.
   - Write one short subject line that captures the purpose of the staged work.
   - Add a short body only when the subject alone would hide important context.

4. Commit with safe quoting.
   - Prefer a HEREDOC-backed command so single-line and multi-line messages both work cleanly:

```bash
git commit -F - <<'EOF'
📝 Update commit message guidance
EOF
```

5. Report the result.
   - Confirm the commit succeeded.
   - Do not push unless the user explicitly asks.

## Rules

- Prefer the helper script over raw staged diff commands for message generation.
- Base the message on what is staged now, not on unstaged edits or guesses about future work.
- In a monorepo, always include a `[scope]` in the subject.
- Infer monorepo scope from file paths, package names, or the nearest clear subsystem label instead of asking the user.
- Keep the subject short, specific, and imperative.
- Do not invent extra scope, test claims, or follow-up work in the message body.
- If multiple changes are staged, summarize the dominant theme rather than listing every detail.

## Common emojis

Choose the closest match when there is no perfect option.

| Change type | Emoji | Example |
|-------------|:-----:|---------|
| New feature | ✨ | `✨ Add commit message scope support` |
| Bug fix | 🐛 | `🐛 Fix staged diff parsing for empty output` |
| Documentation | 📝 | `📝 Rewrite git-commit skill guidance` |
| Refactor | ♻️ | `♻️ Simplify commit message selection flow` |
| Tests | ✅ | `✅ Add coverage for emoji mapping` |
| Build / CI | 👷 | `👷 Add workflow for release validation` |
| Performance | ⚡️ | `⚡️ Speed up diff filtering` |
| Configuration | 🔧 | `🔧 Add repo-level commit config` |
| Developer tooling | 🔨 | `🔨 Add staged diff helper script` |
| Dependencies | ⬆️ / ⬇️ / ➕ / ➖ | `⬆️ Upgrade dev dependencies` |
| Text / copy | 💬 | `💬 Update default commit prompt` |
| Minor fix | 🩹 | `🩹 Fix wording in commit output` |
| Breaking change | 💥 | `💥 Change commit config schema` |

If a more specific emoji is clearly better, use it.
