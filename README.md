# 🏟️ Blockspace Stadium

A full-stack Web3 app for managing and reviewing projects submitted through the WebZero hackathon & M2 incubator program on Polkadot.

- **Client**: React 18 + Vite + TypeScript + Tailwind + shadcn/ui → deployed to Vercel
- **Server**: Express 5 (ESM) + Supabase (Postgres) → deployed to Railway
- **Contracts**: Rust + ink! (under `hackathonia/`, out of scope for most app work)
- **Auth**: Polkadot-JS extension + SIWS (Sign-In With Substrate) on admin routes

Live site: <https://stadium.joinwebzero.com>

---

## For contributors (human or agent)

This repo runs an agentic workflow. Before you file an issue or open a PR, read these in order:

1. **[CLAUDE.md](./CLAUDE.md)** — architecture, invariants, and the contract every contributor follows.
2. **[docs/AGENTIC_WORKFLOW.md](./docs/AGENTIC_WORKFLOW.md)** — step-by-step guide: one-time setup, the `/ship-issue` loop, UI/UX testing specifics, and what never to do.
3. **[docs/AGENT_GUIDE.md](./docs/AGENT_GUIDE.md)** — deeper reference: data flow, SIWS auth, testing patterns, deployment.

Issues use templates with a mandatory `## Test scenarios` section — the `stadium-tester` Skill drives a real browser against those scenarios before a PR is allowed to open.

---

## Project structure

```
.
├── client/        Frontend (React + Vite + TypeScript) → Vercel
├── server/        Backend (Express + Supabase)         → Railway
├── hackathonia/   Ink! smart contracts (Rust)
├── supabase/      SQL migrations for the live DB
├── .claude/       Subagents, skills, slash commands (agentic workflow)
├── .github/       Issue/PR templates, CODEOWNERS, CI
└── docs/          Architecture, deployment, design docs, improvement backlog
```

---

## Getting started (local development)

### Prerequisites

- Node.js ≥ 20
- `gh` CLI (`brew install gh` + `gh auth login`) — required by the agentic workflow
- A Supabase project (URL + service-role key) — or read-only access to the shared dev project
- Docker (only if you plan to run the Mongo-backed utility scripts in `server/scripts/`)

### 1. Clone and install

```bash
git clone https://github.com/StadiumDevs/stadium.git
cd stadium
cd client && npm install && cd ..
cd server && npm install && cd ..
```

### 2. Configure the server

```bash
cp server/.env.example server/.env
# Edit server/.env and set:
#   SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY
#   ADMIN_WALLETS          # comma-separated SS58 addresses
#   EXPECTED_DOMAIN        # e.g. localhost for dev
```

Start the API:

```bash
cd server
npm run dev                # nodemon on http://localhost:2000
```

### 3. Configure the client

```bash
cp client/.env.example client/.env
# Edit client/.env and set:
#   VITE_API_BASE_URL=http://localhost:2000/api
#   VITE_ADMIN_ADDRESSES=<your-ss58-address>
#   VITE_USE_MOCK_DATA=false    # set true to run on fixtures, no backend needed
```

Start the dev server:

```bash
cd client
npm run dev                # Vite on http://localhost:8080
```

### 4. (Optional) Mock-mode: no Supabase, no backend

If you only need the UI up and don't want to wire a backend:

```bash
cd client
VITE_USE_MOCK_DATA=true npm run dev
```

The client then serves fixtures from `client/src/lib/mockWinners.ts` (159 sanitized production projects) and simulates writes in `localStorage`. This is the same mode every Vercel preview runs in.

### 5. (Optional) Mongo-backed scripts

A handful of utility scripts in `server/scripts/` (seed-dev, migration, fix-bounty-amounts, list-winners-zero-paid, etc.) use MongoDB via Mongoose as an offline staging layer — **not** for the API. If you need them:

```bash
docker compose up mongodb -d     # start Mongo on :27017
# Set MONGO_URI in server/.env
cd server
npm run seed:dev                 # example — also: db:migrate, db:reset, list:winners-zero-paid
```

Mongo is **not** required to run the API. If you're doing normal feature work, skip this.

---

## Key commands

**Client (`cd client`):**

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on `:8080` |
| `npm run build` | `tsc && vite build` (this is the typecheck) |
| `npm run lint` | ESLint with `--max-warnings 0` |

**Server (`cd server`):**

| Command | What it does |
|---|---|
| `npm run dev` | Nodemon on `:2000` |
| `npm start` | Production start |
| `npm test` | Vitest |
| `npm run seed:dev` | Destructive: reset local Mongo + seed fixture projects |
| `npm run db:migrate` | Import historical projects into local Mongo |
| `npm run list:winners-zero-paid` | Report on winners with zero confirmed payments |

See `server/package.json` for the full list. Anything under `db:*` / `seed:*` hits the **local Mongo staging DB**, not the live Supabase DB.

---

## Environment variables

### Server (`server/.env`)

| Name | Required | Purpose |
|---|---|---|
| `SUPABASE_URL` | yes | API runtime data layer |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | API runtime data layer |
| `ADMIN_WALLETS` | yes | Comma-separated SS58 addresses allowed on admin routes |
| `EXPECTED_DOMAIN` | yes | SIWS domain binding |
| `NETWORK_ENV` | yes | `testnet` or `mainnet` |
| `AUTHORIZED_SIGNERS` | yes (admin flows) | Multisig signer list |
| `NODE_ENV` | yes | `development` / `production` |
| `MONGO_URI` | no | Only needed for `server/scripts/*.js` utility tools |

