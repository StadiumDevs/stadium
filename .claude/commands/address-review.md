---
description: Fetch review comments on a PR, address each one (code change or reply), push updates, and post a summary. Never flips draft → ready.
argument-hint: <pr-number>
---

Address outstanding review feedback on PR **#$ARGUMENTS**.

## 0. Preflight

- `gh --version` — fail fast if missing.
- `gh auth status` — must be logged in.
- `git fetch origin` — make sure local is current.
- `gh pr view $ARGUMENTS --json state,isDraft,headRefName,baseRefName,mergeable` — confirm the PR is still open and check out its head branch locally if you aren't already on it.

If the PR is closed/merged or you can't check out its branch cleanly, stop and tell the user.

## 1. Pull all feedback

Two separate GitHub endpoints, both matter:

```bash
# General PR-level comments (timeline)
gh pr view $ARGUMENTS --comments

# Inline review comments (line-anchored on specific files)
gh api repos/StadiumDevs/stadium/pulls/$ARGUMENTS/comments --paginate

# Review summaries and change-requested reviews
gh api repos/StadiumDevs/stadium/pulls/$ARGUMENTS/reviews --paginate
```

Merge into a single list. For each item capture: `id`, `author`, `path:line` (if inline), `body`, and whether the thread already has a reply from the PR author (skip those — treat as resolved).

## 2. Decide per comment

For each unresolved comment, classify:

- **CODE** — requires a code change. Add to a change batch.
- **REPLY** — valid but needs only an explanation (e.g. "this is intentional because…"). Add to reply batch.
- **REJECT** — disagree. Still add to reply batch with a clear, polite reason.
- **SKIP** — nit that's already addressed elsewhere in the diff, or a question answered by existing docs. Note it but don't act.

Present the full classification to the user **before** making any code changes. Wait for approval. Do not silently rewrite code the reviewer didn't ask you to touch.

## 3. Address CODE items

- Make the smallest correct change for each item. No drive-by refactors.
- Group into one commit if the changes are coherent, or one commit per comment if they're independent.
- Commit message(s) reference the comment (`addresses review comment <id>`).
- Run `/pre-pr-check`. If it fails, fix before pushing.

## 4. Push

```bash
git push
```

No `--force`, no `--force-with-lease` unless the user explicitly asked. No branch rename.

## 5. Reply in GitHub

For inline comments with a reply, use the review-comments reply endpoint:

```bash
gh api \
  repos/StadiumDevs/stadium/pulls/$ARGUMENTS/comments/<comment-id>/replies \
  -f body="<reply text>"
```

For PR-level items, `gh pr comment $ARGUMENTS --body "<text>"`.

Reply text should be short and specific: "Fixed in `<commit-sha>` — <1-line summary>" or "Keeping as-is because <reason>".

## 6. Post a summary comment

Once all individual replies are in, post one rollup PR comment:

```bash
gh pr comment $ARGUMENTS --body "$(cat <<'EOF'
## Review addressed

| Comment | Action | Commit |
|---------|--------|--------|
| @reviewer on src/foo.ts:42 | Fixed | abc1234 |
| @reviewer on src/bar.ts:10 | Kept as-is — <reason> | — |
| ... | ... | ... |

`/pre-pr-check`: pass / fail (details).
EOF
)"
```

## 7. Stop

You are done. **Do not** run `gh pr ready $ARGUMENTS` (flip to ready-for-review), do not merge, do not re-request review. Reviewer decides.

Report the summary comment URL and each commit SHA back to the user.
