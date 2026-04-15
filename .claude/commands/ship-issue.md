---
description: Ship a GitHub issue end-to-end — explore, plan, wait for approval, implement, test, open draft PR. Never merges.
argument-hint: <issue-number>
---

You have been asked to ship GitHub issue **#$ARGUMENTS** in this repo.

This command is the full agentic workflow. Follow it exactly. Do not skip steps.

## 0. Preflight

- Confirm `gh` is installed: `gh --version`. If not, stop and tell the user to install it (`brew install gh`).
- Confirm the working tree is clean: `git status`. If dirty, stop and ask.
- Confirm you are NOT on `main` or `develop`. If you are, create a feature branch first: `git checkout -b feat/issue-$ARGUMENTS` (or a descriptive name based on the issue title).
- Read `CLAUDE.md` and `docs/AGENT_GUIDE.md` if you have not already in this session.

## 1. Read the issue

```bash
gh issue view $ARGUMENTS --json number,title,body,labels,url
```

Extract: goal, acceptance criteria, files hinted, out-of-scope notes. If any of these are missing and the issue is non-trivial, stop and ask the user to flesh out the issue using the feature-request template.

## 2. Explore

Use the `stadium-explorer` subagent with thoroughness matching issue scope (quick / medium / very thorough). Goal: map which files will be touched and which existing utilities to reuse.

## 3. Plan

Write a plan covering:
- Goal restated in your own words
- Files to change (paths, not placeholders)
- New files to create (if any)
- Utilities you will reuse (paths)
- Tests to add (paths)
- Invariants at risk and how you'll preserve them
- Out-of-scope items you noticed (will go to backlog)

Post the plan to the user. **Stop and wait for explicit approval.** Do not write code until the user says go. Phrases like "looks good", "ship it", "approved", "proceed" count as approval; anything else does not.

## 4. Implement

Delegate to the `stadium-implementer` subagent with the approved plan. It will:
- Make the minimal diff
- Reuse existing utilities
- Preserve invariants
- Add tests

## 5. Review

Run the `stadium-reviewer` subagent against the diff. Address any **Blockers** before continuing. Record **Backlog** items via `/log-improvement`.

## 6. Pre-PR check

Run `/pre-pr-check`. It executes:
- `cd server && npm test`
- `cd client && npm run build`
- `cd client && npm run lint`

If any fail, fix the code. Never skip, never use `--no-verify`.

## 6b. UI verification (stadium-tester)

Extract the `## Test scenarios` section from the issue (read with `gh issue view $ARGUMENTS --json body`). If the issue has zero scenarios listed, pause and ask the user to add them — do not invent scenarios. If scenarios exist, start the local dev server (or wait for Vercel preview if the branch is pushed) and invoke the `stadium-tester` subagent with:

- Target URL (preview URL if available, else `http://localhost:5173`)
- The scenario bullets verbatim
- This PR number (if a PR exists yet)

Interpret the tester's output:
- **All PASS** — continue.
- **Any FAIL** — return to the `stadium-implementer` with the failing scenarios + the tester's root-cause hints. Re-run `/pre-pr-check` and `stadium-tester` after the fix. Do not open the PR with failing UI verifications.
- **SKIPPED (needs-auth-harness)** — OK to proceed; note it in the PR body.

## 7. Commit and push

Create a commit (or small series of commits) with a clear message referencing the issue:

```
<type>: <short summary>

Closes #$ARGUMENTS
```

Do NOT add a `Co-Authored-By` trailer — it's not wanted in this repo.

Push the branch: `git push -u origin <branch>`.

## 8. Open draft PR

```bash
gh pr create --draft --base develop \
  --title "<type>: <summary>" \
  --body "$(cat <<'EOF'
## Summary
<1-3 bullets>

Closes #$ARGUMENTS

## Test plan
- [x] `cd server && npm test` — pass
- [x] `cd client && npm run build` — pass
- [x] `cd client && npm run lint` — pass
- [x] `stadium-tester` — <N scenarios pass, M skipped>

## Backlog items logged
- <list or "none">

## Invariants verified
- [ ] BYPASS_ADMIN_CHECK still false
- [ ] Admin routes still use auth.middleware.js
- [ ] No new console.log in client
- [ ] No new Supabase imports
EOF
)"
```

Report the PR URL to the user.

## 9. Wait for preview

Vercel auto-builds a preview for every pushed branch. After pushing, wait ~1–3 minutes for the Vercel GitHub bot to post a preview URL on the PR:

```bash
gh pr view <pr-number> --comments | grep -i "vercel\|preview"
```

Once found, paste the preview URL into the PR body under the `## Preview` section (replacing the placeholder). Previews run with `VITE_USE_MOCK_DATA=true`, so fixtures from `client/src/lib/mockWinners.ts` stand in for the real API — confirm the feature renders on the preview before handing off.

If the preview doesn't show the feature correctly because the mock data is missing a case (e.g. a new field you added), either extend `mockWinners.ts` as part of this PR or log a backlog entry and note the preview gap in the PR body.

## 10. Stop

You are done. **Do not merge.** Do not flip the PR out of draft. A human CODEOWNER reviews and merges.

If you noticed improvements along the way and logged them to `docs/improvement-backlog.md`, mention that in your final message.
