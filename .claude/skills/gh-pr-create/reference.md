# Reference

## On `main` or `master`

```bash
current="$(git branch --show-current)"
# If current is main or master: derive <slug> from git diff / status / unpushed commits, then:
git switch -c "<slug>"
git push -u origin HEAD
```

Branch names should be short kebab-case ASCII (no emoji). After this, treat `<base>` as the branch you left (usually `main`).

## Preconditions

```bash
git branch --show-current
git push -u origin HEAD   # if upstream missing
gh pr list --head "$(git branch --show-current)"
```

If `gh pr list` shows a PR, use **gh-pr-summary** to update it instead of creating another.

## Gather branch context

Replace `<base>` with the target branch (e.g. `main`):

```bash
git fetch origin "<base>" 2>/dev/null || true
git log --reverse --format='%s%n%b' "origin/<base>..HEAD"
git diff "origin/<base>...HEAD"
```

## Create the PR

```bash
gh pr create --base "<base>" --title "✨ Add auth and fix session expiry (from commits)" --body "$(cat <<'EOF'
## Summary
- Main behavior or workflow change
- Supporting changes or scope

## Test plan
- [ ] Not run locally
EOF
)"
```

Draft PR:

```bash
gh pr create --draft --base "<base>" --title "..." --body "$(cat <<'EOF'
...
EOF
)"
```

## Title from commits

- List every commit in the range, then write **one simple sentence** that summarizes the combined intent.
- If commit subjects already contain emoji, **retain** them in the title when they still fit the rolled-up meaning (e.g. leading emoji from the dominant commit, or multiple themes joined naturally).
- Do not invent emoji solely for decoration; only keep what appeared in the commit history when appropriate.

## Body guidance

Same as **gh-pr-summary**: compact reviewer aid, `## Summary` then `## Test plan`. Replace the default test line with real checks when the branch clearly includes verification.

## Decision order when generating copy

1. Diff and file changes for `origin/<base>...HEAD`
2. Commit subjects and bodies in that range
3. Any existing local notes from the user

Prefer branch facts over assumptions.
