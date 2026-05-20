# Post-Merge Verification Runbook — Stadium Phase 2 + Phase A

> **For:** an agent (or developer) picking up verification of the recently-merged
> work on `develop`. Self-contained — you need no prior session context.
> **Created:** 2026-05-19, after PRs #77, #78, #79, #82, #83 merged to `develop`.

## What was merged (and needs verifying)

| PR | Issue | Surface |
|----|-------|---------|
| #77 | — | backlog entry (docs only — nothing to UI-test) |
| #78 | #71 / P2-05 | **Notifications card** on the project Overview tab + **focus-refetch** on application-status surfaces |
| #79 | #72 / P2-06 | rehearsal-notes template (docs only) |
| #82 | #80 | **admin "Create Project" UI** on `/admin` |
| #83 | #81 | **widened project edit form** (Final Submission / Hackathon / Bounty Prizes) |

## Automated checks — ALREADY DONE (green as of 2026-05-19)

Re-run if `develop` has moved since:
```
cd server && npm test      # → 127 passed (15 files)
cd client && npm run build # → pass (tsc + vite)
cd client && npm run lint  # → pass, 0 warnings
```
If any of these fail, stop and report — integration regression.

## Setup for the UI journey verification

1. From the repo root, preflight the tester (idempotent; first run pulls Chromium ~150MB):
   ```
   bash .claude/skills/stadium-tester/setup.sh
   ```
2. Start the client in mock mode + SIWS test-wallet harness + Alice as an admin:
   ```
   cd client && VITE_USE_MOCK_DATA=true VITE_USE_TEST_WALLET=true \
     VITE_ADMIN_ADDRESSES=5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY \
     npm run dev
   ```
   Serves on `http://localhost:8080`; no backend server required.
3. Run the tester once per batch:
   ```
   /stadium-tester http://localhost:8080 "<batch scenarios, verbatim>"
   ```
   (If invoking the runner directly, prefix `VITE_USE_TEST_WALLET=true` and run
   from the repo root: `node .claude/skills/stadium-tester/scripts/run-playwright.mjs --target http://localhost:8080 --spec /tmp/<spec>.mjs`.)

## Fixtures the scenarios rely on

- Team-member project: **`plata-mia-15ac43`** ("Plata Mia"). //Alice
  (`5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY`) is on its team.
- Program: **`dogfooding-2026-berlin`** ("Dogfooding 2026"). Plata Mia already
  has a `submitted` application to it.
- Hackathon for `/winners/:hackathon`: **`symbiosis-2025`**.

## Connect flows (the harness auto-signs //Alice — no real extension)

- **Project page** (`/m2-program/:id`): the wallet-connect banner is on the
  **Team & Payments tab** → click "Connect Wallet". Post-connect, "Edit Details"
  and "Post update" appear; the Notifications card appears on Overview.
- **Admin** (`/admin`): click "Connect Admin Wallet".
- **Program page** (`/programs/:slug`): click "Sign in with wallet to apply".

---

## Batch 1 — Visitor journeys (public, no wallet)
```
- [ ] On /, the page loads → header shows "Stadium" and project cards render
- [ ] On /, toggle the "Winners" filter → grid shows only winner projects
- [ ] On /, search "Plata" → the Plata Mia card is visible
- [ ] On /m2-program, switch to the Table/Cards view toggle → projects render
- [ ] On /programs, the page loads → a "Dogfooding 2026" program card is visible
- [ ] On /programs/dogfooding-2026-berlin, the page loads → program name, type, and dates render
- [ ] On /m2-program/plata-mia-15ac43, the page loads → Overview, Milestones, Team & Payments, Updates tabs are present
- [ ] On /m2-program/plata-mia-15ac43, open the Updates tab → existing project updates render
- [ ] On /winners/symbiosis-2025, the page loads → winning project cards render
- [ ] On /this-route-does-not-exist, → the NotFound page renders
```

