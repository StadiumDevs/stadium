-- Stadium #26 — store each M2 project's planned grant entitlement.
--
-- The projects table held M2 metadata (status, mentor, features) but no
-- amounts, so the admin Winners table could only sum bounty_prizes and had no
-- schema-backed way to show the M1 + M2 program grant. Hardcoding the amount
-- in client code was rejected — these columns make the entitlement schema
-- truth instead.
--
-- The column DEFAULT (2500 / 2500 / USDC) backfills every existing row and
-- applies to new rows automatically. transformProject only surfaces the
-- entitlement for projects actually in the M2 program (m2_status set), so a
-- bounty-only project carrying the default values never displays them.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS m2_milestone_1_amount NUMERIC NOT NULL DEFAULT 2500;
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS m2_milestone_2_amount NUMERIC NOT NULL DEFAULT 2500;
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS m2_currency TEXT NOT NULL DEFAULT 'USDC';
