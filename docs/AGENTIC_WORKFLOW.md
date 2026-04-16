# Stadium — Agentic Workflow

This repo has an agentic workflow built around Claude Code. Any contributor (human or agent) can ship a GitHub issue end-to-end following the loop documented here. The goal: issues become draft PRs without stepping on any of the invariants in `CLAUDE.md`.

Read this alongside:
- `CLAUDE.md` (repo root) — architecture, invariants, the contract an agent obeys
- `docs/AGENT_GUIDE.md` — deeper reference (data flow, SIWS, testing patterns, deployment)

---

## One-time setup

Do these once per machine (or once per fresh clone):

1. **Install the GitHub CLI and authenticate.**
   ```bash
   brew install gh
   gh auth login        # pick GitHub.com → HTTPS → login via browser
   ```
   The workflow uses `gh` for issue and PR operations.

2. **Install the UI tester's browser.**
   ```bash
   bash .claude/skills/stadium-tester/setup.sh
   ```
   Installs `@playwright/test` into `client/node_modules` and downloads Chromium (~150MB). Idempotent — safe to run again.

3. **Restart Claude Code in this project.**
   Skills under `.claude/skills/` are loaded at startup. A fresh session picks them up.

4. **Verify the tester is wired up.**
   In Claude Code:
   ```
   /verify-tester
   ```
   It checks Node + Playwright, tests that the production-URL guard works, and offers a live smoke test.

5. **Confirm the Vercel preview env var is set.**
   Vercel dashboard → Project settings → Environment Variables → `VITE_USE_MOCK_DATA = true`, Environment = **Preview**, Branch = **All Preview Branches**. Production leaves it unset. This makes every branch's preview run on fixtures (`client/src/lib/mockWinners.ts`) rather than hitting production data.

---

## The standard flow

### Step 0 — file the issue

In GitHub, open a new issue using the **Feature request** or **Bug report** template. Every section is load-bearing, but the most important one for agents is:

```
## Test scenarios

- [ ] On <route>, <action> → <expected state>
- [ ] On <route>, <action> → <expected state>
```

The `stadium-tester` Skill verifies each bullet in a real browser. Without scenarios, `/ship-issue` refuses to open a PR. Write scenarios as observable facts about the UI, not vague acceptance ("admin panel works" is useless; "on `/admin`, filter by M2 → Plata Mia row shows `+ M2 grant` badge" is good).

### Step 1 — start the workflow

In Claude Code, run:

```
/ship-issue <issue-number>
```

### Step 2 — the agent plans, then stops

- Reads the issue (`gh issue view`).
- Maps affected files via the `stadium-explorer` subagent.
- Posts a written plan to the conversation.
- **Stops and waits.** Do not write code until you approve.

Approvals: "ship it", "approved", "looks good", "proceed". Anything else = no code.

### Step 3 — the agent implements

- Creates a feature branch off `origin/develop`.
- Hands the plan to the `stadium-implementer` subagent.
- Commits reference the issue (`Closes #N`).

### Step 4 — the agent verifies (two gates, both must pass)

1. **`/pre-pr-check`** — runs `cd server && npm test`, `cd client && npm run build`, `cd client && npm run lint`.
2. **`/stadium-tester`** — drives a real headless Chromium against the local dev server or the Vercel preview, walks each `## Test scenario`, produces a pass/fail markdown report.

If either gate fails, the agent returns to the implementer, fixes, re-runs. **No PR opens on a failing gate.**

### Step 5 — the agent opens a DRAFT PR

- Target: `develop`. Always draft.
- Body includes: summary, test plan, tester report, preview URL placeholder, backlog items, invariants checklist.

### Step 6 — you review

- Click the Vercel preview URL (the Vercel bot posts it on the PR within ~1–3 minutes of push).
- Read the `stadium-tester` report in the PR body.
- Visual/UX check with your own eyes on the preview.
- Skim the diff.

### Step 7 — iterate on review feedback

If you leave review comments, run:

```
/address-review <pr-number>
```

The agent:
1. Fetches PR-level and inline comments via `gh`.
2. Classifies each as **CODE** (needs code change), **REPLY** (needs only an explanation), or **REJECT** (disagree, with reason).
3. **Pauses and waits for you to approve the classification.**
4. Makes changes in a batch, runs `/pre-pr-check`, pushes.
5. Replies to each thread and posts a rollup summary comment.
6. Does **not** flip the PR from draft to ready-for-review. That's your call.

### Step 8 — ship

- You flip draft → ready-for-review.
- You merge (rebase, squash, or merge — your call).
- **The agent never merges. The agent is never in CODEOWNERS.** See `.github/CODEOWNERS`.

---

