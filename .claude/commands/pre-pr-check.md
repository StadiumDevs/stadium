---
description: Run the full pre-PR verification suite — server tests + lint, client build (typecheck) + production-bundle check, client lint. Blocks PR on any failure.
---

Run the verification suite that must pass before a PR is opened. Report each step's result.

## Steps

Run these four commands in parallel and capture output:

1. `cd server && npm test` — Vitest server tests
2. `cd server && npm run lint` — ESLint data-access rule: only `server/api/repositories/` may touch Supabase; no `mongoose`
3. `cd client && npm run build && npm run check:bundle` — TypeScript + Vite build (this is the typecheck), then fail if dev accounts or the test-wallet harness reached the production bundle
4. `cd client && npm run lint` — ESLint with `--max-warnings 0`

## Output contract

Report as:
```
server tests:  PASS | FAIL (<n> failed)
server lint:   PASS | FAIL (<n> errors)
client build:  PASS | FAIL
client bundle: PASS | FAIL (<hits>)
client lint:   PASS | FAIL (<n> warnings)
```

If **any** step failed:
- Do not proceed to opening a PR.
- Paste the failing output for the user.
- If the caller is `/ship-issue`, return control to the implementer with the failure — do not disable tests, skip lint, or use `--no-verify`.
- If the failure looks environmental (missing env vars), say so explicitly rather than claiming a code bug. Server tests mock Supabase, so a real database is never needed for them.

If all four pass, report `All checks passed. Safe to open PR.` and stop.
