# Reference

## Command Pattern

Use `gh` for the PR itself and `git` for commit summarization.

```bash
gh pr view --json number,title,body,baseRefName,headRefName,url
git log --reverse --format='%s' origin/<base-branch>..HEAD
gh pr diff
```

If the current branch does not map cleanly to a PR, inspect PRs for the branch first:

```bash
gh pr list --head "$(git branch --show-current)"
```

Update the PR with:

```bash
gh pr edit <pr-number> --title "new title" --body "$(cat <<'EOF'
## Summary
- ...

## Test plan
- [ ] Not run locally
EOF
)"
```

## Title Guidance

Write a title that reflects the branch as a whole:

- Start with a strong verb such as `fix`, `add`, `update`, `refactor`, or `document`.
- Prefer the user-facing or reviewer-relevant outcome over internal implementation detail.
- Combine related commit themes into one coherent statement.
- Avoid vague titles such as `updates`, `misc fixes`, or `address feedback`.

Good patterns:

- `fix broken PR refresh workflow`
- `update PR summaries from branch commits`
- `refactor GitHub PR description generation`

## Body Guidance

The body should be a compact reviewer aid, not a changelog dump.

Use:

```markdown
## Summary
- State the main behavior or workflow change
- Mention important supporting changes, constraints, or scope

## Test plan
- [ ] Not run locally
```

When the branch clearly includes verification, replace the default test item with real checks such as:

```markdown
## Test plan
- [x] Ran unit tests for PR metadata generation
- [x] Verified `gh pr edit` updates title and body as expected
```

## Decision Rule

Use this order when generating the refreshed PR copy:

1. Current PR diff and file changes
2. Commit subjects and commit bodies
3. Existing PR title and body as context only

If the existing PR copy conflicts with the branch contents, prefer the branch contents.
