-- For existing Supabase instances: add develop fields (live_url, payment paid_date/bounty_name, BOUNTY milestone)
-- Safe to run if columns/constraint already exist (use IF NOT EXISTS / DO blocks where needed)

-- Add live_url to projects (ignore if already exists)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS live_url TEXT;

-- Add paid_date and bounty_name to payments (ignore if already exist)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS bounty_name TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_date TIMESTAMPTZ DEFAULT NOW();

-- Allow BOUNTY in payments.milestone (drop old constraint, add new one)
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_milestone_check;
ALTER TABLE payments ADD CONSTRAINT payments_milestone_check
  CHECK (milestone IN ('M1', 'M2', 'BOUNTY'));
