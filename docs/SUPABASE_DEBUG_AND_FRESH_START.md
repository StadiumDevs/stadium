# Supabase: fix existing DB or start from scratch

Use **Option A** to fix your current project, or **Option B** to use a new project with the latest schema.

---

## Option A: Fix existing Supabase project (no CLI)

Use this when `supabase db push` didn’t apply changes or migration history is messy.

### Steps

1. Open **Supabase Dashboard** → your project → **SQL Editor**.
2. Open in your repo: **`supabase/manual_fix_schema.sql`**.
3. Copy its full contents and paste into the SQL Editor.
4. Click **Run**.
5. Confirm:
   - **Table Editor** → `projects` has a **`live_url`** column.
   - **Table Editor** → `payments` has **`bounty_name`** and **`paid_date`**.

The script is idempotent (safe to run more than once). It does not touch migration history; your DB schema will match develop.

### If you still get errors

- **“column already exists”** – You can ignore it or remove that line from the script and run the rest.
- **“relation "projects" does not exist”** – Your project has no tables yet; use **Option B** (fresh project) and run `fresh_project_schema.sql` instead.

---

## Option B: New Supabase project from scratch (easiest)

Use this when you prefer a clean state and don’t need to keep existing data.

### 1. Create a new project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard).
2. **New project** → choose org, name (e.g. `stadium`), password, region → **Create**.
3. Wait until the project is ready.

### 2. Apply the latest schema (one script)

1. In the new project, open **SQL Editor**.
2. Open in your repo: **`supabase/fresh_project_schema.sql`**.
3. Copy its full contents and paste into the SQL Editor.
4. Click **Run**.
5. In **Table Editor** you should see: `projects`, `team_members`, `bounty_prizes`, `milestones`, `payments`, `multisig_transactions`, `multisig_approvals`, with `projects.live_url` and `payments.bounty_name`, `payments.paid_date` included.

### 3. Point your app at the new project

1. **Project Settings** → **API**: copy **Project URL**, **anon** key, **service_role** key.
2. In `server/.env` set:
   - `SUPABASE_URL=<Project URL>`
   - `SUPABASE_ANON_KEY=<anon key>`
   - `SUPABASE_SERVICE_ROLE_KEY=<service_role key>`
3. If you use the Supabase CLI with this repo, link the new project:
   ```bash
   supabase link --project-ref NEW_PROJECT_REF
   ```
   (Use the ref from the URL: `https://NEW_PROJECT_REF.supabase.co`.)

### 4. Optional: sync CLI migration history

If you want `supabase migration list` to match what’s applied in the new DB (so future `db push` works), you can mark the migrations as applied so the CLI and DB agree. Otherwise you can keep using the SQL script for schema and ignore migration history for this project.

---

## Summary

| Goal                         | What to do |
|-----------------------------|------------|
| Fix current DB, keep data   | Run **`supabase/manual_fix_schema.sql`** in SQL Editor (Option A). |
| Clean DB, latest schema    | New project → run **`supabase/fresh_project_schema.sql`** in SQL Editor (Option B). |

Both scripts match the schema from the latest commit (develop); no CLI or migration history required.
