---
description: Run the full pre-PR verification suite — server tests, client build (typecheck), client lint. Blocks PR on any failure.
---

Run the verification suite that must pass before a PR is opened. Report each step's result.

## Steps

Run these three commands in parallel and capture output:

1. `cd server && npm test` — Vitest server tests
2. `cd client && npm run build` — TypeScript + Vite build (this is the typecheck)
3. `cd client && npm run lint` — ESLint with `--max-warnings 0`

## Output contract

Report as:
```
server tests:  PASS | FAIL (<n> failed)
client build:  PASS | FAIL
client lint:   PASS | FAIL (<n> warnings)
```

If **any** step failed:
- Do not proceed to opening a PR.
- Paste the failing output for the user.
- If the caller is `/ship-issue`, return control to the implementer with the failure — do not disable tests, skip lint, or use `--no-verify`.
- If the failure looks environmental (missing MongoDB, missing env vars), say so explicitly rather than claiming a code bug.

If all three pass, report `All checks passed. Safe to open PR.` and stop.
