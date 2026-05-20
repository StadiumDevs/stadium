# Stadium Revamp — Phase 2 Spec

*Version 0.1 — draft for team discussion. Author: planning session with Claude, April 2026.*

This is the plan for the second shippable slice of the Stadium revamp. Like Phase 1, it is deliberately narrow — anchored on a single user journey and resisting the temptation to pre-build for hypothetical future users.

This spec is being authored on a **provisional baseline** — the Plata Mia rehearsal that closes Phase 1 has not yet been executed (`docs/alpha-rehearsal-notes.md`). Priorities here are seeded from Phase 1 spec §7 (the explicit deferred-items list) plus the gap analysis that has been on the backlog for months. If the rehearsal later surfaces conflicting friction, this spec gets reopened, not silently extended.

Once Phase 2 ships and we've watched real users live with the loop closed, what we learn informs Phase 3. Do not try to pre-plan Phase 3 from this document.

---

## 1. The target journey

The single journey this phase exists to deliver:

> **Plata Mia — already applied to Dogfooding 2026 in Phase 1 — gets accepted by an admin. She receives an email confirming the acceptance with the next-step details. When she next opens her project page, the application status badge has flipped from "submitted" to "accepted" without her having to reload. She can opt out of future emails from a settings surface on her project page.**

Every issue in this phase exists to close that loop. Any feature, schema change, or UI work that does not directly serve it goes into Phase 3.

The Phase 1 spec §7 explicitly named the gap this journey closes: *"An applicant whose status changes from submitted to accepted currently finds out by reloading `/programs/:slug`. Email or Telegram notifications are Phase 2+."* Phase 2 ships email; Telegram is Phase 3+.

## 2. What this phase builds, in plain English

Three new capabilities, tied together by the acceptance-loop journey.

**Email-bound wallets.** Stadium today knows wallet addresses but not emails. Phase 2 introduces a lightweight `wallet_contacts` table — keyed by SS58 address, holds an optional email and a single `notifications_enabled` flag. Builders enter their email once on their project page; admins enter theirs on the admin surface. No magic-link login, no email-as-identity, no per-event-type granularity in this phase.

**Transactional emails on three trigger points.** When an admin accepts or rejects a Dogfooding application, when an admin approves M2 deliverables, and when an admin requests changes on M2 — the affected team's wallets receive an email. Sends go through one transactional provider (Resend), are logged to a `notifications` table for audit + idempotency, and skip silently if the recipient has no email on file or has opted out.

**Live-status refetch on the affected pages.** The application-status badge on the project's Programs section and on `/programs/:slug` re-fetches on tab focus and via a manual refresh button — so the moment Plata Mia opens her tab after the email lands, the badge is already accurate. No polling, no SSE, no WebSockets in this phase — focus-refetch is the simplest correct mechanism.

The journey closes when Plata Mia receives the email *and* sees the badge flipped without manual intervention. Both signals exist; the loop feels alive.

## 3. Architectural decisions, and things we are deliberately not doing

### 3.1 What we are doing

- **New `wallet_contacts` table.** SS58 address PRIMARY KEY, optional `email`, `notifications_enabled` boolean (default true once email is set), timestamps. One row per wallet that has ever opted in. Created lazily on first email entry — no backfill of existing wallets.
- **New `notifications` table.** One row per send attempt. Holds recipient wallet, event type, payload JSON, sent timestamp, status (queued/sent/failed/skipped), provider message id. Used for both audit and dedupe.
- **New transactional email provider integration** (Resend). One service module, one env var (`RESEND_API_KEY`), one from-address env var (`RESEND_FROM_EMAIL`). Server-only.
- **Server-side trigger points** in three existing admin controllers — `program.controller.js` (application status PATCH), `project.controller.js` (M2 approve, request changes). Each fires a `notify(...)` call after the DB write succeeds. Failure to send does not roll back the DB write.
- **Builder-facing email entry surface** on `ProjectDetailsPage` — a small "Notifications" card on Overview, team-gated, with an email input + opt-out toggle.
- **Focus-refetch on application status surfaces** — `ProgramDetailPage` and the `ProjectProgramsSection` re-call their existing fetchers on `window.focus` and via a "Refresh" button. No new polling infra.

