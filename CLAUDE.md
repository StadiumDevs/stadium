# Stadium — Agent Briefing

This file is the first thing any agent working on this repo should read. It is the contract for how features and fixes are shipped here. For deeper detail see `docs/AGENT_GUIDE.md`.

---

## 1. What this repo is

Stadium is the web app for the WebZero hackathon/incubator program on Polkadot. Three components live here:

- `client/` — React 18 + Vite + TypeScript + Tailwind + shadcn/ui. Talks to the server via `client/src/lib/api.ts`. Sign-in: wallet signatures (SIWS for Substrate, plus Ethereum/Solana) and Supabase email sessions — see §4 "Auth model".
- `server/` — Express 5, ESM (`"type": "module"`). Tests via Vitest.
- `hackathonia/` — Rust ink! smart contracts (out of scope for most feature work — touch only if the issue explicitly asks for contract changes).

**Data layers (important — two co-exist):**

- **API runtime = Supabase.** `server/db.js` builds a Supabase client from `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. `server/api/repositories/` is the data access layer: one repository per table or concern (`project.repository.js`, `program.repository.js`, `payout.repository.js`, …). Controllers and services go through a repository; new API code adds or extends one.
- **Offline tooling = MongoDB via Mongoose.** `server/scripts/*.js` (seed-dev, migration, fix-bounty-amounts, list-winners-zero-paid, set-live-urls, set-m2-final-submissions, seed-m2-test-project) use Mongoose against a local Mongo for bulk imports, backfills, and reports. `server/models/Project.js` is their schema. **Not wired to any route.** Never add a Mongoose query to `server/api/**`.

Deployment: server → Railway, client → Vercel.

Default branch on origin: `develop`. Long-lived branches include `main`, `develop`, `design-revamp`. PRs normally target `develop`.

---

## 2. Key commands

Always run from the subdir, not the repo root.

**Client (`cd client`):**
- `npm run dev` — Vite dev server
- `npm run build` — `tsc && vite build`. **Caveat:** `client/tsconfig.json` is solution-style (`"files": []`), so plain `tsc` type-checks nothing; type errors are not caught by the build today (open in `docs/improvement-backlog.md`). Don't invent a separate `typecheck` script.
- `npm run lint` — ESLint with `--max-warnings 0` (warnings fail)
- No test script — do not write one in this pass

**Server (`cd server`):**
- `npm run dev` — nodemon
- `npm test` — `vitest run`
- `npm start` — `node server.js`
- `npm run seed:dev`, `npm run db:migrate`, `npm run db:reset` — local Mongo tooling (destructive; run only when asked)
- `npm run verify:production`, `npm run verify:main-deployed` — operational (read-only prod health checks). Deploys are automatic: merging to `main` triggers Railway (server) + Vercel (client) via their GitHub integrations.

---

## 3. Directory map

```
client/src/
  pages/           AdminPage, AdminProgramPage, AppAdminsPage, HomePage, M2ProgramPage, NotFound,
                   ProgramDetailPage, ProgramsPage, ProgramStatsPage, ProgramWinnerPage,
                   ProjectDetailsPage, WinnersPage
  components/      shadcn/ui + feature components (admin/, program/, auth/, stats/, …)
  hooks/           use-toast.tsx, use-mobile.tsx, use-brightness.ts, use-page-meta.ts
  lib/             api.ts (all API calls + mock mode), constants.ts, auth/ (wallet + email sign-in,
                   admin session), siwsUtils.ts, testWalletInjection.ts, supabase.ts,
                   mock*.ts + mocks/ (mock-mode fixtures), polkadot-config.ts, addressUtils.ts, …
  App.tsx          routing (react-router-dom v6)
  index.css        theme variables (dark mode only)

server/
  server.js        entry — imports connectToSupabase from db.js
  db.js            Supabase client construction (live API data layer)
  api/
    routes/        admin-session, admin-tiers, m2-program, program, wallet-contact (*.routes.js)
    controllers/   *.controller.js
    services/      business logic
    repositories/  one per table/concern — the only place API code queries Supabase
    middleware/    auth.middleware.js (require* gates), logging.middleware.js
    auth/          sign-in internals: verifiers/ (substrate, ethereum, solana), sessionToken,
                   nonceStore, authorizedSigners, normalize, supabaseUser
    utils/
    constants/
  models/          Mongoose models (script-only, NOT used by routes): Project.js, MultisigTransaction.js
  scripts/         offline data tooling (Mongo-backed; destructive — do not run)
  config/          polkadot-config.js (network, multisig, signer list)
  ci/              boot-check.js (CI: load every route without a database)
  sim/             in-memory Supabase fake for journey tests
  tests/           standalone tests
  vitest.config.js

supabase/          SQL migrations for the live Supabase DB
```

---

## 4. Invariants and gotchas

These have bitten us before. Do not regress them.

- `BYPASS_ADMIN_CHECK` in `client/src/pages/AdminPage.tsx` **must stay `false`**. Was `true` once and shipped — it's a full auth bypass.
- Admin wallet list comes from env (`VITE_ADMIN_ADDRESSES` on client, `ADMIN_WALLETS` on server). Never hardcode addresses.
- **Never add Mongoose queries to `server/api/**`.** The API is Supabase. If you find yourself reaching for `server/models/Project.js` outside `server/scripts/`, stop — you're on the wrong layer.
- **Never add Supabase calls to `server/scripts/`** the other way either. Scripts are Mongo-backed; keep them that way.
- Toast hook path: `@/hooks/use-toast` resolves to `use-toast.tsx`, not `.ts` (Vite resolution quirk). There used to be a duplicate `.ts` — do not reintroduce it.
- Dark mode is forced in `App.tsx`. Don't add light-mode-only styles or hex colors with `!important` in `index.css`.
- No `console.log`/`console.warn`/`console.error` in production client code. They were stripped deliberately.
- Server is ESM — use `import`, not `require`.
- Every admin-protected server route must use middleware from `auth.middleware.js`: `requireAdmin` for admin-only, `requireTeamMemberOrAdmin` for team+admin. See `server/api/middleware/__tests__/auth.middleware.test.js` for the canonical test shape.
- Client env vars must be prefixed `VITE_` or Vite will not expose them.

### Auth model

Every admin or team action is authorized on the server by `auth.middleware.js`. Requests carry one of:
- **A wallet signature** (`x-siws-auth`): a signed SIWS/SIWE/Solana message, checked for signature, statement, domain (`EXPECTED_DOMAIN`), expiry and a single-use nonce.
- **A session token** (`Authorization: Bearer …`): after one signature, `POST /api/admin/session` issues a short-lived HMAC token (`ADMIN_SESSION_SECRET`, default 15 min). Later requests use it instead of re-signing (`viaSession`, `[session-bearer]` in logs). It proves *who* signed, not that they are an admin: each `require*` middleware still checks the admin lists on every request. Irreversible actions (e.g. publishing results) still ask for a fresh signature.
- **A Supabase email session** (`x-supabase-token`): program admins and judges invited by email; checked against `program_admin_emails` grants.

So "every admin action is signed" is not literally true: most requests ride the session token or an email session.

---

## 5. How to add a feature

Recipes for the common shapes. Reuse the listed utilities; do not create parallel versions.

**New client page:**
1. Create `client/src/pages/YourPage.tsx`.
2. Register the route in `client/src/App.tsx`.
3. API calls go through `client/src/lib/api.ts` — add a function there, don't `fetch()` inline.
4. Admin-gated? Use the existing auth pattern from `AdminPage.tsx` (Polkadot extension + SIWS, see `client/src/lib/siwsUtils.ts`).

**New server endpoint:**
1. Add a handler to the matching controller in `server/api/controllers/` (or a new one following the same pattern).
2. Add the route in `server/api/routes/*.routes.js`; `server.js` mounts route files.
3. If it mutates admin data: attach `requireAdmin` or `requireTeamMemberOrAdmin` from `auth.middleware.js`.
4. Data access goes through a repository in `server/api/repositories/` (Supabase). Extend the matching one or add a new one — don't query Supabase directly from a controller, and don't reach for Mongoose.
5. Write a Vitest test in `server/api/**/__tests__/*.test.js` or `server/tests/`.

**New admin-protected endpoint checklist:**
- [ ] Route uses `requireAdmin` or `requireTeamMemberOrAdmin`
- [ ] Data access through a repository in `server/api/repositories/` (Supabase)
- [ ] Test covers both authorized and unauthorized cases

**Database schema change (columns / tables):**
1. Add a SQL migration under `supabase/migrations/`.
2. Update the transform function in the matching repository under `server/api/repositories/` (snake_case ↔ camelCase).
3. Regenerate / apply in Supabase per `docs/PRODUCTION_DEPLOYMENT.md`.

---

## 6. Workflow contract

When you ship an issue, follow this loop. It is enforced by slash commands in `.claude/commands/`.

1. **Explore** — read the issue, map affected files. Use the `stadium-explorer` subagent for anything non-trivial.
2. **Plan** — produce a written plan: files to change, tests to add, invariants to respect. Post it for the user.
3. **Wait for approval** — do not write code until the user (or a CODEOWNER in CI) approves the plan. This is non-negotiable.
4. **Implement** — smallest diff that satisfies the issue. Reuse utilities. No scope creep.
5. **Verify** — run `/pre-pr-check` (server tests + client build + client lint), then `stadium-tester` against the Vercel preview / local dev server using the issue's `## Test scenarios`. Both must pass. **If the issue has zero scenarios, stop and ask the author to add them — no PR is opened without scenarios. If any scenario FAILs, return to the implementer — no PR on failures. The tester's report must be pasted into the PR body.**
6. **Draft PR** — always open as **draft** targeting `develop`. Link the issue. Summary + test plan + `stadium-tester` report + any backlog entries created.
7. **Iterate on review** — when the reviewer leaves comments, use `/address-review <pr>` to fetch them, classify (CODE / REPLY / REJECT), wait for user approval of the classification, then push fixes and reply.
8. **Stop** — never merge. A human CODEOWNER reviews and merges. The agent is never a CODEOWNER.

If any step fails, stop and report. Do not bypass with `--no-verify`, do not disable tests, do not force-push shared branches.

---

## 7. Improvements protocol

While working, you will notice things that are wrong or could be better but are out of scope for the current issue. Log them; do not silently fix them.

- **Nits and small observations** → append to `docs/improvement-backlog.md` using the template there, via `/log-improvement`.
- **Real bugs or meaningful improvements** → open a GitHub issue with the `claude-suggested` label via `/promote-backlog` (which asks you first).
- The agent never creates issues without asking. The agent never merges.

---

## 8. Tooling expectations

- `gh` CLI may or may not be installed locally. Slash commands check and fail with a clear message if it's missing.
- Node: match CI. The server's version is in `server/.nvmrc` (Railway runs it); the client has none (CI uses Node 24).
- **Server runtime** needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SESSION_SECRET` (≥ 32 chars; the server won't boot without it), `ADMIN_WALLETS`, `EXPECTED_DOMAIN`, `AUTHORIZED_SIGNERS`, `NETWORK_ENV`. See `server/.env.example`.
- **Local Mongo tooling** (only if you're running `npm run seed:dev` / `db:*` / `list:winners-zero-paid`) additionally needs `MONGO_URI` and a local `mongosh`.
- Copy `client/.env.example` → `client/.env` and `server/.env.example` → `server/.env`. Never commit real secrets.

### Vercel preview deployments

Every branch pushed to `origin` gets an automatic Vercel preview URL for the client. Previews run in **mock mode** — `VITE_USE_MOCK_DATA=true` must be set on the **Preview** environment in the Vercel dashboard (scope = Preview only, not Production). When this flag is on, `client/src/lib/api.ts` serves fixtures from `src/lib/mockWinners.ts` for reads and simulates writes in `localStorage` / in-memory mock objects. Production must leave the flag unset or `false`.

Use the preview URL for visual review before approving a `/ship-issue` PR. Real-API end-to-end testing happens in the Railway staging / production environment, not from a branch preview.

---

## 9. Subagents, skills, and slash commands

Subagents (`.claude/agents/`):

- `stadium-explorer` — codebase search tuned to this layout
- `stadium-implementer` — writes the code per the approved plan
- `stadium-reviewer` — pre-PR check against repo invariants

Skills (`.claude/skills/`):

- `stadium-tester` — drives a real headless Chromium against the Vercel preview / dev server and verifies each issue's `## Test scenarios`. Invoke as `/stadium-tester <target-url> "<scenarios>"`. Auto-loads when the agent is verifying UI behavior.

Slash commands (`.claude/commands/`):

- `/ship-issue <number>` — full workflow for a single issue (explore → plan → approve → implement → verify → tester → draft PR)
- `/triage-issue <number>` — plan only, posted as a comment
- `/address-review <pr>` — fetch PR review comments, classify, address, push, and reply
- `/log-improvement <desc>` — append to backlog
- `/promote-backlog` — convert backlog entries to GH issues (asks first)
- `/pre-pr-check` — run server tests + client build + client lint
- `/verify-tester` — one-shot health check that the `stadium-tester` Skill is wired up correctly (Playwright + Chromium installed, runner reachable, prod guard intact)

The tester is project-scoped: it lives at `.claude/skills/stadium-tester/` and uses local Playwright (installed into `client/node_modules` via `bash .claude/skills/stadium-tester/setup.sh`). First run on a fresh machine downloads Chromium (~150MB).
