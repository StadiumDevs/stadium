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
