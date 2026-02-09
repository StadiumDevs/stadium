# Merge develop → main and Supabase migrations

Use this when preparing to update the app to Supabase after merging develop into main.

---

## 1. Merge develop into main

```bash
cd /path/to/stadium
git fetch origin
git checkout main
git pull origin main
git merge origin/develop -m "Merge develop into main: M2 deliverables, liveUrl, Plata Mia, formatting"
# Resolve any conflicts, then:
git push origin main
```

If you use a PR workflow instead:

1. Open a PR from `develop` into `main`.
2. Ensure CI passes and review.
3. Merge the PR (merge commit or squash as per your policy).

---

## 2. Migrations aligned with develop

The **Supabase** schema in this repo is aligned with the **current develop** MongoDB Project model.

### What’s in the migration

- **`supabase/migrations/20260208000000_initial_schema_from_develop.sql`**
  - **projects**: `live_url` (live/production site URL).
  - **payments**: `paid_date`, `bounty_name`, and `milestone` includes `'BOUNTY'`.
  - Same tables as before: projects, team_members, bounty_prizes, milestones, payments, multisig_transactions, multisig_approvals.

### After merging develop → main

1. **If you already have a Supabase project**
   - From repo root: `supabase db push` (or `supabase migration up`) so the new migration is applied.
   - If you had an older migration (e.g. without `live_url`), add a follow-up migration that adds `live_url` and the payment columns instead of re-running the full initial schema.

2. **If you are creating a new Supabase project**
   - Run `supabase link` then `supabase db push` so `20260208000000_initial_schema_from_develop.sql` is applied as the initial schema.

---

## 3. MongoDB scripts (develop) that stay on main

These stay in the repo and are for MongoDB (or for reference when migrating data to Supabase):

- `server/scripts/migration.js` – full migration + post-insert patch for OpenArkiv, Kleo, ObraClara (finalSubmission + liveUrl).
- `server/scripts/set-live-urls.js` – set `liveUrl` for specific projects.
- `server/scripts/set-m2-final-submissions.js` – set `finalSubmission` for OpenArkiv, Kleo, ObraClara.
- `server/scripts/update-plata-mia-team-and-plan.js` – Plata Mia team and M2 plan (agreedDate 2026-01-08).

When you move to Supabase, you’ll need to run equivalent data updates (or seed/migrate) in PostgreSQL.

---

## 4. How to trigger update on an existing Supabase instance

If you already have a Supabase project and database (e.g. created with an older schema), apply the new develop fields like this:

**1. Link your repo to the project (if not already linked)**

```bash
cd /path/to/stadium
supabase link --project-ref YOUR_PROJECT_REF
```

Use the ref from your Supabase URL: `https://YOUR_PROJECT_REF.supabase.co`.

**2. Push migrations (applies pending migrations only)**

```bash
supabase db push
```

- If your DB was created from an **older** migration (e.g. no `live_url`, no `paid_date`/`bounty_name` on payments), the migration **`20260208100000_add_live_url_and_payment_fields.sql`** will run and add:
  - `projects.live_url`
  - `payments.bounty_name`, `payments.paid_date`
  - `payments.milestone` check updated to allow `'BOUNTY'`
- If your DB was created from **`20260208000000_initial_schema_from_develop.sql`** (full schema), that migration is already applied; the add-fields migration will still run and is safe (it uses `ADD COLUMN IF NOT EXISTS` and may no-op or only adjust the constraint).

**3. Optional: run from Supabase Dashboard**

- In the Supabase Dashboard → **SQL Editor**, paste and run the contents of `supabase/migrations/20260208100000_add_live_url_and_payment_fields.sql` if you prefer not to use the CLI.

**4. Verify**

- In **Table Editor**, check that `projects` has a `live_url` column and `payments` has `bounty_name` and `paid_date`.

---

## 5. Checklist before Supabase cutover

- [ ] develop merged into main.
- [ ] Supabase migration applied (`supabase db push` or equivalent).
- [ ] `SUPABASE_MIGRATION_CONTEXT.md` and `SUPABASE_SETUP_STEPS.md` updated (live_url, payments fields).
- [ ] Server env has Supabase credentials; backend points at Supabase instead of MongoDB (when you implement the switch).
- [ ] Data migration from MongoDB to Supabase run (if needed), including M2 deliverables and liveUrl for OpenArkiv, Kleo, ObraClara, and Plata Mia team/plan.
