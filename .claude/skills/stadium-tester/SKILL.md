---
name: stadium-tester
description: Verify a Stadium feature or fix by driving a real headless Chromium against the Vercel preview or local dev server. Use during /ship-issue's verify step, or any time you need to walk a UI through the test scenarios listed on a GitHub issue. Reads scenarios in the form "On <route>, <action> → <expected state>", always also runs the standing Baseline UX flows, and produces a report that lists the flows, gives an overview, then shows pass/fail results.
argument-hint: <target-url> <scenarios-markdown>
allowed-tools: Read Grep Glob Bash(node *) Bash(npx playwright *) Bash(cat *) Bash(mktemp *) Bash(rm *)
---

You verify Stadium UI behavior in a real browser. You do not write code into the repo, you do not open PRs. Your output is a pass/fail report tied to each scenario passed in.

## Input contract

Two arguments:

1. **Target URL** — `$0`. Vercel preview (`https://stadium-git-<branch>-<scope>.vercel.app`), Vercel commit-pinned URL, or local dev (`http://localhost:8080`, Vite's port for this repo).
2. **Scenarios markdown** — `$1`. The full `## Test scenarios` block from the issue, verbatim. Each `- [ ] On <route>, <action> → <expected state>` bullet is one scenario.

If either is missing, stop and ask. Do not invent issue scenarios — but the Baseline UX flows below run on every invocation regardless of what `$1` contains.

## Baseline UX flows (always run)

These standing flows run on **every** invocation, prepended to whatever issue scenarios are passed in `$1`. They are UI-only and mock-safe (no wallet, no mutation), so they're always `runnable`. Keep this list current as core UX changes — it is the canonical "all UX flows" set the command guarantees coverage of.

**Audio panel (brightness/audio rack — present in the nav on every route):**

- On `/`, the brightness/audio rack renders collapsed → a `SHOW` expand control and a `MUTED`/`SOUND` mute toggle are visible without opening the panel.
- On `/`, click `SHOW` → the rack expands and a `HIDE` collapse control is visible.
- On `/`, expand the rack → the AUDIO section lists the three featured tracks (Other Side Podcast #08, Yin · HOUSE, Folk Rock · FOLK ROCK).
- On `/`, click the mute toggle → its label flips between `MUTED` and `SOUND`.
- On `/`, expand the rack and select the HOUSE track → that row becomes the active (`aria-pressed`) selection.
- On `/`, select Folk Rock → a fixed video mini-player appears and the panel shows "playing in the corner".
- On `/`, with Folk Rock playing, minimize then close the mini-player → it tucks to its title bar (iframe stays mounted) then is removed.
- On `/`, with Folk Rock playing, navigate via an in-app link to `/programs` → the video mini-player persists (client-side `<Link>` nav; the audio provider lives above the router).

> Persistence flows must navigate by clicking an in-app `<a href="/…">` (react-router `Link`), **never** `page.goto()` — a full reload remounts the app and resets provider state, which is not what "persists across pages" means.

## Hard rules (never violated)

- **Never run against production.** Refuse if the target matches `stadium.joinwebzero.com` or `stadium-production-*.up.railway.app`. The runner script enforces this too — exit code `3` means it tripped that guard.
- **Mock-mode required on remote targets.** On any non-`localhost` URL, the first test must assert `window.__STADIUM_MOCK__ === true`. If false, fail the entire run with a `mock-mode-not-enabled` reason and stop.
- **SIWS-gated flows need the test-wallet harness.** A scenario whose action requires a Polkadot wallet signature only runs when the target URL was built with `VITE_USE_TEST_WALLET=true` (see below). If that flag isn't active, mark the scenario `SKIPPED (needs-auth-harness)` and continue. Don't hand-roll a wallet mock.
- **No destructive admin actions even in mock mode.** `confirmPayment`, `markAllAsPaid`, etc. are SKIPPED until we have an explicit safe path.
- **No code outside `/tmp`.** Per-run spec files go in `/tmp`, never under `client/` or anywhere else in the repo.

## Test-wallet mode

To exercise SIWS-gated scenarios (post update, edit funding signal, apply to program, create/edit program, review application, update team), the target build must have `VITE_USE_TEST_WALLET=true` set. That flag turns on `client/src/lib/testWalletInjection.ts`, which registers a synthetic `window.injectedWeb3['polkadot-js']` backed by the real //Alice sr25519 keypair. Signatures produced by Alice verify normally through `@polkadot/util-crypto.signatureVerify` — no server-side bypass.

The flag is double-gated: even when set, the injection no-ops in production builds (`import.meta.env.PROD`). Enable it only for local dev (`VITE_USE_TEST_WALLET=true npm run dev`) and Vercel **Preview** envs — never in Production, and never add Alice's address to the server's `ADMIN_WALLETS` / `AUTHORIZED_SIGNERS` on prod (the mnemonic is public).

Alice is seeded as a team member of `plata-mia-15ac43` in `client/src/lib/mockWinners.ts`. For admin-gated scenarios, the Preview deployment's `VITE_ADMIN_ADDRESSES` must include Alice's SS58-42 address (`5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY`). Production must not.

The runner (`scripts/run-playwright.mjs`) forwards `VITE_USE_TEST_WALLET` from the invoking shell into the Playwright spawn env; pass it through when running the tester locally if the dev server was started without it.

A runnable SIWS-gated scenario can assert `window.__TEST_WALLET_ENABLED__ === true` in a preflight check and fall back to `SKIPPED (needs-auth-harness)` if the flag isn't live on the target.

**Still skipped even with the harness**: admin approval / payment flows (`webzeroApprove`, `requestChanges`, `confirmPayment`) have no mock-mode branch in `client/src/lib/api.ts` — they always hit the real API. Those remain `SKIPPED (needs-mock-coverage)` until mocks are added.

## Procedure

### 1. Preflight

Confirm Playwright is installed:

```bash
test -d client/node_modules/@playwright/test || bash .claude/skills/stadium-tester/setup.sh
```

If `setup.sh` ran, note the install in your final report so the user knows their first invocation was bootstrapping.

### 2. Parse scenarios

Assemble the full run list = **Baseline UX flows** (above, always) **+** the issue scenarios from `$1`. For each issue bullet `- [ ] …`, extract:
- **Route** — the path after `On `
- **Action** — the verb phrase between `,` and `→`
- **Expectation** — text after `→`

If a bullet doesn't fit that shape, treat the whole bullet as a free-form scenario and infer. The baseline flows are already in this shape.

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

A single markdown block, in **exactly this order** — first list the flows, then an overview, then the results:

```
## Stadium UI verification — <target URL>

### Flows under test
Numbered list of every flow this run covers, baseline first, then issue-specific. One plain-language line each, tagged `[baseline]` or `[issue]`:

1. [baseline] Rack defaults collapsed with a visible SHOW + mute toggle
2. [baseline] SHOW expands the rack and reveals HIDE
   … (the rest of the baseline flows) …
N. [issue] <issue scenario text>

### Overview
One short paragraph: the target URL, mock-mode state, totals (`<N total, R runnable, S skipped>`), and the UX areas covered (e.g. "audio panel discoverability + persistence, plus the issue's <feature> flows"). Note up front if any are SKIPPED and why.

### Results

| # | Flow | Result | Notes |
|---|------|--------|-------|
| 1 | <flow text>                | PASS                          | observed: <short> |
| 2 | <flow text>                | FAIL                          | expected <x>, saw <y>; screenshot: <path> |
| 3 | <flow text>                | SKIPPED (needs-auth-harness)  | requires real wallet signature |

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
