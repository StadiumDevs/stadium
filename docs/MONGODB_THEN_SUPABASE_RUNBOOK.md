# MongoDB → Supabase runbook

Use this to load all hackathon data (including Symbiosis 2025) into MongoDB, then push it to your **production** Supabase so the deployed app shows the latest projects.

---

## Prerequisites

- **MongoDB** running and reachable (local or Atlas).
- **Supabase** project created; migrations applied (`supabase db push`).
- Env vars (in `server/.env` or export in shell):
  - `MONGO_URI` – MongoDB connection string (e.g. `mongodb://localhost:27017/stadium` or Atlas URI).
  - `SUPABASE_URL` – Your Supabase project URL (same as production).
  - `SUPABASE_SERVICE_ROLE_KEY` – Service role key (same as production).

---

## Step 1: Load JSON into MongoDB

From the **server** directory:

```bash
cd server
export MONGO_URI="mongodb://localhost:27017/stadium"   # or your MongoDB URI
npm run db:migrate
# or: node scripts/migration.js
```

This:

- Reads `migration-data/symbiosis-2025.json`, `synergy-2025.json`, `symmetry-2024.json`.
- **Replaces all projects in MongoDB** (`Project.deleteMany` then insert).
- Maps `winner` → `bountyPrize` (e.g. "Polkadot main track" → bounty with that name).
- Applies M2 deliverables patch for OpenArkiv, Kleo, ObraClara, etc.

You should see: `✅ Migrated N projects in total.`

---

## Step 2: Copy MongoDB → Supabase

Still in **server**, with Supabase env set to the **production** project:

```bash
export SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-secret"
npm run db:mongo-to-supabase
# or: node scripts/migrate-mongo-to-supabase.js
```

This:

- Fetches **all** projects from MongoDB.
- Upserts each into Supabase (`projects`, `team_members`, `bounty_prizes`, `milestones`, `payments`).

You should see a summary: `✅ Successful: N`, `❌ Failed: 0` (or note any failures).

---

## Step 3 (optional): Show Symbiosis main-track winners on Program Overview

After step 2, Symbiosis projects are in Supabase but have `m2_status` = null and no payments, so they **don’t** appear on the M2 Program Overview page.

To make **main-track winners** from Symbiosis show under “Building”:

```bash
cd server
export SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..."
npm run db:symbiosis-m2-building
# or: node scripts/set-symbiosis-m2-building.js
```

That script sets `m2_status = 'building'` and `m2_agreed_date = now()` for projects that have a bounty prize whose name contains “main track” and `hackathon_id = 'symbiosis-2025'`.

---

## One-shot (all steps)

```bash
cd server

# Env (set for your environment)
export MONGO_URI="mongodb://localhost:27017/stadium"
export SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Full run: 1 → 2 → 3 (JSON → Mongo → Supabase → Symbiosis M2 building)
npm run db:mongo-then-supabase:full
```

Or run step-by-step:

```bash
npm run db:migrate              # 1. JSON → MongoDB
npm run db:mongo-to-supabase    # 2. MongoDB → Supabase
npm run db:symbiosis-m2-building # 3. Symbiosis main-track → M2 "building"
```

Steps 1+2 only (no Symbiosis M2 flag):

```bash
npm run db:mongo-then-supabase
```

---

## Verify

- **Supabase Dashboard** → Table Editor → **projects**: filter by `hackathon_id` = `symbiosis-2025`; you should see rows.
- **Deployed app** → Homepage: Symbiosis projects should appear (e.g. filter by hackathon “Symbiosis 2025” if the list is there).
- **Program Overview**: Symbiosis main-track winners appear only after step 3 (or after you set `m2_status` / payments in the admin UI).