## Batch 2 — Team member + P2-05 notifications (test-wallet harness)
```
- [ ] On /m2-program/plata-mia-15ac43, connect the test wallet → team controls (Edit Details, Post update) appear
- [ ] On /m2-program/plata-mia-15ac43 as the team wallet, post a project update → the new update appears in the list
- [ ] On /m2-program/plata-mia-15ac43 Overview as an unauthenticated visitor, the Notifications card is NOT visible
- [ ] On /m2-program/plata-mia-15ac43 Overview as the team wallet, the Notifications card is visible
- [ ] On the Notifications card, click "Update email", enter a valid email + Save → card flips to the confirmation state
- [ ] On the Notifications card, click "Update email", enter "not-an-email" + Save → inline error "email must be a valid email address", no SIWS prompt
- [ ] On /programs/dogfooding-2026-berlin as the plata-mia team wallet, the application status badge shows "submitted"
- [ ] On /programs/dogfooding-2026-berlin, clicking the Refresh button next to the status re-runs the fetch (indicator still correct, no error)
```

## Batch 3 — Admin + #80 Create Project (test-wallet harness, Alice as admin)
```
- [ ] On /admin, connect the test wallet → the admin dashboard with stats renders
- [ ] On /admin, → the Programs table lists "Dogfooding 2026"
- [ ] On /admin, create a program via the Create program modal → the new program appears in the Programs table
- [ ] On /admin/programs/dogfooding-2026-berlin, click Load / refresh → the Plata Mia application loads with status "submitted"
- [ ] On /admin/programs/dogfooding-2026-berlin, accept the application → switch to the "Accepted" filter → it shows status "accepted"
- [ ] On /admin, click "Create Project" → the create-project modal opens
- [ ] On /admin, in the Create Project modal fill a valid project name + Save → the project is persisted (check localStorage 'projects') and reachable at /m2-program/<id>
- [ ] On /admin, in the Create Project modal click Save with the name empty → inline error "Project name is required.", modal stays open
```

## Batch 4 — #81 widened project edit form (test-wallet harness)
```
- [ ] On /m2-program/plata-mia-15ac43 as the team wallet, open "Edit Details" → the modal shows the new Final Submission, Hackathon, and Bounty Prizes sections
- [ ] In the edit modal, change the Hackathon name + Save Changes → the project header byline reflects the new hackathon name
```

---

## Known gotchas — expected, NOT failures

1. **`TeamPaymentSection` duplicate-key console warning.** Whenever the Team &
   Payments tab renders, React logs "Encountered two children with the same
   key" (two mock team members share a redacted wallet address). Pre-existing,
   logged in the backlog. Treat as a known console error, not a failure.
2. **Strict-mode selector collisions.** Some success copy appears both in a card
   and in a toast ("You'll get email about this project", "Project name is
   required."). When asserting, use `.first()` — a "resolved to N elements"
   error is a test-selector bug, not an app bug.
3. **Mock-mode reload-persistence is partial.** A *newly created* project (PR
   #82) survives a reload (`getProject` has a localStorage fallback). An *edit*
   to a pre-existing seed project (PR #83) is visible via optimistic state but
   does NOT survive a full reload — `getProject` prefers the in-memory fixture.
   This is a documented mock-harness limitation (in the backlog), not a bug.
   Do not assert reload-persistence for edits to seed projects.
4. **Vercel preview ≠ test-wallet.** Previews run mock mode but NOT
   `VITE_USE_TEST_WALLET`, so SIWS-gated flows can only be driven on local dev.

## Pass criteria

Every scenario PASS, or a documented SKIPPED for one of the gotchas above. The
only acceptable console error during a run is the `TeamPaymentSection`
duplicate-key warning.

## Out of scope for this runbook (human / production only)

- **Real email delivery** (Resend) — covered by the #72 rehearsal
  (`docs/alpha-rehearsal-notes-phase-2.md`); needs prod + a real inbox.
- **Real on-chain payouts** — these do NOT work; `confirmPayment` only records a
  payment, it does not move tokens. That is the unstarted "Phase B" track
  (expand issue #12 into a spec first).

## If a scenario genuinely FAILS

Capture the tester's root-cause hint, check the failure screenshot under
`client/test-results/`, and determine: test-selector bug (fix the scenario) vs
real regression (open an issue / fix on a branch via `/ship-issue`). Do not
patch `develop` directly.
