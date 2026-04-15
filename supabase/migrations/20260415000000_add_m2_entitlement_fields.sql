-- Add M2 entitlement fields to projects table
-- This stores the planned M2 program entitlement per project (M1 grant + M2 grant amounts)

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS m2_milestone_1_amount NUMERIC,
ADD COLUMN IF NOT EXISTS m2_milestone_2_amount NUMERIC,
ADD COLUMN IF NOT EXISTS m2_currency TEXT CHECK (m2_currency IN ('USDC', 'DOT')) DEFAULT 'USDC';

-- Add indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_projects_m2_entitlement ON projects(m2_milestone_1_amount, m2_milestone_2_amount);
