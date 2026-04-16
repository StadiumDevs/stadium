# Why Symbiosis M2 winners don’t show (and how to fix it)

> **Historical context** — this doc documents a production incident that was resolved. The one-shot scripts referenced below (`migrate-mongo-to-supabase.js`, `seed-symbiosis-to-supabase.js`, `set-symbiosis-m2-building.js`, etc.) were removed in the 2026-04-14 cleanup after they ran. The doc is kept for the recurrence playbook, not as runnable steps. If a similar incident happens, port the relevant logic back as needed.

## Why they might not show

### 1. Data not in production Supabase

The **deployed app reads only from Supabase**. Symbiosis data lives in:

- **`server/migration-data/symbiosis-2025.json`**

It only gets into production if it’s loaded into the **same** Supabase project your Railway app uses.

Current flow:

1. **`migration.js`** loads JSON (including `symbiosis-2025.json`) into **MongoDB**.
2. **`migrate-mongo-to-supabase.js`** copies **all** projects from MongoDB → **Supabase**.

So Symbiosis appears in production only if:

- You ran **`migration.js`** (so Symbiosis is in MongoDB), **and**
- You then ran **`migrate-mongo-to-supabase.js`** (so MongoDB → Supabase).

If Supabase was set up later, or you never ran the Mongo→Supabase step after adding Symbiosis, then **Symbiosis projects are not in production Supabase** and won’t show anywhere (homepage or Program Overview).

### 2. Program Overview filters (M2 page)

The **Program Overview** (M2) page only shows projects that:

- Are **main track winners** (bounty name contains “main track”), and  
- Have **`m2_status`** in `building` / `under_review` / `completed`, and  
- Either have **at least one payment** or status **`under_review`** / **`completed`**  
  (so “building” only counts if they have signed M2 agreement / `m2_agreed_date` and/or a payment).

So even if Symbiosis winners are in Supabase with “Polkadot main track” in `bounty_prizes`:

- If **`m2_status`** is `null` → they are **excluded** by the API.
- If they have **no payments** and status is **`building`** but **no `m2_agreed_date`** → they are **excluded** by the “building” filter.

So for Symbiosis to show on **Program Overview** they must be in Supabase **and** have the right `m2_status` (and agreement/payment if “building”).

---

## How to fix it

### Option A: Use MongoDB then Supabase (existing flow)

1. **Load Symbiosis into MongoDB**
   - In `server`, with `MONGO_URI` in `.env`:
   - `node scripts/migration.js`
   - This reads `symbiosis-2025.json` and inserts into MongoDB (and maps `winner` → `bountyPrize` with “main track” where applicable).

2. **Copy MongoDB → Supabase**
   - With `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set (and Supabase tables created, e.g. `supabase db push`):
   - `node scripts/migrate-mongo-to-supabase.js`
   - This pushes **all** projects from MongoDB into Supabase (production DB if that’s what the env points to).

3. **Make Symbiosis main-track winners show on Program Overview**
   - They need `m2_status` and, if “building”, agreement or payments. Options:
     - **Admin UI:** For each Symbiosis main-track winner, set M2 status (e.g. “Building”) and M2 agreement date (and payments when relevant).
     - **One-off script:** Update in Supabase all Symbiosis main-track winners to e.g. `m2_status = 'building'` and `m2_agreed_date = now()`, then run payments when ready.

After that, the **homepage** will show them (if they’re in Supabase and the homepage lists that hackathon). The **Program Overview** will show them once they meet the filters above.

### Option B: Seed Symbiosis directly into Supabase (no MongoDB)

Run the **Supabase-only** seed script (no MongoDB required):

1. **From the `server/` directory**, with Supabase env vars set (use the **same** Supabase project as production):
   ```bash
   cd server
   export SUPABASE_URL="https://xxxxx.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   node scripts/seed-symbiosis-to-supabase.js
   ```
   This reads `migration-data/symbiosis-2025.json`, upserts each project into `projects`, `team_members`, and `bounty_prizes`.

2. **To make main-track winners show on Program Overview**, run with:
   ```bash
   SET_M2_BUILDING=true node scripts/seed-symbiosis-to-supabase.js
   ```
   That sets `m2_status = 'building'` and `m2_agreed_date` for projects whose `winner` contains “main track”, so they pass the M2 filters.

---

## Quick fix: Symbiosis projects missing bounty_prizes

If Symbiosis projects are in Supabase but have **empty `bountyPrize: []`**, they won’t show when `winnersOnly=true` or `mainTrackOnly=true`. This happens if `migrate-mongo-to-supabase.js` ran before `migration.js` loaded Symbiosis into MongoDB.

**Fix:**

```bash
cd server
export SUPABASE_URL="https://hxojfhlrtffcvksxkvwf.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
npm run db:fix-symbiosis
```

This script:
- Reads `symbiosis-2025.json`
- Matches projects by name (case-insensitive)
- Adds missing `bounty_prizes` from the JSON `winner` field
- Optionally sets `m2_status='building'` for main-track winners (use `SET_M2_BUILDING=true`)

**To also set main-track winners to M2 "building":**

```bash
SET_M2_BUILDING=true npm run db:fix-symbiosis
```

---

## Quick checks

- **Homepage**
  - If Symbiosis projects are in Supabase, they can show on the homepage (no M2 filter there). If they don’t show, they’re likely not in the DB.
- **Program Overview**
  - Only shows main-track winners with `m2_status` in `building`/`under_review`/`completed` and (for “building”) agreement or payments. So Symbiosis must be in Supabase **and** have those fields set to appear there.

---

## Summary

| Issue | Cause | Fix |
|-------|--------|-----|
| Symbiosis not on site at all | Not in production Supabase | Run migration into MongoDB then `migrate-mongo-to-supabase.js`, or run a Supabase-only seed script for Symbiosis. |
| Symbiosis on homepage but not Program Overview | `m2_status` null or no agreement/payments | Set `m2_status` (e.g. `building`) and `m2_agreed_date` (and payments when relevant) for main-track winners. |
| Only “latest” Symbiosis M2 | Sort/filter by date or hackathon | Ensure API/sorts and filters include Symbiosis (e.g. by `hackathon_id` / `completion_date`); no extra code change if data is correct. |
