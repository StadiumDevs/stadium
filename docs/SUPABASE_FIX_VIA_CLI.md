# Fix existing Supabase project via CLI

Use these steps to get your existing linked project updated with the latest schema using only the Supabase CLI.

---

## 1. Link the project (if not already)

From the repo root:

```bash
cd /path/to/stadium
supabase link --project-ref YOUR_PROJECT_REF
```

Use the ref from your Supabase URL: `https://YOUR_PROJECT_REF.supabase.co`. Enter your DB password when prompted.

---

## 2. See what’s applied vs pending

```bash
supabase migration list
```

You’ll see something like:

- **Local**: list of migration versions in `supabase/migrations/`
- **Remote**: which of those are applied on the linked DB

What we want:

- Remote shows **20251122024003** as applied (your original schema).
- Local has **20251122024003**, **20260208000000**, **20260208100000**.
- Remote does **not** show 20260208000000 or 20260208100000 as applied (so they will run on push).

---

## 3. If you see “Remote migration versions not found in local”

That means the remote has a version (e.g. **20251122024003**) that isn’t in your local `supabase/migrations/` folder. Fix it by having that version locally:

- There should already be a file: **`supabase/migrations/20251122024003_initial_schema.sql`** (placeholder). If it’s missing, create it with at least:

  ```sql
  SELECT 1;
  ```

- Then run again:

  ```bash
  supabase migration list
  ```

  The “not found in local” error should be gone.

---

## 4. Push pending migrations

```bash
supabase db push
```

This applies every **local** migration that is **not** yet applied on the remote (in order). So it will run:

1. **20260208000000** – creates tables/indexes with `IF NOT EXISTS` (no-op if they already exist).
2. **20260208100000** – adds `projects.live_url`, `payments.bounty_name`, `payments.paid_date`, and updates the `payments.milestone` check to include `BOUNTY`.

If both run without errors, the DB is updated.

---

## 5. If `db push` fails

### 5a. “relation already exists” or “table already exists”

The first migration (20260208000000) is trying to create something that already exists. That migration uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`, so this usually means the remote was created from a different schema. Options:

- **Option A:** Mark that migration as applied without running it (so only the add-fields migration runs next):

  ```bash
  supabase migration repair --status applied 20260208000000
  ```

  Then run:

  ```bash
  supabase db push
  ```

  Only **20260208100000** will run (add columns + constraint).

- **Option B:** Fix the DB manually with SQL and then mark both as applied (so CLI and DB agree):

  1. In Supabase Dashboard → **SQL Editor**, run the contents of **`supabase/manual_fix_schema.sql`**.
  2. Then:

     ```bash
     supabase migration repair --status applied 20260208000000
     supabase migration repair --status applied 20260208100000
     ```

  After that, `supabase migration list` will show both as applied and future `db push` will be in sync.

### 5b. “constraint … does not exist” (on `payments`)

The add-fields migration drops `payments_milestone_check`. If your DB uses a different constraint name (e.g. `payments_milestone_check1`), the DROP fails. Fix:

1. In **SQL Editor** run:

   ```sql
   -- See the actual name
   SELECT conname FROM pg_constraint
   WHERE conrelid = 'public.payments'::regclass AND contype = 'c';
   ```

2. Either:
   - Edit **`supabase/migrations/20260208100000_add_live_url_and_payment_fields.sql`** and replace `payments_milestone_check` with the name you found, then run `supabase db push` again, or
   - Run **`supabase/manual_fix_schema.sql`** in the SQL Editor (it uses `DROP CONSTRAINT IF EXISTS`), then mark the migration as applied:

     ```bash
     supabase migration repair --status applied 20260208100000
     ```

### 5c. “column already exists”

The add-fields migration uses `ADD COLUMN IF NOT EXISTS`, so this is rare. If it happens, the column is already there; you can mark the migration as applied so the CLI is in sync:

```bash
supabase migration repair --status applied 20260208100000
```

---

## 6. Confirm the DB is updated

```bash
supabase migration list
```

Remote should show **20251122024003**, **20260208000000**, and **20260208100000** as applied.

Then in Supabase Dashboard → **Table Editor**:

- **projects** has a **live_url** column.
- **payments** has **bounty_name** and **paid_date**.

---

## Quick reference

| Step | Command |
|------|--------|
| Link | `supabase link --project-ref YOUR_PROJECT_REF` |
| List | `supabase migration list` |
| Push | `supabase db push` |
| Mark applied (no run) | `supabase migration repair --status applied <version>` |
| Mark reverted | `supabase migration repair --status reverted <version>` |

Version is the numeric prefix only, e.g. `20260208100000`.