### Client (`client/.env`)

| Name | Required | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | yes | e.g. `http://localhost:2000/api` for dev |
| `VITE_ADMIN_ADDRESSES` | yes | Comma-separated SS58 addresses (must match server `ADMIN_WALLETS`) |
| `VITE_USE_MOCK_DATA` | no | `true` on Vercel Preview; unset/`false` in prod |

---

## API

See **[docs/API_DOCS.md](./docs/API_DOCS.md)** for the full endpoint reference and **[docs/DATA_SCHEMA.md](./docs/DATA_SCHEMA.md)** for the project schema.

Routes are defined in `server/api/routes/` and served under `/api/`. Admin-only and team-member routes use `server/api/middleware/auth.middleware.js` (SIWS verification).

---

## Deployment

- **Client** → **Vercel**. `npm run build` output, deployed automatically on push to `develop` (preview) and merge to `main` (production). Preview deployments run with `VITE_USE_MOCK_DATA=true` (configured in Vercel dashboard) so branch previews never touch production data.
- **Server** → **Railway**. See `server/railway.json` and `server/Dockerfile`. Env vars (`SUPABASE_*`, `ADMIN_WALLETS`, `NETWORK_ENV`, `AUTHORIZED_SIGNERS`, etc.) live in the Railway dashboard.
- **Database** → **Supabase**. SQL migrations are under `supabase/migrations/`.

Full production notes: **[docs/PRODUCTION_DEPLOYMENT.md](./docs/PRODUCTION_DEPLOYMENT.md)**.

Wallet configuration in production: **[docs/ADMIN_WALLET_PRODUCTION.md](./docs/ADMIN_WALLET_PRODUCTION.md)**.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Frontend shows no projects | `VITE_API_BASE_URL` points nowhere, or the backend isn't running. Check `window.__STADIUM_MOCK__` in devtools — if you're in mock mode it should be `true`. |
| Admin panel stuck on "Loading admin panel…" | Ensure you've signed in with an admin wallet (in `VITE_ADMIN_ADDRESSES`). The infinite-fetch loop this used to hide was fixed in `AdminPage.tsx`. |
| Wallet connected but admin actions disabled | `VITE_ADMIN_ADDRESSES` doesn't include your address, or you didn't restart the dev server after editing `.env`. Vite needs a restart to pick up env changes. |
| Port already in use (2000 / 8080) | `lsof -i :2000 -i :8080` to find the process; kill it or change the port in `vite.config.ts` / `server.js`. |
| `gh auth status` says logged out | Run `gh auth login` — the agentic workflow needs it. |
| First run of `/stadium-tester` times out | Chromium is downloading (~150MB). Run `bash .claude/skills/stadium-tester/setup.sh` manually to watch progress. |

---

## Documentation index

- **[CLAUDE.md](./CLAUDE.md)** — the repo's agent briefing / contributor contract
- **[docs/AGENTIC_WORKFLOW.md](./docs/AGENTIC_WORKFLOW.md)** — step-by-step contributor guide
- **[docs/AGENT_GUIDE.md](./docs/AGENT_GUIDE.md)** — deep reference: data flow, SIWS, testing
- **[docs/API_DOCS.md](./docs/API_DOCS.md)** — API endpoint reference
- **[docs/DATA_SCHEMA.md](./docs/DATA_SCHEMA.md)** — Supabase schema
- **[docs/PRODUCTION_DEPLOYMENT.md](./docs/PRODUCTION_DEPLOYMENT.md)** — Railway + Vercel deploy notes
- **[docs/ADMIN_WALLET_PRODUCTION.md](./docs/ADMIN_WALLET_PRODUCTION.md)** — admin wallet setup
- **[docs/M2-PHASES-DB-FIELDS.md](./docs/M2-PHASES-DB-FIELDS.md)** — M2 program phases & DB fields
- **[docs/M2_DATE_ENFORCEMENT.md](./docs/M2_DATE_ENFORCEMENT.md)** — week-based restrictions
- **[docs/TEAM_PAYMENT_IMPLEMENTATION.md](./docs/TEAM_PAYMENT_IMPLEMENTATION.md)** — payment flow
- **[docs/DEBUG_UI_PROJECTS.md](./docs/DEBUG_UI_PROJECTS.md)** — UI data troubleshooting
- **[docs/ADMIN-REVIEW.md](./docs/ADMIN-REVIEW.md)** — admin UX review checklist
- **[docs/stadium-shadcn-design-guide.md](./docs/stadium-shadcn-design-guide.md)** — design system
- **[docs/improvement-backlog.md](./docs/improvement-backlog.md)** — open items for contributors

---

## Contributing

Start with `docs/AGENTIC_WORKFLOW.md`. The short version:

1. File an issue using the template — include `## Test scenarios` (mandatory).
2. `/ship-issue <number>` in Claude Code, or tackle it manually.
3. Both gates must pass: `/pre-pr-check` and `/stadium-tester`.
4. PR opens as **draft** targeting `develop`. Never directly to `main`.
5. A human CODEOWNER reviews and merges. The agent is never in `CODEOWNERS`.

---

## License

See [LICENSE](./LICENSE).