### 3.2 What we are deliberately not doing in this phase

- **No magic-link / email-as-identity login.** Wallet auth (SIWS) remains the only way to write state. Email is for one-way delivery only. Same constraint as Phase 1's "no non-wallet fallback" rule.
- **No Telegram, Discord, Farcaster, or in-app notification inbox.** All Phase 3+. Email is the one channel.
- **No per-event-type opt-out granularity.** A wallet either receives all relevant emails or none. Per-event preferences (e.g. "M2 yes, applications no") are Phase 3.
- **No admin-side reminders, escalations, or digest emails.** Issue #17 territory — explicitly Phase 3+. Phase 2 is user-facing transactional sends only.
- **No notifications for project-update posts or funding-signal edits.** Those are team-self-initiated state changes — emailing the team about their own action is noise. Notifications fire only on *admin-initiated* state changes that affect the team.
- **No real-time push.** No WebSockets, no SSE, no Server-Sent Events. The app polls on focus only. Real-time is Phase 3+ if a clear need surfaces.
- **No retry queue or background worker.** A failed Resend call logs to `notifications` with status `failed` and is forgotten. If a meaningful failure rate emerges, a retry mechanism is a Phase 3 issue. Premature infra is the single easiest way to blow up Phase 2's scope.
- **No Pitch Off, no `builders` table, no mentor entities.** Phase 3+. The program abstraction holds for Phase 2's needs without those.
- **No `m2_*` column rename, no `hackathon_*` table promotion.** Same reason as Phase 1: tempting cleanup, zero user-visible improvement, real risk during alpha. Phase 3 or later.
- **No partner-scoped admin.** All programs remain WebZero-owned. The `programs.owner` column added in Phase 1 stays at `'webzero'`.

### 3.3 The guiding principle

**Same as Phase 1: small, additive, reversible.** Every change is a new table, a new env var, or a new trigger call inside an existing admin controller. The existing M2 path keeps working untouched. If Phase 2 fails to resonate — say email open rates are abysmal or builders find the focus-refetch jumpy — we walk it back with two `DROP TABLE`s, one removed Resend integration, and a few removed `notify(...)` calls.

## 4. Schema additions

All new. No renames, no destructive migrations, no changes to Phase 1 tables.

### 4.1 `wallet_contacts`

```sql
CREATE TABLE wallet_contacts (
  wallet_address         TEXT PRIMARY KEY,
  email                  TEXT,
  notifications_enabled  BOOLEAN NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_contacts_email ON wallet_contacts (email) WHERE email IS NOT NULL;
```

Notes:
- `email` is nullable — a row may exist with `notifications_enabled = false` and no email if the user explicitly opted out before entering one.
- No FK to `team_members` or `projects` — this table is identity-layer, not project-layer. A wallet is a wallet across all projects it appears on.
- Email format is enforced at the API layer (RFC 5321 simplified — local + `@` + domain with at least one dot). No DB-level CHECK to keep the migration cheap.

### 4.2 `notifications`

```sql
CREATE TABLE notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_wallet    TEXT NOT NULL,
  event_type          TEXT NOT NULL CHECK (event_type IN (
                        'application_accepted',
                        'application_rejected',
                        'm2_approved',
                        'm2_changes_requested'
                      )),
  source_id           TEXT NOT NULL,
  payload             JSONB NOT NULL,
  status              TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  provider_message_id TEXT,
  error               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at             TIMESTAMPTZ
);

CREATE UNIQUE INDEX notifications_dedupe
  ON notifications (recipient_wallet, event_type, source_id);

CREATE INDEX idx_notifications_recipient_created
  ON notifications (recipient_wallet, created_at DESC);
```

