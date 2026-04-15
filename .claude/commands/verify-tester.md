---
description: One-shot health check that the stadium-tester Skill is wired up correctly — Playwright + Chromium installed, runner script reachable, scope guards intact. Run after any change to the skill or on a fresh clone.
---

Verify the `stadium-tester` Skill is ready. No PRs, no commits — just a health check.

## Steps

### 1. Toolchain present

```bash
node --version           # any LTS (>=18) is fine
npx --version
```

If either is missing, stop and tell the user to install Node.

### 2. Playwright installed locally

```bash
test -d client/node_modules/@playwright/test && echo "OK: @playwright/test installed" \
  || { echo "Installing..."; bash .claude/skills/stadium-tester/setup.sh; }
```

Confirm Chromium binary is present:

```bash
cd client && npx playwright --version
```

### 3. Runner reachable

```bash
node .claude/skills/stadium-tester/scripts/run-playwright.mjs --target X --spec Y 2>&1 | head -3
```

Should print a usage error including `--target` and `--spec` (or a `spec-not-found` JSON). That confirms the driver itself runs.

### 4. Production guard works

Confirm the runner refuses production:

```bash
node .claude/skills/stadium-tester/scripts/run-playwright.mjs \
  --target https://stadium.joinwebzero.com \
  --spec /tmp/never-runs.spec.mjs ; echo "exit=$?"
```

Expected: prints `{"error":"production-target-blocked", ...}` and exits with `3`. If it doesn't, the guardrail is broken — stop and report.

### 5. Live smoke test (requires user to start dev server)

Tell the user to run in another terminal:

```bash
cd client && VITE_USE_MOCK_DATA=true npm run dev
```

Wait for `Local: http://localhost:8080/`. Then invoke the Skill:

```
/stadium-tester http://localhost:8080 "- [ ] On /, page loads → header text contains \"Stadium\""
```

### 6. Pass criteria

- Toolchain check: PASS
- Playwright install: PASS
- Runner reachable: usage error printed, runner runs
- Production guard: exit code `3`, error JSON
- Live smoke test: 1 scenario PASS, 0 console errors, runner exit `0`

If all six pass, the tester is live. If any fails, paste the exact error to the user. Common failures:
- Chromium download timing out → retry; first run is large
- `npx playwright` not found → `setup.sh` failed; run it manually and check npm logs
- Local dev server not on 8080 → Vite picked another port (rare, but `vite.config.ts` fixes it at 8080); check terminal output and retry against that URL
