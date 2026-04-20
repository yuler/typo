---
name: gh-pr-create
description: Creates a new GitHub pull request with `gh pr create` using title and body from the branch commits and diff. If the current branch is main or master, checks out a new branch whose name is a short kebab-case slug derived from the changes, then proceeds. PR title is one simple sentence over all commits in the range, preserving emoji from those commits. Use when opening a new PR, running `gh pr create`, or publishing a branch without an existing PR.
---

# gh-pr-create

## Purpose

Use this skill to open a **new** pull request whose title and body are derived from the current branch. The body follows [gh-pr-summary](../gh-pr-summary/SKILL.md#output-shape) structure; the title is a single plain sentence rolled up from every commit in the range.

If a PR for this branch already exists, prefer refreshing it with `gh pr edit` and the **gh-pr-summary** skill instead.

## Workflow

1. **Leave `main` / `master` before a PR**
   - If the current branch is `main` or `master`, **do not** run `gh pr create` from it.
   - Infer a **simple branch name** from the work: use `git status`, `git diff` / staged diff, and any local commits ahead of `origin/<default>` to capture the dominant change.
   - Use a short **kebab-case** ASCII slug (e.g. `fix-oauth-redirect`, `add-pr-create-skill`). Strip emoji and punctuation from the slug; keep it readable and specific.
   - Run `git switch -c <slug>` (or `git checkout -b <slug>`), then `git push -u origin HEAD`.
   - If there is nothing to commit yet, stop and ask the user to commit on the new branch first; a PR needs at least one commit on the head branch.

2. **Preconditions**
   - Confirm the head branch is pushed to `origin` (or the remote the user uses with `gh`).
   - Check for an existing PR: `gh pr list --head "$(git branch --show-current)"`. If one exists, stop and recommend **gh-pr-summary** unless the user explicitly wants a second PR (unusual).

3. **Choose base branch**
   - Default to the repo default branch (`main` or `master`) unless the user names another base.
   - Use that base for comparing commits and diff: `origin/<base>..HEAD`.

4. **Gather context**
   - Commits: `git log --reverse --format='%s%n%b' "origin/<base>..HEAD"` (or equivalent range if not using `origin`).
   - Diff: `git diff "origin/<base>...HEAD"` when commit subjects are vague, noisy, or squashed.
   - Do not use **git-commit**’s staged-diff script for the full PR: that script reflects the index only. Branch-wide PR copy must reflect the range against the base branch.

5. **Derive the title**
   - Read **all** commit subjects (and bodies if needed) in `origin/<base>..HEAD`.
   - Compress them into **one simple sentence** that covers the branch as a whole.
   - If any included commits use emoji in the subject, **keep those emoji** in the title when they still match the summary (do not strip them).
   - Use the diff when commit lines are too noisy or contradictory to form one clear sentence.
   - Prefer to keep the title short; GitHub tolerates longer lines but aim for clarity over length.

6. **Derive the body**
   - Same structure as **gh-pr-summary**: `## Summary` bullets, then `## Test plan`.
   - Base content on the branch, not generic filler.
   - Do not invent tests; if unknown, use a clear placeholder in **Test plan**.

7. **Create the PR**
   - Run `gh pr create` with `--base`, `--title`, and `--body` (see [reference.md](reference.md)).
   - Show the proposed title and body briefly before running the command unless the user asked to apply without review.
   - Add `--draft` when the user wants a draft PR.

## Rules

- Prefer `gh pr create`, `gh pr list`, `git log`, and `git diff` for context.
- Never open a PR with `main` or `master` as head; branch off first with a change-derived slug, then push.
- Title is one sentence summarizing all commits, preserving commit emoji when present; body rules follow **gh-pr-summary**.
- Do not use **git-commit**’s staged-diff script as the sole source for PR scope (it is index-only).

## Output shape (body)

Use this structure for the PR body:

```markdown
## Summary
- Bullet describing the main change
- Bullet describing supporting change or scope

## Test plan
- [ ] Not run locally
```

Read [reference.md](reference.md) for `gh pr create` examples and title guidance.