Notes:
- `source_id` is a first-class column (not a JSON expression) so the unique index is straightforward and queryable. It identifies the underlying state change:
  - `application_accepted` / `application_rejected` → the application UUID. One application accepts/rejects once.
  - `m2_approved` → the project ID. One project gets one M2 approval.
  - `m2_changes_requested` → `<project_id>:<request_iso_timestamp>`, because the same project can receive multiple distinct change requests across the M2 cycle.
- `payload` is JSONB for the rendered email content (program name, project name, admin feedback text, etc.) — anything the email template needs that we want to keep audit-visible.
- `status = 'skipped'` covers "no email on file" and "user opted out" — we still log the attempt for audit even when no send happens.
- No `to_email` column — email is dereferenced from `wallet_contacts` at send time. Source of truth.

### 4.3 Existing tables — no changes

`programs`, `program_applications`, `project_updates`, `project_funding_signals`, `projects`, `team_members`, `bounty_prizes`, `milestones` — all untouched.

## 5. Issues

Six issues. Sequenced linearly. Each one has the `## Test scenarios` block populated below; create the GitHub issues from this document using the standard template.

### Issue 1 — wallet_contacts: data model + API

**Summary.** Add the `wallet_contacts` migration. Add `wallet-contact.repository.js`. Add GET `/api/wallet-contacts/:address` (public — returns `{ email_set: boolean, notifications_enabled: boolean }`, never the email itself) and PUT `/api/wallet-contacts/:address` (SIWS-gated for the matching wallet via a new `requireOwnWallet` middleware variant). Body validates email shape. No UI yet.

**Files.** `supabase/migrations/<timestamp>_create_wallet_contacts.sql`, `server/api/repositories/wallet-contact.repository.js` (new), `server/api/services/wallet-contact.service.js` (new), `server/api/controllers/wallet-contact.controller.js` (new), `server/api/routes/wallet-contact.routes.js` (new), `server/server.js` (mount), `server/api/middleware/auth.middleware.js` (extend SIWS statement list with "Update notification preferences for wallet on Stadium"), `server/api/utils/validation.js` (email validator).

**Test scenarios.**
- On `/api/wallet-contacts/<unknown-address>`, public GET returns `{ email_set: false, notifications_enabled: true }` (default shape).
- On `/api/wallet-contacts/<address>`, an authenticated PUT with a valid email and `notifications_enabled: true` succeeds and a subsequent GET reflects `email_set: true`.
- On `/api/wallet-contacts/<address>`, a PUT signed by a different wallet returns 403.
- On `/api/wallet-contacts/<address>`, a PUT with `email: "not-an-email"` returns 400 with a clear message.
- On `/api/wallet-contacts/<address>`, the GET response **never** includes the raw email — only the boolean flags.

**Verification notes.** PUT is SIWS-gated. Server unit tests cover the auth boundary, validation, and the GET-never-leaks-email guarantee.

---

### Issue 2 — notifications log + dispatcher service

**Summary.** Add the `notifications` migration. Add `notification.repository.js`. Add `notification.service.js` exporting `notify(walletAddress, eventType, sourceId, payload)`: looks up the wallet's contact row, decides send/skip, writes the `notifications` row, and (in Issue 3) calls the provider. In Issue 2, the service writes the row with status `queued` — the actual provider wiring lands in Issue 3. This split lets the trigger points in Issue 4 land independently of provider availability.

**Files.** `supabase/migrations/<timestamp>_create_notifications.sql`, `server/api/repositories/notification.repository.js` (new), `server/api/services/notification.service.js` (new), `server/.env.example` (placeholder for `RESEND_API_KEY` and `RESEND_FROM_EMAIL`).

**Test scenarios.**
- A `notify('5XYZ...', 'application_accepted', 'app-123', { programName: 'Dogfooding 2026' })` call when no `wallet_contacts` row exists creates a `notifications` row with status `skipped` and reason `no_contact`.
- A `notify(...)` call when `wallet_contacts.notifications_enabled = false` writes a row with status `skipped` and reason `opted_out`.
- A `notify(...)` call when both email and consent exist writes a row with status `queued`.
- A second `notify(...)` with the same `(recipient_wallet, event_type, source_id)` returns the existing row without inserting — UNIQUE index prevents duplicates.

