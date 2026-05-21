# Improvement Backlog

Living list of improvements, nits, and observations that agents notice while working on unrelated issues. Items here are **not yet GitHub issues** — they are promoted via `/promote-backlog` after the user confirms.

## How to add an entry

Use `/log-improvement <short description>` or append manually with this template:

```
## [YYYY-MM-DD] <short title>
- **Severity**: nit | minor | major
- **File(s)**: path:line (or "multiple" with list)
- **Observed during**: issue #N / <task description>
- **Suggestion**: one or two sentences describing the change, not the fix
```

## How entries are promoted

`/promote-backlog` reads this file, asks which entries to promote, creates GitHub issues with the `claude-suggested` label, and appends `- **Promoted**: #<issue>` to the entry.

Do **not** manually edit `- **Promoted**` lines.

---

<!-- entries start below this line -->

## [2026-04-23] `requireTeamMemberOrAdmin` missing SIWS domain check
- **Severity**: minor
- **File(s)**: `server/api/middleware/auth.middleware.js` (`requireTeamMemberOrAdmin`)
- **Observed during**: PR #73 review — fixing Blocker 1 (domain check added to `requireOwnWallet`)
- **Suggestion**: `requireAdmin` and `requireOwnWallet` both gate on `DISABLE_SIWS_DOMAIN_CHECK`/`EXPECTED_DOMAIN` immediately after statement validation; `requireTeamMemberOrAdmin` skips this check entirely. Add the same domain-check block in a dedicated hardening pass.

## [2026-04-15] Migrate slash commands to Skills
- **Severity**: nit
- **File(s)**: `.claude/commands/*.md`
- **Observed during**: switching `stadium-tester` from MCP/subagent to a project-scoped Skill
- **Suggestion**: per the Claude Code skills doc, `.claude/commands/foo.md` and `.claude/skills/foo/SKILL.md` create the same `/foo` slash command, but skills add auto-invocation, supporting files, subagent forking, and ecosystem sharing. When time allows, lift each of `ship-issue`, `triage-issue`, `address-review`, `log-improvement`, `promote-backlog`, `pre-pr-check`, `verify-tester` into a `SKILL.md` directory. No behavior change required, just packaging.

## [2026-04-15] Audit `eslint-disable react-hooks/exhaustive-deps` suppressions in AdminPage.tsx
- **Severity**: minor
- **File(s)**: `client/src/pages/AdminPage.tsx` (develop has two; workflow branches may have more)
- **Observed during**: PR #29 review — found an infinite `useEffect` fetch loop that the disabled lint rule would have caught
- **Suggestion**: Walk each `eslint-disable-next-line react-hooks/exhaustive-deps` in the file, justify or fix it. Prefer the fix: either include the missing dep (and memoize callbacks if needed) or move the logic so the dep isn't required. Leaving the suppression in place masks real bugs like the one PR #29 had to patch.

## [2026-04-15] SIWS test-wallet harness for stadium-tester
- **Severity**: minor
- **File(s)**: `.claude/skills/stadium-tester/SKILL.md`, `client/src/lib/siwsUtils.ts`, `server/api/middleware/auth.middleware.js`
- **Observed during**: building the `stadium-tester` skill
- **Suggestion**: `stadium-tester` currently skips SIWS-gated live flows because there's no way to sign a SIWS message programmatically from a headless browser. Options: (a) mount a test wallet via a Playwright extension harness, (b) add a preview-only signed-request bypass keyed to an ephemeral secret, (c) stub the SIWS verification in preview-mode server. None are trivial — pick one when SIWS coverage becomes load-bearing.

## [2026-04-14] Admin confirm-payment bypasses the api wrapper
- **Severity**: minor
- **File(s)**: `client/src/pages/AdminPage.tsx:305,351`, `client/src/components/admin/M2BuildingProjectsTable.tsx:64`
- **Observed during**: wiring VITE_USE_MOCK_DATA preview flag
- **Suggestion**: three admin-side `fetch('/api/m2-program/.../confirm-payment')` calls bypass `client/src/lib/api.ts`. They're SIWS-gated so they can't execute in preview without a wallet signature (low preview risk), but they also dodge the mock-mode plumbing and any future cross-cutting concerns (retry, logging, error mapping). Refactor them to call `api.confirmPayment()` which already has a mock branch.

