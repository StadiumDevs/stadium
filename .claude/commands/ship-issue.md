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

## 6b. UI verification (stadium-tester) — mandatory

**This step is required before any PR is opened. No scenarios = no PR.**

Extract the `## Test scenarios` section from the issue (`gh issue view $ARGUMENTS --json body | jq -r .body`).

- **Zero scenarios** — stop. Comment on the issue (`gh issue comment $ARGUMENTS --body "…"`) asking the author to add scenarios using the template format. Do not invent scenarios. Do not open the PR.
- **Scenarios exist** — proceed.

Preflight the tester:
- Run `bash .claude/skills/stadium-tester/setup.sh` if `client/node_modules/@playwright/test` doesn't exist. The script is idempotent — safe to run every time.

Decide target URL:
- Preferred: the Vercel preview URL for the current branch (after push). Must have `window.__STADIUM_MOCK__ === true`.
- Fallback: local dev (`http://localhost:5173`) started with `cd client && VITE_USE_MOCK_DATA=true npm run dev` so the mock dataset is in use.

Invoke the `stadium-tester` Skill:

```
/stadium-tester <target-url> "<scenarios markdown verbatim>"
```

Interpret the Skill's output:
- **All PASS** — continue to step 7.
- **Any FAIL** — return to the `stadium-implementer` with the failing scenarios + the tester's root-cause hints. Re-run `/pre-pr-check` and `stadium-tester` after the fix. **Do not open the PR with failing UI verifications. No exceptions.**
- **SKIPPED (needs-auth-harness)** — OK to proceed, but the PR body must list every skipped scenario and note that manual verification is required for SIWS-gated flows.

Paste the tester's full markdown report into the PR body under `## UI verification` (step 8).

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

## UI verification (stadium-tester)
<Paste the tester's full markdown report here. Scenarios column must match
the issue's `## Test scenarios` bullets verbatim. PR cannot be opened
without this section populated.>

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
