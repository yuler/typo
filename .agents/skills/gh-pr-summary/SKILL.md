---
name: gh-pr-summary
description: Refreshes GitHub pull request title and description (summary body) from the branch’s commits and diff, then applies updates with `gh pr edit`. Use when the user asks to refresh, rewrite, regenerate, or sync PR title or PR body with the branch, or when working with `gh pr`.
---

# gh-pr-summary

## Purpose

Use this skill to refresh an existing GitHub pull request so the title and body match the actual commits and diff on the branch.

## Workflow

1. Identify the PR.
   - Prefer the current branch PR.
   - If multiple PRs could apply, ask the user which PR to update.

2. Gather PR context with `gh`.
   - Read the current PR title, body, base branch, and head branch.
   - Review the commits included in the PR.
   - Review the PR diff when commit subjects alone are too vague.

3. Derive the new title.
   - Summarize the dominant change across the PR commits.
   - Keep the title short, action-oriented, and specific.
   - Avoid copying a single weak commit subject when the branch tells a clearer story.

4. Derive the new body.
   - Summarize the change in `## Summary`.
   - Capture verification steps in `## Test plan`.
   - Base the body on the actual branch content, not on generic filler.

5. Update the PR with `gh pr edit`.
   - Show the proposed title and body briefly before editing unless the user explicitly asked for direct application without review.

## Rules

- Prefer `gh pr view`, `gh pr diff`, and `gh pr edit`.
- Use commit history as the starting point, but inspect the diff when the commits are noisy, squashed, or incomplete.
- Do not invent testing steps. If testing is unclear, say so in `## Test plan`.
- Keep the title under roughly 72 characters when possible.
- Keep the body concise and easy to scan.

## Output Shape

Use this structure for the PR body:

```markdown
## Summary
- Bullet describing the main change
- Bullet describing supporting change or scope

## Test plan
- [ ] Not run locally
```

Read [reference.md](reference.md) for command patterns and title/body guidance.
