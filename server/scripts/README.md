# server/scripts

Offline tooling. Every script that touches data talks to the **Supabase project named in `server/.env`** (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`), which may be production. Check `server/.env` before running anything here, and prefer `--dry-run` where a script offers it.

There is no local database and no seed for one: for UI work use client mock mode (`cd client && npm run dev:harness`); for server work point `server/.env` at a Supabase dev project with `supabase/migrations/` applied.

| Script | npm script | What it does |
|---|---|---|
| `bootstrap-app-admin.js` | `bootstrap:app-admin` | One-time: insert the first app admin and copy `AUTHORIZED_SIGNERS` into `global_admins`. |
| `seed-dogfooding-program.js` | `seed:dogfooding` | Idempotent: insert the Dogfooding 2026 Denver program row. |
| `reconcile-bounty-amounts-supabase.js` | — | Reconcile `bounty_prizes` rows against a source CSV. |
| `fix-plata-mia-bounties.js` | — | One-off data fix for issue #27 (already applied). |
| `convert-project-feedback.js` | — | Convert the project-feedback markdown fixture to JSON (no database). |
| `convert-privacy-review.js` | — | Convert the privacy-track review markdown fixture to JSON (no database). |
| `generate-multisig.js` | `generate:multisig` | Derive a multisig address from signatories (no database). |
| `generate-test-account.js` | `generate:test-account` | Generate a test keypair (no database). |
| `verify-email.js` | `verify:email` | Send a test email through Resend. |
| `verify-production.js` | `verify:production` | Read-only health check of Vercel, Railway and Supabase. |
| `verify-main-deployed.js` | `verify:main-deployed` | Read-only check that production matches `main`. |

The Mongo-backed scripts (`seed-dev`, `migration`, `fix-bounty-amounts`, `list-winners-zero-paid`, `set-live-urls`, `set-m2-final-submissions`, `seed-m2-test-project`) and `server/models/` were removed in #309; the API has used Supabase since January 2026.
