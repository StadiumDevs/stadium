# Stadium Agent Guide

Companion to `CLAUDE.md`. Deeper reference material for agents implementing non-trivial features. Read `CLAUDE.md` first — this doc assumes you've absorbed it.

---

## Architecture

### Two data layers (don't mix them)

Stadium has a deliberate split:

1. **API runtime = Supabase.** The live HTTP API reads and writes Supabase. Entry points:
   - `server/db.js` — builds the Supabase client from `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
   - `server/api/repositories/project.repository.js` — the single canonical access layer. Controllers and services go through it. All snake_case ↔ camelCase translation happens in its `transformProject` function.
   - SQL schema lives in `supabase/migrations/`.

2. **Offline tooling = MongoDB via Mongoose.** Not in the request path at all. Used by `server/scripts/*.js` for bulk imports, backfills, and reports against a local Mongo. Schema: `server/models/Project.js`, `server/models/MultisigTransaction.js`.

These don't talk to each other at runtime. If you catch yourself reaching across layers (Mongoose in `server/api/`, or Supabase in `server/scripts/`), stop and re-check which layer you should be in.

### Client → Server → Supabase data flow

```
React component
  └─ calls function in client/src/lib/api.ts
       └─ fetch() → VITE_API_BASE_URL (dev: http://localhost:2000/api)
            └─ Express route in server/api/routes/m2-program.routes.js
                 └─ middleware (logging, auth if admin)
                      └─ controller in server/api/controllers/project.controller.js
                           └─ service in server/api/services/*.js (business logic)
                                └─ repository in server/api/repositories/project.repository.js
                                     └─ Supabase client (server/db.js)
                                          └─ Postgres (Supabase)
```

The repository owns all `.from('projects').select(...)` style calls. A controller should never import the Supabase client directly.

### SIWS admin auth flow

**Client side** (`client/src/lib/siwsUtils.ts` + `AdminPage.tsx`):
1. User connects Polkadot-JS extension.
2. Client fetches a nonce from the server.
3. User signs a SIWS message (domain-bound, nonce-bound).
4. Client sends signed payload in the `x-siws-auth` header (see CORS config in `server/server.js`) to a protected endpoint.

**Server side** (`server/api/middleware/auth.middleware.js`):
1. Parses the SIWS message.
2. Verifies the signature against the claimed address (on-chain, or via sr25519/ed25519 verify).
3. Checks the address is in `ADMIN_WALLETS` (or is a team member for routes that use `requireTeamMemberOrAdmin`).
4. Attaches auth context to the request and calls `next()`, else returns 401/403.

Canonical test: `server/api/middleware/__tests__/verify-onchain.test.js`. Match its shape for new auth-related tests.

**Do not** write a parallel auth implementation. If you need a new admin-protected route, attach `requireAdmin` or `requireTeamMemberOrAdmin` and move on.

### Client routing

`client/src/App.tsx` uses `react-router-dom` v6. Dark mode is forced via `useEffect` in `App.tsx`. Do not add a theme toggle unless the plan explicitly requires it.

### Theming

`client/src/index.css` defines CSS custom properties for the shadcn theme. Only touch variables, not raw hex values. Never add `!important`.

---

## Testing

### Server (Vitest)

Config: `server/vitest.config.js`. Environment: `node`. Test pattern: `**/__tests__/**/*.test.{js,ts}` and `**/tests/**/*.test.{js,ts}`.

Run: `cd server && npm test`.

**Writing a new server test:**

```js
// server/api/<area>/__tests__/<name>.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('<name>', () => {
  it('<behavior>', async () => {
    // arrange, act, assert
  });
});
```

Use `vi.mock()` for external deps (the Supabase client, `polkadot-api`). Prefer testing pure functions and the repository layer directly. When testing middleware, construct `req`/`res`/`next` manually per the style in `verify-onchain.test.js`.

Unit tests should **not** require a real Supabase connection — mock at the repository or client level.

### Client

There is no test runner configured on the client. Do not add one in a passing pass; open an issue if the feature really needs it.

Client verification is `npm run build` (tsc + Vite) and `npm run lint`. Both must pass before PR.

---

## Deployment

### Server → Railway

- Entry: `server.js` via `npm start`.
- `railway.json`, `nixpacks.toml`, `Dockerfile` live at `server/`.
- Runtime env vars in Railway dashboard: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_WALLETS`, `EXPECTED_DOMAIN`, `NODE_ENV`, `NETWORK_ENV`, `AUTHORIZED_SIGNERS`, `CORS_ORIGIN`.
- `MONGO_URI` is **not** a production runtime requirement — it's only needed if someone is running `server/scripts/*.js` locally.
- Never commit real values. Update `server/.env.example` when adding a new required var.

### Client → Vercel

- `npm run build` output deployed by Vercel.
- Env vars: `VITE_API_BASE_URL`, `VITE_ADMIN_ADDRESSES` (comma-separated).
- Preview deployments from PRs work normally.
- **Preview env only**: `VITE_USE_MOCK_DATA=true` serves fixtures instead of the API. `VITE_USE_TEST_WALLET=true` activates the `//Alice` test-wallet harness so the `stadium-tester` Skill can exercise SIWS-gated flows. Alice's SS58-42 address (`5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY`) must also be in `VITE_ADMIN_ADDRESSES` on Preview for admin flows to pass the client gate. **Production must leave both flags unset** and must never include Alice's address in `VITE_ADMIN_ADDRESSES` or the server's `ADMIN_WALLETS` / `AUTHORIZED_SIGNERS` — the //Alice mnemonic is public.

Do **not** modify Railway/Vercel config from an issue unless the issue explicitly calls for it.

---

## Common pitfalls (learned the hard way)

1. **Writing Mongoose queries in `server/api/**`.** The API is Supabase. `server/models/Project.js` exists only for scripts. If you are tempted to import it from a controller or service, you're on the wrong layer.
2. **`BYPASS_ADMIN_CHECK = true`** shipped once in `AdminPage.tsx`. Full auth bypass. Always `false`.
3. **Duplicate toast hook** — a stray `use-toast.ts` alongside `use-toast.tsx` caused Vite to pick the wrong one. Only `.tsx` exists now; do not create `.ts`.
4. **Hardcoded hex colors with `!important`** in `index.css` broke dark mode. Use theme CSS variables.
5. **`console.log` in production client** — all stripped. Use the toast or error boundary instead.
6. **Controllers bypassing the repository** — any new query should land in `server/api/repositories/project.repository.js`, not inline in a controller.
7. **Client `npm test`** — there is no such script. Don't invent one and don't add it to CI expectations.
8. **Supabase service-role key in client** — never. The service-role key is server-only. The client talks to the server, not Supabase directly.

---

## External references

- Polkadot.js extension docs: https://polkadot.js.org/docs/extension/
- Talisman SIWS package: `@talismn/siws` (used both client and server)
- shadcn/ui: https://ui.shadcn.com/
- Supabase JS SDK: https://supabase.com/docs/reference/javascript/introduction

See also `docs/API_DOCS.md`, `docs/DATA_SCHEMA.md`, `docs/PRODUCTION_DEPLOYMENT.md`.
