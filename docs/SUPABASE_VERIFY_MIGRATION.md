# Verify Supabase DB after migration

After running `supabase db push`, use any of these to confirm the DB is updated.

---

## 1. Supabase Dashboard (Table Editor)

1. Open your project: **https://supabase.com/dashboard** → your project.
2. Go to **Table Editor**.
3. **projects**
   - Open the `projects` table.
   - Confirm there is a **`live_url`** column (can be empty).
4. **payments**
   - Open the `payments` table.
   - Confirm **`bounty_name`** and **`paid_date`** exist.
   - Optionally add a row with `milestone = 'BOUNTY'` and save; it should succeed (constraint allows BOUNTY).

---

## 2. SQL Editor (column check)

1. In the Dashboard go to **SQL Editor**.
2. Run:

```sql
-- List projects columns (should include live_url)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'projects'
ORDER BY ordinal_position;

-- List payments columns (should include bounty_name, paid_date)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'payments'
ORDER BY ordinal_position;
```

3. In the results for **projects** you should see **`live_url`** (data_type `text`).
4. In the results for **payments** you should see **`bounty_name`** (text) and **`paid_date`** (timestamp with time zone).

---

## 3. Migration history

In the Dashboard: **Database** → **Migrations**. You should see something like:

- `20251122024003_initial_schema` (or similar)
- `20260208000000_initial_schema_from_develop`
- `20260208100000_add_live_url_and_payment_fields`

All with status applied (green).

Or in the CLI:

```bash
supabase migration list
```

Remote applied versions should include the above.

---

## 4. Quick constraint check (BOUNTY)

In **SQL Editor** run:

```sql
-- Should return the check constraint including BOUNTY
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.payments'::regclass
  AND conname = 'payments_milestone_check';
```

`definition` should show: `CHECK ((milestone = ANY (ARRAY['M1'::text, 'M2'::text, 'BOUNTY'::text])))` (or equivalent).

---

**Summary:** If `projects` has `live_url`, `payments` has `bounty_name` and `paid_date`, and the payments milestone check allows `BOUNTY`, the DB is correctly updated.
