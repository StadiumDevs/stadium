-- Run this in Supabase Dashboard → SQL Editor to bring your DB in line with develop.
-- Idempotent: safe to run multiple times (uses IF NOT EXISTS / IF EXISTS).

-- 1. Add live_url to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS live_url TEXT;

-- 2. Add columns to payments (if table exists)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS bounty_name TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_date TIMESTAMPTZ DEFAULT NOW();

-- 3. Allow BOUNTY in payments.milestone
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_milestone_check;
ALTER TABLE payments ADD CONSTRAINT payments_milestone_check
  CHECK (milestone IN ('M1', 'M2', 'BOUNTY'));