## UI / UX features — what's different

When the change touches user-visible surface, four things change:

### 1. Scenarios carry more weight

Write `## Test scenarios` as observable facts the browser can verify:

- ✅ `On /admin, filter by M2 → at least 4 rows visible`
- ✅ `On /, scroll to "Recently shipped" → Plata Mia card visible`
- ✅ `On /winners, filter by "Main Track" → row count matches header`
- ❌ `Admin panel works`
- ❌ `Payments look correct`

Each bullet becomes one Playwright `test()` block. Vague bullets produce vague (or false) passes.

### 2. The preview runs on mock data

Vercel Preview has `VITE_USE_MOCK_DATA=true`. Reads come from `client/src/lib/mockWinners.ts` (159 sanitized prod projects, regenerated periodically). Writes simulate to `localStorage` and in-memory.

If your feature needs a field that isn't in the fixture, either:
- Extend `mockWinners.ts` as part of the PR (preferred — adds regression coverage), or
- Note the gap in the scenario and mark that scenario SKIPPED.

### 3. The tester is functional, not visual

`stadium-tester` catches:
- ✅ Element presence, text content, DOM structure
- ✅ Click → state change → assertion
- ✅ Console errors during the flow

It does **not** catch:
- ❌ Color, spacing, typography looking wrong
- ❌ Animations janky
- ❌ Responsive breakpoints ugly

Your eyes on the preview are still load-bearing for visual/UX judgment. The tester just keeps you from regressing the functional part while you're judging the visual.

### 4. SIWS / wallet flows are skipped automatically

Scenarios requiring a Polkadot wallet signature (admin auth, confirm payment, approve M2, request changes) return `SKIPPED (needs-auth-harness)`. The tester refuses to fabricate signatures. For those flows, verify manually on the preview and note in the PR body which scenarios were skipped.

### Failure screenshots

When a Playwright test fails, the screenshot lands next to the spec in `/tmp/`. The agent links it in its failure report — always open it before asking for a fix, often it's obvious what broke.

---

## Subagents, skills, and slash commands

Full list lives in `CLAUDE.md §9`. Quick reference:

| Kind | Name | What it does |
|---|---|---|
| Subagent | `stadium-explorer` | Codebase search tuned to this layout |
| Subagent | `stadium-implementer` | Writes code per the approved plan |
| Subagent | `stadium-reviewer` | Pre-PR invariant check |
| Skill | `stadium-tester` | Drives headless Chromium, runs scenarios |
| Command | `/ship-issue <n>` | End-to-end flow for one issue |
| Command | `/triage-issue <n>` | Plan only, posted as issue comment |
| Command | `/address-review <pr>` | Process PR review comments |
| Command | `/log-improvement <desc>` | Append to `docs/improvement-backlog.md` |
| Command | `/promote-backlog` | Convert backlog entries to GitHub issues |
| Command | `/pre-pr-check` | Run server tests + client build + lint |
| Command | `/verify-tester` | Health check for the tester Skill |

---

## What to never do

- Skip `## Test scenarios` on an issue you intend to `/ship-issue` — the workflow bails.
- Push directly to `develop` or `main`.
- Merge an agent PR without clicking the Vercel preview at least once.
- Run the tester against `stadium.joinwebzero.com` or the production Railway host — the runner refuses (exit code `3`), don't try to bypass.
- Flip a PR out of draft before the tester is green.
- Add the agent to `.github/CODEOWNERS`.
- Use `--no-verify` or otherwise skip `/pre-pr-check` failures.
- Hardcode values (admin addresses, magic amounts) instead of reading from schema or env.

---

## When something goes wrong

- **`/verify-tester` fails on fresh clone** → run `bash .claude/skills/stadium-tester/setup.sh` manually and check for npm / Chromium errors.
- **`gh auth login` browser flow blocked** → use `gh auth login --with-token < token.txt` with a personal access token (scopes: `repo`, `workflow`, `read:org`).
- **Tester passes locally but fails on preview** → check `window.__STADIUM_MOCK__` in the preview's devtools; if it's `undefined`, the Vercel env var didn't propagate to that build.
- **Agent flags invariants are violated** → read `CLAUDE.md §4` and the `stadium-reviewer` output before pushing back; the invariants are there because each one caused a production regression once.
- **Issue templates are missing `## Test scenarios`** → someone filed the issue with a blank template; ask them to edit, don't invent scenarios.

---

## Improvements and follow-ups

Open items worth doing live at `docs/improvement-backlog.md`. Use `/log-improvement` during a `/ship-issue` run to add observations without breaking scope. Use `/promote-backlog` (with your confirmation) to convert them into GitHub issues with the `claude-suggested` label.