**Verification notes.** Pure server unit tests; no UI.

---

### Issue 3 — Resend integration: send queued notifications

**Summary.** Wire the actual email send. Extend `notification.service.js` so `notify(...)` — when status would be `queued` — calls Resend, then updates the row to `sent` (with `provider_message_id`) or `failed` (with `error`). Use a single env-driven provider so a future swap is one file.

**Files.** `server/api/services/notification.service.js` (extend), `server/package.json` (add `resend` dep), `server/.env.example`, `server/.env` (real values for the dev/staging machine), `docs/AGENT_GUIDE.md` (one paragraph: "where notifications come from, how to disable them in dev").

**Test scenarios.**
- A `notify(...)` happy path with mocked Resend → row status `sent`, `provider_message_id` populated.
- A `notify(...)` where Resend returns 4xx → row status `failed`, `error` populated, no exception bubbles to caller.
- A `notify(...)` when `RESEND_API_KEY` is unset → row status `failed`, error `provider_not_configured`. Server still boots; no crash.
- A `notify(...)` in `NODE_ENV=test` short-circuits to a mock transport that never hits the network.

**Verification notes.** Server unit tests with `vi.mock('resend')`. Manual smoke: a dev sends to themselves and confirms delivery before merging.

---

### Issue 4 — Trigger points: wire `notify()` into admin controllers

**Summary.** After a successful DB write in each affected admin controller, call `notify(...)` for each team-member wallet on the affected project. Three trigger points:

