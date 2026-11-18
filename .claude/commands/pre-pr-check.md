---
description: Run the full pre-PR verification suite — server tests, client build (typecheck), client lint. Blocks PR on any failure.
---

Run the verification suite that must pass before a PR is opened. Report each step's result.

## Steps

Run these three commands in parallel and capture output:

1. `cd server && npm test` — Vitest server tests
2. `cd client && npm run build` — TypeScript + Vite build (this is the typecheck)
3. `cd client && npm run lint` — ESLint with `--max-warnings 0`

Then, from the repo root: `node scripts/check-doc-drift.mjs` — fails if CLAUDE.md, the agent docs or `.claude/` name a repo path or `npm run` script that doesn't exist. Fix the doc (or mark an intentional placeholder line with `drift-ignore`).

## Output contract

Report as:
```
server tests:  PASS | FAIL (<n> failed)
client build:  PASS | FAIL
client lint:   PASS | FAIL (<n> warnings)
doc drift:     PASS | FAIL (<n> stale references)
```

If **any** step failed:
- Do not proceed to opening a PR.
- Paste the failing output for the user.
- If the caller is `/ship-issue`, return control to the implementer with the failure — do not disable tests, skip lint, or use `--no-verify`.
- If the failure looks environmental (missing env vars), say so explicitly rather than claiming a code bug. Server tests mock Supabase and do not require MongoDB, so a missing-Mongo error is not the normal cause of an API test failure.

If all three pass, report `All checks passed. Safe to open PR.` and stop.
