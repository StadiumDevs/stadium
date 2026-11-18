# Stadium — Launch Checklist

Everything that must happen to take the current `develop` to real production
use. Work top to bottom — the ordering matters (migrations before deploys).

> Companion docs: `docs/PRODUCTION_DEPLOYMENT.md` (how to apply migrations),
> `docs/payouts.md` (payout model), `docs/post-merge-verification.md` (UI
> regression batches for the Phase 1/2 surfaces).

---

## What is already on `develop`

Merged and ready to ship — multi-chain sign-in and the launch-readiness fixes:

| PR | What | Migration it needs |
|----|------|--------------------|
| #84 | Multi-chain sign-in (Substrate + Ethereum + Solana) | `20260520000000_multichain_addresses.sql` |
| #86 | `requireTeamMemberOrAdmin` SIWS domain check | — |
| #87 | M2 program entitlement schema (#26) | `20260520100000_m2_entitlement.sql` |
| #89 | Single-use nonces + message expiry (#88) | `20260520200000_auth_nonces.sql` |
| #90 | Payout-process docs (#12) | — |

---

## Step 1 — Apply the Supabase migrations  ⚠️ before deploying server code

Three new additive migrations under `supabase/migrations/`. Apply **all three**,
in filename order, per `docs/PRODUCTION_DEPLOYMENT.md`, **before** the server
code that reads them is deployed — otherwise auth and project reads error.

1. `20260520000000_multichain_addresses.sql` — `wallet_chain` / `donation_chain`
   columns; composite PK on `wallet_contacts`. **Highest-risk DDL** (the PK
   swap) — apply on a Supabase branch first and confirm existing rows
   backfilled to `'substrate'`.
2. `20260520100000_m2_entitlement.sql` — `m2_milestone_1/2_amount`, `m2_currency`
   on `projects` (defaults $2,500 / $2,500 / USDC).
3. `20260520200000_auth_nonces.sql` — `auth_nonces` table. **Must exist before
   the #89 server code runs**, or every sign-in 500s on the nonce insert.

- [ ] All three applied to the production Supabase, in order.
- [ ] `wallet_contacts` composite PK verified; existing rows intact.

## Step 2 — Environment configuration

### Server (Railway)
- [ ] `EXPECTED_DOMAIN` = the **production hostname**. ⚠️ #86 makes
      `requireTeamMemberOrAdmin` enforce the domain check — a wrong value breaks
      *all* team-member actions.
- [ ] `DISABLE_SIWS_DOMAIN_CHECK` — unset or `false` in production.
- [ ] `NODE_ENV=production` — restricts CORS to the production origins (no localhost dev origins) and keeps error details out of API responses.
- [ ] `AUTHORIZED_SIGNERS` — admin signers. Chain-tagged entries supported
      (`ethereum:0x…`, `solana:…`); bare entries are treated as Substrate.
- [ ] `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_WALLETS`,
      `NETWORK_ENV`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` set.

### Client (Vercel — Production scope)
- [ ] `VITE_ADMIN_ADDRESSES` — admin addresses; chain-tagged entries supported.
- [ ] `VITE_API_BASE_URL` — the production API URL.
- [ ] `VITE_USE_MOCK_DATA` — **unset or `false`** in Production (it is `true`
      only on Preview).
- [ ] `VITE_USE_TEST_WALLET` — **unset or `false`** in Production.

## Step 3 — Promote and deploy

- [ ] Promote `develop` → production branch per your pipeline (server → Railway,
      client → Vercel). Migrations (Step 1) must already be applied.
- [ ] Confirm the client build is **not** in mock mode and points at the real API.
- [ ] `BYPASS_ADMIN_CHECK` in `AdminPage.tsx` is `false` (repo invariant).

## Step 4 — Interactive verification (real wallets, production)

Cannot be automated — needs real wallet extensions. Verify on the deployed site:

- [ ] **Substrate** admin sign-in (Polkadot-JS) → admin panel loads.
- [ ] **Ethereum** admin sign-in (MetaMask) → admin panel loads.
- [ ] **Solana** admin sign-in (Phantom) → admin panel loads.
- [ ] Team-member sign-in (any chain) → team controls appear on a project.
- [ ] Save a multi-chain payout address on the Team & Payments tab.
- [ ] Replay/expiry: a normal sign-in works; a stale/replayed header is rejected.
- [ ] Winners table "Amount" column shows bounty + M2 grant for M2 projects.
- [ ] Domain check: team-member actions succeed on the real domain (confirms
      `EXPECTED_DOMAIN` is correct).

## Step 5 — Alpha-readiness gate (issue #48)

An operational gate, owned by the team — not code:

- [ ] Pre-conditions #27 (Plata Mia bounty split) and #28 (CSV reconciliation)
      resolved.
- [ ] `server/scripts/seed-alpha-dogfooding-2026.js` written with **final copy**
      and real dates (event 13–19 Jun 2026, Berlin); `status='open'` only after
      copy is final.
- [ ] 3–5 alpha projects confirmed; each project page inspected for polish.
- [ ] Copy pass on the Updates / Funding Signal / Apply surfaces.
- [ ] End-to-end rehearsal completed; `docs/alpha-rehearsal-notes.md` written.

---

## Known limitations at launch — by design

- **Payouts are manual.** The app records payments; an admin sends funds
  out-of-band. See `docs/payouts.md`. Automated execution is tracked in #85.
- **Admins authenticate on any chain, but the treasury multisig is Polkadot** —
  co-signing treasury transactions still needs a Substrate signer.
- **Stale browser tabs** loaded before the #89 deploy must be refreshed (a
  `expirationTime` is now required on sign-in messages).
- **Replay hardening is seen-nonce + expiry**, not a server-issued challenge —
  a stronger challenge/response is a documented follow-up.

## Post-launch backlog (not blockers)

- #85 — automated multi-chain payout execution.
- #88 follow-up — server-issued sign-in challenge (vs. seen-nonce tracking).
- #17 — M2 follow-up automations (unscoped brainstorm — needs triage).
- #15 — post-hackathon follow-up process notes (product planning input).
