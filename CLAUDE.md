# Stadium — Agent Briefing

This file is the first thing any agent working on this repo should read. It is the contract for how features and fixes are shipped here. For deeper detail see `docs/AGENT_GUIDE.md`.

---

## 1. What this repo is

Stadium is the web app for the WebZero hackathon/incubator program on Polkadot. Three components live here:

- `client/` — React 18 + Vite + TypeScript + Tailwind + shadcn/ui. Talks to the server via `client/src/lib/api.ts`. Admin auth via Polkadot-JS extension + SIWS (Sign-In With Substrate).
- `server/` — Express 5, ESM (`"type": "module"`). Tests via Vitest.
- `hackathonia/` — Rust ink! smart contracts (out of scope for most feature work — touch only if the issue explicitly asks for contract changes).

**Data layers (important — two co-exist):**

- **API runtime = Supabase.** `server/db.js` builds a Supabase client from `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. `server/api/repositories/project.repository.js` is the canonical data access layer — every controller and service goes through it. New API code adds queries here.
- **Offline tooling = MongoDB via Mongoose.** `server/scripts/*.js` (seed-dev, migration, fix-bounty-amounts, list-winners-zero-paid, set-live-urls, set-m2-final-submissions, seed-m2-test-project) use Mongoose against a local Mongo for bulk imports, backfills, and reports. `server/models/Project.js` is their schema. **Not wired to any route.** Never add a Mongoose query to `server/api/**`.

Deployment: server → Railway, client → Vercel.

Default branch on origin: `develop`. Long-lived branches include `main`, `develop`, `design-revamp`. PRs normally target `develop`.

---

## 2. Key commands

Always run from the subdir, not the repo root.

**Client (`cd client`):**
- `npm run dev` — Vite dev server
- `npm run build` — `tsc && vite build` (this is the typecheck; there is no separate `typecheck` script — don't invent one)
- `npm run lint` — ESLint with `--max-warnings 0` (warnings fail)
- No test script — do not write one in this pass

**Server (`cd server`):**
- `npm run dev` — nodemon
- `npm test` — `vitest run`
- `npm start` — `node server.js`
- `npm run seed:dev`, `npm run db:migrate`, `npm run db:reset` — local Mongo tooling (destructive; run only when asked)
- `npm run verify:production`, `npm run verify:main-deployed`, `npm run deploy:all` — operational

---

## 3. Directory map

```
client/src/
  pages/           AdminPage, HomePage, M2ProgramPage, ProjectDetailsPage, WinnersPage, NotFound
  components/      shadcn/ui + feature components
  hooks/           use-toast.tsx, use-mobile
  lib/             api.ts, constants.ts, siwsUtils.ts, polkadot-config.ts, addressUtils.ts, paymentUtils.ts, projectUtils.ts, utils.ts
  App.tsx          routing (react-router-dom v6)
  index.css        theme variables (dark mode only)

server/
  server.js        entry — imports connectToSupabase from db.js
  db.js            Supabase client construction (live API data layer)
  api/
    routes/        *.routes.js  (currently: m2-program.routes.js)
    controllers/   *.controller.js
    services/      business logic
    repositories/  project.repository.js — Supabase queries, single source of truth for API data access
    middleware/    auth.middleware.js (SIWS), logging.middleware.js
    utils/
    constants/
  models/          Mongoose models (script-only, NOT used by routes): Project.js, MultisigTransaction.js
  scripts/         offline data tooling (Mongo-backed; destructive — do not run)
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
- Every admin-protected server route must use middleware from `auth.middleware.js`: `requireAdmin` for admin-only, `requireTeamMemberOrAdmin` for team+admin. See `server/api/middleware/__tests__/verify-onchain.test.js` for the canonical test shape.
- Client env vars must be prefixed `VITE_` or Vite will not expose them.

---

## 5. How to add a feature

Recipes for the common shapes. Reuse the listed utilities; do not create parallel versions.

**New client page:**
1. Create `client/src/pages/YourPage.tsx`.
2. Register the route in `client/src/App.tsx`.
3. API calls go through `client/src/lib/api.ts` — add a function there, don't `fetch()` inline.
4. Admin-gated? Use the existing auth pattern from `AdminPage.tsx` (Polkadot extension + SIWS, see `client/src/lib/siwsUtils.ts`).

**New server endpoint:**
1. Add a handler to `server/api/controllers/project.controller.js` (or a new controller following its pattern).
2. Add the route in `server/api/routes/*.routes.js`; `server.js` mounts route files.
3. If it mutates admin data: attach `requireAdmin` or `requireTeamMemberOrAdmin` from `auth.middleware.js`.
4. Data access goes through `server/api/repositories/project.repository.js` (Supabase). Extend it — don't query Supabase directly from a controller, and don't reach for Mongoose.
5. Write a Vitest test in `server/api/**/__tests__/*.test.js` or `server/tests/`.

**New admin-protected endpoint checklist:**
- [ ] Route uses `requireAdmin` or `requireTeamMemberOrAdmin`
- [ ] Data access through `project.repository.js` (Supabase)
- [ ] Test covers both authorized and unauthorized cases

**Database schema change (columns / tables):**
1. Add a SQL migration under `supabase/migrations/`.
2. Update the transform function in `server/api/repositories/project.repository.js` (snake_case ↔ camelCase).
3. Regenerate / apply in Supabase per `docs/PRODUCTION_DEPLOYMENT.md`.

---

## 6. Workflow contract

When you ship an issue, follow this loop. It is enforced by slash commands in `.claude/commands/`.

1. **Explore** — read the issue, map affected files. Use the `stadium-explorer` subagent for anything non-trivial.
2. **Plan** — produce a written plan: files to change, tests to add, invariants to respect. Post it for the user.
3. **Wait for approval** — do not write code until the user (or a CODEOWNER in CI) approves the plan. This is non-negotiable.
4. **Implement** — smallest diff that satisfies the issue. Reuse utilities. No scope creep.
5. **Verify** — run `/pre-pr-check` (server tests + client build + client lint). Must pass.
6. **Draft PR** — always open as **draft** targeting `develop`. Link the issue. Summary + test plan + any backlog entries created.
7. **Stop** — never merge. A human CODEOWNER reviews and merges. The agent is never a CODEOWNER.

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
- Node: match CI; check `.nvmrc` if present.
- **Server runtime** needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_WALLETS`, `EXPECTED_DOMAIN`, `AUTHORIZED_SIGNERS`, `NETWORK_ENV`. See `server/.env.example`.
- **Local Mongo tooling** (only if you're running `npm run seed:dev` / `db:*` / `list:winners-zero-paid`) additionally needs `MONGO_URI` and a local `mongosh`.
- Copy `client/.env.example` → `client/.env` and `server/.env.example` → `server/.env`. Never commit real secrets.

### Vercel preview deployments

Every branch pushed to `origin` gets an automatic Vercel preview URL for the client. Previews run in **mock mode** — `VITE_USE_MOCK_DATA=true` must be set on the **Preview** environment in the Vercel dashboard (scope = Preview only, not Production). When this flag is on, `client/src/lib/api.ts` serves fixtures from `src/lib/mockWinners.ts` for reads and simulates writes in `localStorage` / in-memory mock objects. Production must leave the flag unset or `false`.

Use the preview URL for visual review before approving a `/ship-issue` PR. Real-API end-to-end testing happens in the Railway staging / production environment, not from a branch preview.

---

## 9. Subagents and slash commands

See `.claude/agents/` and `.claude/commands/`. Headline commands:

- `/ship-issue <number>` — the full flow above for a single issue
- `/triage-issue <number>` — plan only, posted as a comment
- `/log-improvement <desc>` — append to backlog
- `/promote-backlog` — convert backlog entries to GH issues (asks first)
- `/pre-pr-check` — run server tests + client build + client lint
