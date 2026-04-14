# Stadium Agent Guide

Companion to `CLAUDE.md`. Deeper reference material for agents implementing non-trivial features. Read `CLAUDE.md` first — this doc assumes you've absorbed it.

---

## Architecture

### Client → Server data flow

```
React component
  └─ calls function in client/src/lib/api.ts
       └─ fetch() → VITE_API_BASE_URL (dev: http://localhost:2000/api)
            └─ Express route in server/api/routes/*.routes.js
                 └─ middleware (logging, auth if admin)
                      └─ controller in server/api/controllers/*.controller.js
                           └─ service in server/api/services/ (business logic)
                                └─ repository in server/api/repositories/ (queries)
                                     └─ Mongoose model in server/models/*.js
                                          └─ MongoDB
```

Every layer is optional except the route and controller — for simple reads it is normal to go straight `controller → model`. For anything with business rules, route through a service.

### SIWS admin auth flow

**Client side** (`client/src/lib/siwsUtils.ts` + `AdminPage.tsx`):
1. User connects Polkadot-JS extension.
2. Client fetches a nonce from the server.
3. User signs a SIWS message (domain-bound, nonce-bound).
4. Client sends signed message to protected endpoint in the `Authorization` header (or body — check the route).

**Server side** (`server/api/middleware/auth.middleware.js`):
1. Parses the SIWS message.
2. Verifies the signature against the claimed address (on-chain, or via sr25519/ed25519 verify).
3. Checks the address is in `ADMIN_WALLETS`.
4. Attaches `req.admin = { address }` and calls `next()`, else returns 401/403.

Canonical test: `server/api/middleware/__tests__/verify-onchain.test.js`. Match its shape for new auth-related tests.

**Do not** write a parallel auth implementation. If you need a new admin-protected route, attach `auth.middleware.js` and move on.

### Client routing

`client/src/App.tsx` uses `react-router-dom` v6. Routes currently:
- `/` → HomePage
- `/admin` → AdminPage
- `/m2` → M2ProgramPage
- `/projects/:slug` → ProjectDetailsPage
- `/winners` → WinnersPage
- `*` → NotFound

Dark mode is forced via `useEffect` in `App.tsx`. Do not add a theme toggle unless the plan explicitly requires it.

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
// import the thing under test (ESM, so use import not require)

describe('<name>', () => {
  it('<behavior>', async () => {
    // arrange, act, assert
  });
});
```

Use `vi.mock()` for external deps (polkadot-api, mongoose if you don't want a real DB). Prefer testing pure functions over middleware chains; when testing middleware, construct `req`/`res`/`next` manually per the style in `verify-onchain.test.js`.

Do **not** require a live MongoDB for unit tests — mock at the repository or Mongoose level. Integration tests that hit Mongo belong in `server/tests/` and should be clearly named.

### Client

There is no test runner configured on the client. Do not add one in a passing pass; open an issue if the feature really needs it.

Client verification is `npm run build` (tsc + Vite) and `npm run lint`. Both must pass before PR.

---

## Deployment

### Server → Railway

- Entry: `server.js` via `npm start`.
- `railway.json`, `nixpacks.toml`, `Dockerfile` live at `server/`.
- Env vars managed in Railway dashboard: `MONGO_URI`, `ADMIN_WALLETS`, `EXPECTED_DOMAIN`, `NODE_ENV`, `NETWORK_ENV`, `AUTHORIZED_SIGNERS`.
- Never commit real values. Update `server/.env.example` when adding a new required var.

### Client → Vercel

- `npm run build` output deployed by Vercel.
- Env vars: `VITE_API_BASE_URL`, `VITE_ADMIN_ADDRESSES` (comma-separated).
- Preview deployments from PRs work normally.

Do **not** modify Railway/Vercel config from an issue unless the issue explicitly calls for it.

---

## Common pitfalls (learned the hard way)

1. **`BYPASS_ADMIN_CHECK = true`** shipped once in `AdminPage.tsx`. Full auth bypass. Always `false`.
2. **Duplicate toast hook** — a stray `use-toast.ts` alongside `use-toast.tsx` caused Vite to pick the wrong one. Only `.tsx` exists now; do not create `.ts`.
3. **Hardcoded hex colors with `!important`** in `index.css` broke dark mode. Use theme CSS variables.
4. **Unused font imports** (Kumbh Sans, Sofia Sans Condensed, Press Start 2P) bloated bundle. Removed; don't reintroduce.
5. **`console.log` in production client** — all stripped. Use the toast or error boundary instead.
6. **Mixing Supabase and Mongo** — legacy Supabase files exist but are frozen. New code is MongoDB-only.
7. **Client `npm test`** — there is no such script. Don't invent one and don't add it to CI expectations.

---

## External references

- Polkadot.js extension docs: https://polkadot.js.org/docs/extension/
- Talisman SIWS package: `@talismn/siws` (used both client and server)
- shadcn/ui: https://ui.shadcn.com/

See also `docs/API_DOCS.md`, `docs/DATA_SCHEMA.md`, `docs/MIGRATION_TO_MONGODB.md` for history.