## [2026-04-14] Client lint currently fails with 90 errors / 8 warnings
- **Severity**: minor
- **File(s)**: `client/src/pages/AdminPage.tsx`, `client/src/pages/HomePage.tsx`, `client/src/pages/ProjectDetailsPage.tsx`, `client/tailwind.config.ts`
- **Observed during**: repo cleanup pass (running `npm run lint` as part of verification)
- **Suggestion**: `npm run lint` fails pre-existing — mostly `@typescript-eslint/no-explicit-any`, a few `no-useless-escape` in a regex, and a `require()` in tailwind config. `CLAUDE.md` §6 says lint must pass for PRs, but baseline is broken. Clean these in a dedicated PR before the first `/ship-issue` run touches one of those files (otherwise `/pre-pr-check` will block work that didn't cause the errors).

## [2026-04-14] Flatten the Supabase↔Mongo dual data layer
- **Severity**: minor
- **File(s)**: `server/db.js`, `server/api/repositories/project.repository.js`, `server/scripts/*.js`, `server/models/*.js`
- **Observed during**: repo cleanup pass (CLAUDE.md correction)
- **Suggestion**: the API runs on Supabase while `server/scripts/` still use Mongo/Mongoose as an offline staging layer. This split is a footgun — future agents may reach for the wrong layer. Consider porting the remaining useful scripts (seed-dev, migration.js, fix-bounty-amounts, list-winners-zero-paid, set-live-urls, set-m2-final-submissions) to Supabase directly, then dropping `mongoose` and `server/models/`. Not urgent, but worth flagging before the next large refactor.

## [2026-04-22] Add currency column to `bounty_prizes`
- **Severity**: minor
- **File(s)**: `supabase/migrations/*`, `server/api/repositories/project.repository.js`, `client/src/components/admin/WinnersTable.tsx`
- **Observed during**: fixing issue #27 (Plata Mia bounty split). Source of truth in `server/migration-data/prizes-symbiosis-2025.csv` differentiates USDC vs xx-token bounties. The schema has no currency column, so xx-network-denominated bounties get stored as bare NUMERIC amounts and misread as USDC when totalled alongside real USDC rows.
- **Suggestion**: add `bounty_prizes.currency` (CHECK `IN 'USDC','DOT','xx','other'`), backfill existing rows to `USDC` (the de-facto denomination today), update `transformProject` in the repository, and teach WinnersTable to render the currency per row. Not urgent — Phase 1 of the revamp explicitly defers this per the "additive only" principle. Revisit alongside issue #26.

## [2026-04-22] WinnersTable.openManageModal reads only `bountyPrize[0]`
- **Severity**: minor
- **File(s)**: `client/src/components/admin/WinnersTable.tsx:186,211`
- **Observed during**: fixing issue #27 (Plata Mia bounty split). After splitting her concatenated row into three, the table display renders all three (the component iterates, see line 547), but `openManageModal` prefills its state from `bountyPrize?.[0]` only — so the Manage modal loses access to bounties 2..N.
- **Suggestion**: rework the Manage modal to either (a) let the admin pick which bounty row to edit, or (b) show all bounties in an editable list. Not urgent — affects admin UX only, on projects with multiple bounty rows (Plata Mia is currently the only such row once #27 lands). Log once Phase 1 rehearsal exposes whether this actually blocks anything operational.

## [2026-04-22] Reconcile `server/scripts/` Supabase-vs-Mongo convention
- **Severity**: minor
- **File(s)**: `server/scripts/*.js`, `CLAUDE.md` §4
- **Observed during**: writing `server/scripts/fix-plata-mia-bounties.js` for issue #27.
- **Suggestion**: `CLAUDE.md` says `server/scripts/` is Mongo-only, but precedent for Supabase-touching scripts exists (`deploy-all.js` and the since-deleted `fix-bounty-amounts-supabase.js`). The rule is therefore already inaccurate. Either (a) update CLAUDE.md to acknowledge the mixed layer and specify when each is appropriate, or (b) move Supabase scripts into a sibling dir like `server/scripts/supabase/` and enforce the original rule. Paired with the existing "Flatten the Supabase↔Mongo dual data layer" entry above.

## [2026-04-22] Per-bounty source-of-truth CSVs missing for synergy-2025 and symmetry-2024
- **Severity**: minor
- **File(s)**: `server/migration-data/payouts.csv`, `server/migration-data/prizes-symbiosis-2025.csv`
- **Observed during**: writing `reconcile-bounty-amounts-supabase.js` for issue #28. The symbiosis-2025 CSV is the only per-bounty source of truth in the repo. `payouts.csv` has a single `Total Prize (USDC)` column for synergy-2025 and symmetry-2024, which is not enough to reconcile multi-track winners or verify individual bounty names/amounts.
- **Suggestion**: ask WebZero for the same-shaped screenshot / spreadsheet for synergy-2025 and symmetry-2024 (project, track, total prize, currency). Transcribe to `prizes-synergy-2025.csv` and `prizes-symmetry-2024.csv`, register them in `CSV_PATHS` in the reconciliation script, re-run. Until then, those two events are accepted as-is (their existing DB rows may be inaccurate in ways we can't verify).

## [2026-04-22] Five symbiosis-2025 Marketing-track winners missing from `projects` table
- **Severity**: minor
- **File(s)**: Supabase `projects` table, `server/migration-data/prizes-symbiosis-2025.csv`
- **Observed during**: reconciliation for issue #28. The CSV lists five Marketing 1 / Marketing 2 winners (Right of the DOTty, Khoj, Pointillism, Connected by the Dots, Crypto Therapy | Polkadot) that have no `projects` row at all — not just missing bounty rows. Reconciliation script skipped them because the project records don't exist.
- **Suggestion**: open a follow-up issue to add these projects. Needs project-level data (name, description, team wallets, categories) beyond what's in the prize CSV — likely a separate source-of-truth fetch from WebZero before implementation. Not blocking for Phase 1 alpha (Marketing projects aren't M2 incubator candidates).

## [2026-05-11] Distinguish "no contact row" vs "row with null email" in notification skips
- **Severity**: nit
- **File(s)**: `server/api/services/notification.service.js:9`
- **Observed during**: issue #68 (revamp-P2-02 notifications dispatcher) — reviewer flagged
- **Suggestion**: `notify()` collapses two distinct audit states into `error='no_contact'` — (a) wallet has never registered an email, (b) wallet had a row that was cleared. The `notifications` audit log loses this distinction. If Phase 3 adds retry logic or analytics over the table, the two states want separate reasons (e.g. `no_contact_row` vs `no_email_set`). Not blocking for P2-02; the spec does not mandate splitting them.

## [2026-05-11] `notification.repository.insertOrGetExisting` does not validate `status` before insert
- **Severity**: nit
- **File(s)**: `server/api/repositories/notification.repository.js:20`
- **Observed during**: issue #68 (revamp-P2-02 notifications dispatcher) — reviewer flagged
- **Suggestion**: caller-supplied `status` is written straight to Supabase; the DB `CHECK` constraint catches illegal values but the caller gets an opaque Postgres error rather than an `Error('invalid_status')`. Consider an in-process whitelist (`queued | sent | failed | skipped`) at the repo entry point. Consistent with the existing `wallet-contact.repository.js` pattern (no in-process validation), so deferring is fine; revisit when Issue 3 wires Resend.

## [2026-05-11] `notification.service.notify()` lacks a JSDoc contract block
- **Severity**: nit
- **File(s)**: `server/api/services/notification.service.js`
- **Observed during**: issue #68 (revamp-P2-02 notifications dispatcher) — reviewer flagged
- **Suggestion**: the four-argument signature and the "writes status=queued, does NOT call the provider yet" contract are implied. P2-04 implementers wiring `notify(...)` into admin controllers will benefit from a one-line JSDoc above the method documenting (args, return shape, idempotency via `(recipient, eventType, sourceId)`).

## [2026-05-18] Warn at startup when RESEND_API_KEY is set but RESEND_FROM_EMAIL is not
- **Severity**: nit
- **File(s)**: `server/api/services/email-transport.js`, `server/server.js`
- **Observed during**: issue #69 (revamp-P2-03 Resend integration) — reviewer flagged
- **Suggestion**: if `RESEND_API_KEY` is configured but `RESEND_FROM_EMAIL` is unset, `notify()` passes `from: undefined` to Resend, which returns a 4xx that is caught and marks the row `failed`. The send silently fails with an opaque reason. Add a one-time startup check (or a guard inside `_trySend`) that surfaces a clear `from_email_not_configured` error instead of an opaque provider 4xx.

## [2026-05-18] No length guard on admin feedback in the m2-changes-requested email body
- **Severity**: nit
- **File(s)**: `server/api/services/notification-templates/m2-changes-requested.js`
- **Observed during**: issue #69 (revamp-P2-03 Resend integration) — reviewer flagged
- **Suggestion**: `payload.feedback` is rendered into the email body verbatim (now HTML-escaped). Very long admin feedback produces an oversized email. Consider truncating with a "see the full feedback on your project page" link once P2-05 ships the project-page feedback surface.

## [2026-05-18] Pre-existing console.log calls in project.controller.js
- **Severity**: nit
- **File(s)**: `server/api/controllers/project.controller.js:75`, `server/api/controllers/project.controller.js:188`
- **Observed during**: issue #70 (revamp-P2-04 notify trigger wiring) — reviewer flagged
- **Suggestion**: two pre-existing `console.log` calls (a debug payload preview in `updateProject`, and an M2-agreement confirmation log) predate Phase 2 and were left untouched. Server code elsewhere uses the `logger` utility (`server/api/utils/logger.js`). Convert these to `logger.debug`/`logger.info` (or remove the debug preview) in a dedicated cleanup pass — out of scope for #70's minimal diff.

## [2026-05-18] TeamPaymentSection keys team-member rows by wallet address
- **Severity**: minor
- **File(s)**: `client/src/components/TeamPaymentSection.tsx:210`
- **Observed during**: full user-journey test pass (team-member journeys, Team & Payments tab)
- **Suggestion**: team-member cards render with `key={member.walletAddress || index}`. Wallet address is not guaranteed unique across a project's team members — in the mock dataset two Plata Mia members share the redacted address `5MockWalletAddressRedactedForPreviewPurposes00000`, so React logs "Encountered two children with the same key" (3× per Team & Payments render). The `|| index` fallback only triggers on a *falsy* address, so a non-empty-but-duplicate address still collides. Production addresses are normally distinct so it does not surface there, but keying on a non-unique field is fragile. Key by a stable unique member id, or always fold in the index (e.g. `` key={`${member.walletAddress}-${index}`} ``).

## [2026-05-21] Add `express-rate-limit` to admin-session + auth endpoints
- **Severity**: minor
- **File(s)**: `server/server.js`, `server/api/routes/admin-session.routes.js`
- **Observed during**: security audit after #121 (substrate verifier P0)
- **Suggestion**: `POST /api/admin/session` does SIWS signature verification (~50–200ms per call) and is unauthenticated. A burst of a few hundred req/sec could noticeably load the server. Add `express-rate-limit` with tight per-IP limits on `/api/admin/session` (e.g. 10/min) and a looser app-wide default (e.g. 200/min/IP). No new env vars needed.
- **Promoted**: #127

## [2026-05-21] Add `helmet` security headers middleware
- **Severity**: nit
- **File(s)**: `server/server.js`
- **Observed during**: security audit after #121
- **Suggestion**: server doesn't set `X-Frame-Options`, `X-Content-Type-Options`, or CSP. Railway terminates TLS and may set some at the edge, but defense-in-depth at the app layer is cheap. Drop `app.use(helmet())` after the CORS middleware. No CSP customisation needed since the server only serves JSON, not HTML.
- **Promoted**: #128

## [2026-05-21] `ADMIN_SESSION_SECRET` validation is lazy (first-call), not at startup
- **Severity**: nit
- **File(s)**: `server/api/auth/sessionToken.js:30`, `server/server.js`
- **Observed during**: security audit after #121
- **Suggestion**: `getSecret()` throws on the first `issueSessionToken`/`verifySessionToken` call if the env var is missing or under 32 chars. The server still boots successfully with a misconfigured secret, and the first admin to try logging in sees a 500. Move the check into `server.js` startup so misconfiguration fails fast and visibly in the deploy logs.
- **Promoted**: #129

## [2026-05-21] `requireAdmin` and `requireTeamMemberOrAdmin` don't capture `req.user.chain`
- **Severity**: nit
- **File(s)**: `server/api/middleware/auth.middleware.js` (`requireAdmin`, `requireTeamMemberOrAdmin`)
- **Observed during**: security audit after #121
- **Suggestion**: `requireProgramAdmin` and `requireAppAdmin` both stamp `chain` onto `req.user`. The other two middlewares don't. Downstream `auditLog.logSafe({ actor: { chain: req.user?.chain, … } })` calls then record `actor_chain = null` for any admin or team-member action — a forensics gap, not a security flaw. Add `chain: auth.chain` to both `req.user` assignments.
- **Promoted**: #130

## [2026-05-21] Audit-log coverage gaps on payment / payout actions
- **Severity**: minor
- **File(s)**: `server/api/controllers/project.controller.js` (`approveM2`, `requestChanges`, `confirmPayment`, `createContinuation`)
- **Observed during**: security audit after #121
- **Suggestion**: program-level mutations (`program.update`, `sponsor.*`, `signups.*`, `admin.*`, `application.<status>`) already log via `auditLog.logSafe`. Project-level mutations don't — `confirmPayment` in particular is high-value because it records on-chain payout proof. Wire `auditLog.logSafe` AFTER `res.json` for each, with `programId = project.program_id || null`. Continuations also worth auditing (post-M2 follow-up trail).
- **Promoted**: #131

## [2026-05-21] Tighten `tsconfig.app.json` strict mode (phased)
- **Severity**: minor
- **File(s)**: `client/tsconfig.app.json`
- **Observed during**: bug investigation in #120 — missing api methods typechecked as `any` because `noImplicitAny: false` and `strict: false`
- **Suggestion**: turn on `strict: true` + `noImplicitAny: true` after a sweep cleanup. Wide blast radius — likely hundreds of errors. Phase: first ratchet just `noImplicitAny: true`, fix everything, then enable `strictNullChecks`, then `strict: true`. Each phase its own PR.
- **Promoted**: #132

## [2026-05-21] Add a server boot smoke test
- **Severity**: nit
- **File(s)**: `server/tests/` (new)
- **Observed during**: investigating #117's bad merge that broke prod for ~10 min
- **Suggestion**: vitest currently tests handlers, repositories, and verifiers in isolation. None of the 243+ tests imports `server.js` end-to-end, so a route mounting an undefined controller method passes CI but crashes Railway at boot. Add a 1-test file that does `await import('../server.js')` with a 2s timeout, asserts the server starts listening, then closes. Would have caught #117 before merge.
- **Promoted**: #133

## [2026-05-21] CSV import body parsers might need formula-injection defense on read path too
- **Severity**: nit
- **File(s)**: `server/api/services/program-signup.service.js` (Luma CSV importer)
- **Observed during**: hardening CSV export (#122) for formula injection
- **Suggestion**: #122 sanitises the inbox EXPORT. The Luma CSV IMPORT reads attacker-controllable rows from a third-party file and persists them. The values aren't re-emitted to a spreadsheet from a different surface (yet), so import-side sanitisation isn't urgent — but if any future feature exports a CSV that includes signup names/emails from this table, the same defense must run. Either: apply the prefix at import time (defense in depth, alters stored data), or factor `csvCell` from `program-inbox.service.js` into a shared `csv.util.js` and call it everywhere CSV is generated.
- **Promoted**: #134