- `program.controller.js → updateApplicationStatus` (Phase 1 #47): on `submitted → accepted` or `submitted → rejected`, fire `application_accepted` or `application_rejected` for every team member of the applying project.
- `project.controller.js → approveM2` (existing): fire `m2_approved` for every team member.
- `project.controller.js → requestChanges` (existing): fire `m2_changes_requested` for every team member, with the feedback text in the payload.

The notify call is `await`'d but failures are caught and logged — they must never roll back the underlying DB write or change the HTTP response.

**Files.** `server/api/controllers/program.controller.js` (extend), `server/api/controllers/project.controller.js` (extend), `server/api/services/notification.service.js` (helper that fans out to a project's team-member wallets).

**Test scenarios.**
- On PATCH `/api/programs/<slug>/applications/<id>` flipping status to `accepted`, a `notifications` row is written for every team-member wallet of the applying project. HTTP response is unchanged.
- On POST `/api/m2-program/<id>/approve`, a `notifications` row is written for every team-member wallet of the project.
- On POST `/api/m2-program/<id>/request-changes`, a `notifications` row with the feedback text in `payload` is written for every team-member wallet.
- A simulated provider failure in `notify(...)` does not change the HTTP response or roll back the DB state of the underlying action.

**Verification notes.** Server unit tests; no UI. Manual SIWS lane: confirm an admin clicking "Accept" generates a notification log row.

---

### Issue 5 — Builder UI: email entry + opt-out + focus-refetch

**Summary.** On `ProjectDetailsPage` Overview, add a "Notifications" card visible to team members. Card holds an email input (pre-filled from `GET /api/wallet-contacts/:address` if `email_set`), a "Notify me about this project" toggle, and a Save button that triggers SIWS and PUTs the contact row. After save, a small confirmation badge replaces the card.

Same Overview tab: when the existing `ProjectProgramsSection` mounts, register a `window.focus` listener that re-runs its application-status fetch. Same on `ProgramDetailPage` for the "Apply / Applied — submitted | accepted" indicator. Add a small "Refresh" icon button next to each that triggers the same fetch on click.

**Files.** `client/src/components/project/NotificationsCard.tsx` (new), `client/src/components/project/ProjectProgramsSection.tsx` (extend with focus-refetch + button), `client/src/pages/ProjectDetailsPage.tsx` (mount the card), `client/src/pages/ProgramDetailPage.tsx` (focus-refetch + button), `client/src/lib/api.ts` (`getWalletContact`, `updateWalletContact` + mock-mode), `client/src/lib/siwsUtils.ts` (extend SIWS statement list with `'update-notifications'`), `client/src/lib/mockWalletContacts.ts` (new — mock fixtures for two test wallets).

**Test scenarios.**
- On `/m2-program/<project-id>` as an unauthenticated visitor, the Notifications card is NOT visible.
- On `/m2-program/<project-id>` as a team-member wallet, the Notifications card is visible with the email input empty.
- On `/m2-program/<project-id>` after entering a valid email + toggling on + saving, the card replaces itself with a "You'll get email about this project" confirmation badge.
- On `/programs/<slug>` after the page loads with status "submitted", the page fetches again on tab focus — a Playwright spec can simulate by calling `page.bringToFront()` after a mock-data state change.
- On `/programs/<slug>`, clicking the Refresh button re-runs the fetch.

**Verification notes.** Read paths fully testable through `stadium-tester` mock-mode + the SIWS test-wallet harness from PR #62. SIWS write paths (the Save action) need the harness active; otherwise mark `SKIPPED (needs-auth-harness)` and walk the manual lane.

---

### Issue 6 — End-to-end alpha readiness #2: the loop closes for Plata Mia

**Summary.** Operational, not a code feature. Repeat Plata Mia's journey from Phase 1 with the loop closed:

1. (Phase 1, already done.) She applies to Dogfooding 2026.
2. (Phase 2, this issue.) She enters her email on her project page, toggles notifications on, signs.
3. (Phase 2, this issue.) An admin accepts her application. She receives an email within a minute.
4. (Phase 2, this issue.) She returns to her project page in a tab she'd left open before; on focus, the Programs section re-fetches and her badge reads "accepted" without manual reload.
5. (Phase 2, this issue.) She finds the opt-out toggle, switches it off, reloads — confirms her preferences saved.

Capture friction in `docs/alpha-rehearsal-notes-phase-2.md` (new). Same template structure as Phase 1's rehearsal notes, focused on the five steps above.

**Files.** `docs/alpha-rehearsal-notes-phase-2.md` (new).

**Test scenarios.**
- Plata Mia (or a WebZero team member posing as her) completes the five steps end-to-end in production. The email arrives in inbox (not spam — confirm DKIM/SPF on the from-domain). The badge update on focus works without manual reload.

**Verification notes.** This is the gate. It's where Phase 2 proves whether the loop-closing actually feels alive to a real user. The retro from this issue feeds Phase 3 priorities — same role Phase 1's rehearsal plays for Phase 2.

---

## 6. Loop-readiness summary

Six issues, grouped by how well the agentic workflow can verify them post-#62 harness:

**Fully verifiable by `stadium-tester` (read paths)**: 5 (read side).

**Server unit tests + harness on write paths**: 1, 2, 3, 4, 5 (write side). All write paths are either SIWS-gated (1, 5) or admin-controller side-effects (2, 3, 4). The harness covers SIWS; admin controllers test via Vitest with mocked Supabase + mocked Resend.

**Manual / operational**: 6.

**Net change vs. Phase 1**: with the SIWS test-wallet harness now landed (#62), Phase 2 has no untestable write paths — every issue has an automatable verification lane. Phase 1 had six SIWS-blocked write flows; Phase 2 has zero. This is the velocity dividend the harness was supposed to pay.

## 7. What this phase intentionally does not answer

Captured here so they don't get quietly deferred without anyone noticing:

- **Multi-channel notifications.** Telegram, Discord, Farcaster — all Phase 3+. Email is the one channel that works for every Polkadot-savvy builder we've talked to.
- **In-app notification inbox.** A bell icon, a "you have N new" badge, a feed of recent notifications. Phase 3+. Email + focus-refetch is the alpha shape.
- **Per-event-type granular preferences.** "Accept yes, reject no" or "M2 yes, applications no" — Phase 3. Phase 2 is one toggle for everything.
- **Admin-side notifications, reminders, escalations.** Issue #17. Phase 3+ — Phase 2 is user-facing only.
- **Notifications on team-self-initiated state changes** (post-update, edit funding signal). Self-emails are noise.
- **Pitch Off as a program type.** Phase 3 candidate.
- **Mentor entities, partner-scoped admin, milestone marketplace, multi-chain payouts, column renames.** All Phase 3+ — same list as Phase 1 §7, modulo what's now done.
- **Real-time updates.** WebSockets, SSE, push. Phase 3+ if a clear user need surfaces; the focus-refetch heuristic should hold for the alpha cohort.
- **A retry queue or background worker.** A failed Resend call logs and is forgotten. If failure rates become non-trivial, Phase 3 owns it.

## 8. How to use this document

This document is not itself a GitHub issue. It is the spec that seeds 6 GitHub issues, each of which is a single-issue `ship-issue` loop run.

The sequence:

1. Circulate this spec internally. Get one pass of pushback — especially on the "we are deliberately not doing" section.
2. **Reconcile with existing open issues.** #17 (M2 follow-up automations) overlaps with the admin-side notifications case explicitly excluded here. Add a comment on #17 noting Phase 2 explicitly defers the admin-side; revisit at the Phase 2 retro.
3. Create the 6 GitHub issues using the standard issue template, with `## Test scenarios` for each populated from this document.
4. Sequence the issues linearly as written. Issues 1–4 are the data + dispatch backbone; Issue 5 is the UX surface; Issue 6 is the gate.
5. After Issue 6 rehearsal, hold a short retro. What worked, what surprised us, what alpha users wanted that this spec didn't anticipate. That retro is the input to Phase 3 — not this document.

### 8.1 Reconciliation with existing open issues

| # | Title | Disposition |
|---|---|---|
| **#17** | *Automations for M2 follow-ups* | **Partially answered.** The acceptance/approval/changes notifications are delivered by Phase 2 issues 4–6. The reminder/escalation/digest side stays Phase 3+. Update the existing comment on #17 noting Phase 2 partial coverage. |
| **#48** | *revamp-P1-13: alpha readiness* | **Block G of Phase 1, not Phase 2.** The Plata Mia rehearsal seeds Phase 3 inputs, not Phase 2 — Phase 2 is being authored on a provisional baseline. Once the rehearsal runs, if it conflicts with Phase 2 priorities, reopen this spec rather than proceeding silently. |
| **#26** | *schema: store M2 program entitlement per project* | **Defer again.** Same reasoning as Phase 1 §8.1 — tangential to the target journey. Revisit at the Phase 2 retro. |
| **#15** | *post-hackathon follow-up notes* | **Partially answered (still).** The "What's next, milestone 3?" bullet is incrementally closer with Phase 2's notification trigger pattern, but the standalone "next-step submission form" remains Phase 3+. |
| **#12** | *Sprint 3: on-chain payouts* | **Defer again.** Out of scope. |

---

## 9. Mock fixture ownership

Phase 2 extends what the Vercel preview can demonstrate. New entities get companion fixtures:

- `client/src/lib/mockWalletContacts.ts` — added in Issue 1. Pre-seeded with two contacts: one for the Test Harness wallet (`5GrwvaEF...`, the //Alice address from PR #62) with `email_set: true, notifications_enabled: true`; one for a sampled team-member wallet on a different project, `notifications_enabled: false`.
- `client/src/lib/mockNotifications.ts` — added in Issue 2. Empty array initially; mock-mode `notify(...)` `unshift()`s entries on admin actions, mirroring how `mockProgramApplications.ts` works.

`client/src/lib/api.ts` switches on `USE_MOCK_DATA` for the new GETs and writes; mock-mode mutates the in-memory arrays + `localStorage` per the existing pattern. Resend integration is **server-side only** — no mock implementation needed on the client.

---

## 10. Validation convention

Same as Phase 1 §10. Every new client form (Issue 5's email entry) reuses the server's email validator from `server/api/utils/validation.js`, surfaced inline next to the offending field. No client-only stricter or looser bounds.

---

## 11. Login / visitor model

Unchanged from Phase 1 §11. Email is **delivery-only**, not an identity.

- Wallets remain the only identity layer. SIWS remains the only write-auth. No magic link, no email login, no session cookies.
- A wallet without an email still works for everything except receiving notifications. The "Notifications" card simply prompts the team member to add one if they want emails.
- The `wallet_contacts` GET is public (boolean flags only — never the email). PUT is SIWS-gated for the matching wallet.

---

## 12. Implementation plan — gated execution

Same shape as Phase 1 §12 — issues ship in blocks, each block pauses for a journey-slice gate before the next starts.

### Block → Issues → Gate

| Block | Issues | Journey slice gated on |
|---|---|---|
| **A — Identity-layer plumbing** | 1 | "I can record my email against my wallet." Builder enters email on Notifications card → SIWS → re-fetched contact shows `email_set: true`. |
| **B — Dispatch backbone** | 2, 3 | "A `notify(...)` call from anywhere in the server lands a real email." Dev calls the service from a script with their own email; receives the email. |
| **C — Trigger wiring** | 4 | "Admin actions emit notifications." Admin accepts a sampled application → `notifications` table has a row; the email lands. |
| **D — Builder UX** | 5 | "Builder can opt in/out and see live status." Same wallet that opted in sees its application status update on tab focus without manual reload. |
| **E — Phase-2 alpha rehearsal** | 6 | End-to-end against real production data + a real email. Output: `docs/alpha-rehearsal-notes-phase-2.md`. |

### Verification lanes per gate

Each gate runs three lanes (carried over from Phase 1):

1. **Auto lane** — `stadium-tester` against the Vercel preview, mock-mode, with the SIWS test-wallet harness active. Composed from each issue's test scenarios.
2. **Manual SIWS lane** — a human walks the SIWS-gated write actions against staging. Block A and Block D require this.
3. **Journey lane** — a human posing as Plata Mia walks the slice end-to-end. Block C and Block E require this. Notes land in `docs/journey-notes-phase-2/block-<X>.md`.

### Rules

- **Do not start block N+1 until block N's gate is green on all applicable lanes.**
- **If a gate reveals the spec was wrong, stop and flag back to the human.** Phase 3 decisions start from these gates plus the Phase 1 rehearsal that was deferred.
- **By end of Block D, the preview must demonstrate the loop closing** — a mock-mode acceptance of Plata Mia's application surfaces a "you'd get an email" toast and the badge updates on focus.

### Verification-cost summary

- **Fully auto-verifiable**: Block A (with harness), Block D read-side.
- **Auto + one manual SIWS walk**: Block A write-side, Block D write-side.
- **Auto + journey walk**: Block C, Block E.

Zero issues are blocked on missing harness work — the SIWS test-wallet harness from PR #62 covers every write path. Phase 2's verification cost is materially lower than Phase 1's.

### Working-backwards calendar

Today: 2026-04-29. The Dogfooding event runs **13–19 June 2026** in Berlin. Working backwards for Phase 2:

- The acceptance loop has to close before the team starts processing real Dogfooding applications. Applications close ~30 May 2026 (set in Phase 1). Admin processes them in the week after.
- Therefore: **Phase 2 issues 1–5 must land by ~28 May 2026**; Phase 2 issue 6 (rehearsal) can run in the week of 1–7 June 2026 with applications already submitted.
- That gives ~4 weeks for 5 implementation issues + 1 rehearsal — comfortable cadence at one issue every 4–5 days.

If a block's gate slips, the decision is not "skip the gate" — it's "send acceptance emails manually for the Dogfooding cohort and re-target Phase 2 at the next program." Gates are load-bearing; a dropped gate means the alpha user opens her tab, finds nothing has updated, and concludes Stadium is dead.

---

*End of Phase 2 spec. Phase 3 will be written after Phase 2 ships and we've watched the loop close for real users — informed by both the Phase 1 rehearsal (deferred) and the Phase 2 rehearsal.*
