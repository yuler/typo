---
name: gh-pr-review-fix
description: Reads GitHub PR review feedback (inline threads, AI assistants such as Gemini, bots, or humans), implements justified changes, replies on each thread with a short technical note, and resolves conversations. Use when the user wants to address PR review comments, clear review threads, or work through suggestions on an open pull request.
---

# gh-pr-review-fix

## Goal

Turn open review feedback into concrete code changes, then close the loop on GitHub: **reply** on each thread (or the relevant comment) and **resolve** the conversation when the suggestion is fully addressed.

## Principles

- **Verify before implementing.** Treat AI and human reviewers the same: check the suggestion against the codebase; push back in the reply if it is wrong or out of scope. Prefer technical reasoning over empty agreement; if the **receiving-code-review** skill is available, use it before blindly applying feedback.
- **One thread at a time** when threads depend on each other; batch only when independent.
- **Resolve only after** the fix is pushed (or explained why not changing), and the reply documents what changed.

## Prerequisites

- Repo is a git checkout with the PR branch checked out (or the user specifies branch/PR).
- [GitHub CLI](https://cli.github.com/) `gh` installed and authenticated: `gh auth status`.

## Workflow

Copy and track progress:

```
PR review fixes:
- [ ] Identify PR number and base branch; ensure local branch matches the PR
- [ ] List unresolved review threads and top-level review comments
- [ ] For each item: understand → verify → implement or decline with reason
- [ ] Commit and push
- [ ] Reply on each addressed thread; resolve conversation
- [ ] Summarize for the user what was fixed vs declined
```

### 1. Identify the PR

```bash
gh pr status
# or
gh pr view <number> --json number,title,headRefName,baseRefName,url
```

Check out the head branch if needed:

```bash
gh pr checkout <number>
```

### 2. List review feedback

**Conversation view (good for humans):**

```bash
gh pr view <number> --comments
```

**Structured JSON (scripts / parsing):**

```bash
gh pr view <number> --json reviews,comments,reviewThreads
```

Use `reviewThreads` when available in your `gh` version; it exposes thread state and supports resolving via API. If a field is missing, use GraphQL (below) or the PR **Files changed** tab on the web for inline threads.

### 3. Implement

- Map each comment to files/lines; make minimal, correct edits.
- Run project tests or linters the repo expects.
- Commit with a clear message; push to the PR branch.

### 4. Reply and resolve

**Reply to an inline review comment** (REST):

```bash
gh api repos/{owner}/{repo}/pulls/{pr}/comments/{comment_id}/replies -f body="Brief note: what changed (e.g. extracted helper, added test). Link commit if useful."
```

`comment_id` must be a **top-level** thread comment, not a reply. List candidates: `gh api repos/{owner}/{repo}/pulls/{pr}/comments --jq '.[] | {id, in_reply_to_id, path, body}'`.

**Resolve a review thread** (GraphQL):

```bash
gh api graphql -f query='
mutation($id: ID!) {
  resolveReviewThread(input: { threadId: $id }) {
    thread { isResolved }
  }
}' -f id='THREAD_NODE_ID'
```

Obtain `THREAD_NODE_ID` with:

```bash
gh api graphql -f query='
query($owner: String!, $repo: String!, $n: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $n) {
      reviewThreads(first: 100) {
        nodes { id isResolved path line comments(first: 1) { nodes { body author { login } } } }
      }
    }
  }
}' -f owner='OWNER' -f repo='REPO' -f n=PR_NUMBER
```

Resolve only threads where `isResolved` is false and the work is done.

**If GraphQL is awkward:** reply via REST, then resolve the thread in the GitHub PR UI; still leave the same concise reply text in the skill output for the user to paste if needed.

### 5. Reply text guidelines

- **Short and specific:** what you changed, where, or why you did not change it.
- **No performative praise** of the reviewer; stay factual.
- **Optional:** `Fixed in <commit-sha>` when one commit maps cleanly to the thread.

Example:

> Addressed: moved validation into `parseInput` and added a unit test in `parseInput.test.ts`. Resolving thread.

Example (decline):

> Not adopting: this would duplicate existing error handling in `middleware/errors.ts`. Prefer keeping a single path; happy to adjust if you want a different shape.

## Edge cases

| Situation | Action |
|-----------|--------|
| Suggestion is wrong or harmful | Reply with reasoning; do not resolve unless the thread can be closed by agreement—sometimes leave open for reviewer. |
| Same issue repeated on multiple lines | One fix; reply on one thread, reference the others, resolve all when your `gh`/GraphQL flow allows. |
| Outdated diff after push | Re-read thread context on latest commit; reply noting superseded line numbers if needed. |
| Only top-level review, no inline threads | Reply with a single PR comment summarizing batch fixes: `gh pr comment <number> -b "..."`. |
