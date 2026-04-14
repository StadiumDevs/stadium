# Stadium — Agent Briefing

This file is the first thing any agent working on this repo should read. It is the contract for how features and fixes are shipped here. For deeper detail see `docs/AGENT_GUIDE.md`.

---

## 1. What this repo is

Stadium is the web app for the WebZero hackathon/incubator program on Polkadot. Three components live here:

- `client/` — React 18 + Vite + TypeScript + Tailwind + shadcn/ui. Talks to the server via `client/src/lib/api.ts`. Admin auth via Polkadot-JS extension + SIWS (Sign-In With Substrate).
- `server/` — Express 5 + Mongoose (MongoDB). ESM (`"type": "module"`). SIWS verification on admin routes. Tests via Vitest.
- `hackathonia/` — Rust ink! smart contracts (out of scope for most feature work — touch only if the issue explicitly asks for contract changes).

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
- DB scripts live under `npm run db:*` — treat as destructive, never run without the user asking

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
  server.js        entry
  api/
    routes/        *.routes.js  (currently: m2-program.routes.js)
    controllers/   *.controller.js
    services/      business logic
    repositories/  data access
    middleware/    auth.middleware.js (SIWS), logging.middleware.js
    utils/
    constants/
  models/          Mongoose models: Project.js, MultisigTransaction.js
  tests/           standalone tests
  vitest.config.js
  scripts/         operational scripts (destructive — do not run)
```

---

## 4. Invariants and gotchas

These have bitten us before. Do not regress them.

- `BYPASS_ADMIN_CHECK` in `client/src/pages/AdminPage.tsx` **must stay `false`**. Was `true` once and shipped — it's a full auth bypass.
- Admin wallet list comes from env (`VITE_ADMIN_ADDRESSES` on client, `ADMIN_WALLETS` on server). Never hardcode addresses.
- Toast hook path: `@/hooks/use-toast` resolves to `use-toast.tsx`, not `.ts` (Vite resolution quirk). There used to be a duplicate `.ts` — do not reintroduce it.
- Dark mode is forced in `App.tsx`. Don't add light-mode-only styles or hex colors with `!important` in `index.css`.
- No `console.log`/`console.warn`/`console.error` in production client code. They were stripped deliberately.
- Server is ESM — use `import`, not `require`. Mongoose models use ESM default exports.
- Every admin-protected server route must use `auth.middleware.js` (SIWS verification). See `server/api/middleware/__tests__/verify-onchain.test.js` for the canonical test shape.
- Client env vars must be prefixed `VITE_` or Vite will not expose them.
- Legacy Supabase files still exist in `supabase/` and some `server/scripts/*.js` — MongoDB is the source of truth now. Do not add new Supabase code.

---

## 5. How to add a feature

Recipes for the common shapes. Reuse the listed utilities; do not create parallel versions.

**New client page:**
1. Create `client/src/pages/YourPage.tsx`.
2. Register the route in `client/src/App.tsx`.
3. API calls go through `client/src/lib/api.ts` — add a function there, don't `fetch()` inline.
4. Admin-gated? Use the existing auth pattern from `AdminPage.tsx` (Polkadot extension + SIWS, see `client/src/lib/siwsUtils.ts`).

**New server route:**
1. Add handler to a new or existing `server/api/controllers/*.controller.js`.
2. Add route in `server/api/routes/*.routes.js`, register it in `server.js`.
3. If it mutates admin data: add `auth.middleware.js` on the route.
4. Write a Vitest test in `server/api/**/__tests__/*.test.js` or `server/tests/`.

**New Mongoose model:**
1. `server/models/YourModel.js` — follow the shape of `Project.js`.
2. Access via a repository in `server/api/repositories/` if querying is non-trivial.

**New admin-protected endpoint checklist:**
- [ ] Route uses `auth.middleware.js`
- [ ] Signer verified against `ADMIN_WALLETS` env
- [ ] Test covers both authorized and unauthorized cases

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
- Node version: check `.nvmrc` or `package.json` `engines` if present; otherwise match CI.
- MongoDB must be running locally for server dev/tests that hit the DB.
- Environment: copy `client/.env.example` → `client/.env` and `server/.env.example` → `server/.env`. Never commit real secrets.

---

## 9. Subagents and slash commands

See `.claude/agents/` and `.claude/commands/`. Headline commands:

- `/ship-issue <number>` — the full flow above for a single issue
- `/triage-issue <number>` — plan only, posted as a comment
- `/log-improvement <desc>` — append to backlog
- `/promote-backlog` — convert backlog entries to GH issues (asks first)
- `/pre-pr-check` — run server tests + client build + client lint
