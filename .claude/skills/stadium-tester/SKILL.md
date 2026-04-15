---
name: stadium-tester
description: Verify a Stadium feature or fix by driving a real headless Chromium against the Vercel preview or local dev server. Use during /ship-issue's verify step, or any time you need to walk a UI through the test scenarios listed on a GitHub issue. Reads scenarios in the form "On <route>, <action> → <expected state>" and produces a pass/fail markdown report.
argument-hint: <target-url> <scenarios-markdown>
allowed-tools: Read Grep Glob Bash(node *) Bash(npx playwright *) Bash(cat *) Bash(mktemp *) Bash(rm *)
---

You verify Stadium UI behavior in a real browser. You do not write code into the repo, you do not open PRs. Your output is a pass/fail report tied to each scenario passed in.

## Input contract

Two arguments:

1. **Target URL** — `$0`. Vercel preview (`https://stadium-git-<branch>-<scope>.vercel.app`), Vercel commit-pinned URL, or local dev (`http://localhost:8080`, Vite's port for this repo).
2. **Scenarios markdown** — `$1`. The full `## Test scenarios` block from the issue, verbatim. Each `- [ ] On <route>, <action> → <expected state>` bullet is one scenario.

If either is missing, stop and ask. Do not invent scenarios.

## Hard rules (never violated)

- **Never run against production.** Refuse if the target matches `stadium.joinwebzero.com` or `stadium-production-*.up.railway.app`. The runner script enforces this too — exit code `3` means it tripped that guard.
- **Mock-mode required on remote targets.** On any non-`localhost` URL, the first test must assert `window.__STADIUM_MOCK__ === true`. If false, fail the entire run with a `mock-mode-not-enabled` reason and stop.
- **SIWS-gated flows are out of scope.** Any scenario whose action requires a Polkadot wallet signature → mark `SKIPPED (needs-auth-harness)` and continue. Don't try to mock the wallet.
- **No destructive admin actions even in mock mode.** `confirmPayment`, `markAllAsPaid`, etc. are SKIPPED until we have an explicit safe path.
- **No code outside `/tmp`.** Per-run spec files go in `/tmp`, never under `client/` or anywhere else in the repo.

## Procedure

### 1. Preflight

Confirm Playwright is installed:

```bash
test -d client/node_modules/@playwright/test || bash .claude/skills/stadium-tester/setup.sh
```

If `setup.sh` ran, note the install in your final report so the user knows their first invocation was bootstrapping.

### 2. Parse scenarios

For each `- [ ] …` bullet in `$1`, extract:
- **Route** — the path after `On `
- **Action** — the verb phrase between `,` and `→`
- **Expectation** — text after `→`

If a bullet doesn't fit that shape, treat the whole bullet as a free-form scenario and infer.

Decide per scenario:
- **runnable** — UI-only, no wallet, no mutation
- **skipped-auth** — requires SIWS / wallet signature
- **skipped-destructive** — payment confirm / mass-mark-paid

### 3. Generate the spec

Write a single Playwright spec to `/tmp/stadium-tester-<short-id>.spec.mjs`. Skeleton:

```js
import { test, expect } from '@playwright/test';

const consoleErrors = [];
test.beforeEach(async ({ page }) => {
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
});

test('preview-mode sanity', async ({ page }) => {
  await page.goto('/');
  const isMock = await page.evaluate(() => window.__STADIUM_MOCK__);
  // For local URLs (http://localhost:8080), this may be true or undefined
  // depending on whether VITE_USE_MOCK_DATA was set. Record either way.
  test.info().annotations.push({ type: 'mock', description: String(isMock) });
});

// ... one test() block per runnable scenario ...
```

Per scenario, the test should: navigate to the route, perform the action with a stable selector (prefer `getByRole`, `getByText`, then `data-testid`), assert the expectation. Use `page.waitForLoadState('networkidle')` only when truly needed; prefer waiting on visible state.

### 4. Run

```bash
node .claude/skills/stadium-tester/scripts/run-playwright.mjs \
  --target "<target-url>" \
  --spec /tmp/stadium-tester-<short-id>.spec.mjs
```

Capture stdout (JSON summary) and read the JSON reporter file at `<spec>.json` for per-test results.

### 5. Output

Single markdown block — exactly this shape:

```
## Stadium UI verification — <target URL>

**Scenarios**: <N total, M pass, K fail, L skipped>

| # | Scenario | Result | Notes |
|---|----------|--------|-------|
| 1 | <scenario text>            | PASS                          | observed: <short> |
| 2 | <scenario text>            | FAIL                          | expected <x>, saw <y>; screenshot: <path> |
| 3 | <scenario text>            | SKIPPED (needs-auth-harness)  | requires real wallet signature |

**Preview mode**: window.__STADIUM_MOCK__ = <true | false | undefined>
**Console errors during run**: <count> (first 3: <list>)
**Recommended next action**: continue to PR | return to implementer | escalate to user
```

Nothing else. No speculation beyond a one-line root-cause hint per FAIL.

### 6. Cleanup

`rm -f /tmp/stadium-tester-<id>.spec.mjs /tmp/stadium-tester-<id>.spec.mjs.json /tmp/stadium-tester-<id>.config.mjs`. Keep failure screenshots if Playwright wrote them — point at them in your report.

## Stopping rules

- Bail if the target URL is unreachable after 30 s (Playwright timeout fires → runner exit ≠ 0 → report it as `infrastructure-error`).
- Bail if `setup.sh` fails to install Chromium — tell the user to run it manually and check Node version.
- Bail if the runner exits with code 3 (production target blocked).
- Bail if zero scenarios are runnable after parsing — tell the caller the issue needs UI-testable scenarios added.

## What you do not do

- Write tests into `client/tests/` or anywhere persistent.
- Modify `package.json`.
- Mock SIWS or fabricate wallet signatures.
- Run against production.
- Open PRs, leave comments, push commits.
