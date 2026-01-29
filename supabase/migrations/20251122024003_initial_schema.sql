-- ============================================
-- INITIAL SCHEMA FOR STADIUM APP
-- ============================================

-- Enable UUID extension (in Supabase, prefer "pgcrypto" on cloud, or use gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PROJECTS TABLE
-- ============================================
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  description TEXT NOT NULL,
  project_repo TEXT,
  demo_url TEXT,
  slides_url TEXT,
  tech_stack TEXT[],
  categories TEXT[],
  donation_address TEXT,
  project_state TEXT NOT NULL,
  bounties_processed BOOLEAN DEFAULT FALSE,
  
  -- Hackathon (embedded fields)
  hackathon_id TEXT NOT NULL,
  hackathon_name TEXT NOT NULL,
  hackathon_end_date TIMESTAMPTZ NOT NULL,
  hackathon_event_started_at TEXT,
  
  -- M2 Incubator fields
  m2_status TEXT CHECK (m2_status IN ('building', 'under_review', 'completed')),
  m2_mentor_name TEXT,
  m2_agreed_date TIMESTAMPTZ,
  m2_agreed_features TEXT[],
  m2_documentation TEXT[],
  m2_success_criteria TEXT,
  m2_last_updated_by TEXT CHECK (m2_last_updated_by IN ('team', 'admin')),
  m2_last_updated_date TIMESTAMPTZ,
  
  -- Final submission
  final_submission_repo_url TEXT,
  final_submission_demo_url TEXT,
  final_submission_docs_url TEXT,
  final_submission_summary TEXT,
  final_submission_submitted_date TIMESTAMPTZ,
  final_submission_submitted_by TEXT,
  
  -- Changes requested by admin
  changes_requested_feedback TEXT,
  changes_requested_by TEXT,
  changes_requested_date TIMESTAMPTZ,
  
  -- Completion tracking
  completion_date TIMESTAMPTZ,
  submitted_date TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraint for final submission
ALTER TABLE projects
ADD CONSTRAINT check_final_submission
CHECK (
  (m2_status IN ('under_review', 'completed') AND 
   final_submission_repo_url IS NOT NULL AND
   final_submission_demo_url IS NOT NULL AND
   final_submission_docs_url IS NOT NULL AND
   final_submission_summary IS NOT NULL)
  OR
  (m2_status NOT IN ('under_review', 'completed'))
);

-- ============================================
-- TEAM MEMBERS TABLE
-- ============================================
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  wallet_address TEXT,
  custom_url TEXT,
  role TEXT,
  twitter TEXT,
  github TEXT,
  linkedin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BOUNTY PRIZES TABLE
-- ============================================
CREATE TABLE bounty_prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  hackathon_won_at_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MILESTONES TABLE
-- ============================================
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone TEXT NOT NULL CHECK (milestone IN ('M1', 'M2')),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USDC', 'DOT')),
  transaction_proof TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MULTISIG TRANSACTIONS TABLE
-- ============================================
CREATE TABLE multisig_transactions (
  id TEXT PRIMARY KEY,
  call_data TEXT NOT NULL,
  call_hash TEXT NOT NULL,
  threshold INTEGER NOT NULL,
  signatories TEXT[] NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('transfer', 'payment', 'batch', 'other')),
  description TEXT NOT NULL,
  recipients TEXT[],
  amounts TEXT[],
  amounts_formatted TEXT[],
  total_amount TEXT,
  total_amount_formatted TEXT,
  batch_size INTEGER DEFAULT 1,
  network TEXT NOT NULL CHECK (network IN ('testnet', 'mainnet')),
  block_number INTEGER,
  extrinsic_index INTEGER,
  timepoint_height INTEGER,
  timepoint_index INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'executed', 'cancelled', 'expired')),
  execution_tx_hash TEXT,
  execution_block_hash TEXT,
  executed_at TIMESTAMPTZ,
  executed_by TEXT,
  initiated_by TEXT NOT NULL,
  notes TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MULTISIG APPROVALS TABLE
-- ============================================
CREATE TABLE multisig_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL REFERENCES multisig_transactions(id) ON DELETE CASCADE,
  signer_address TEXT NOT NULL,
  tx_hash TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action TEXT NOT NULL CHECK (action IN ('initiated', 'approved', 'executed'))
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_projects_m2_status ON projects(m2_status);
CREATE INDEX idx_projects_hackathon_id ON projects(hackathon_id);
CREATE INDEX idx_projects_project_state ON projects(project_state);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

CREATE INDEX idx_team_members_project_id ON team_members(project_id);
CREATE INDEX idx_team_members_wallet_address ON team_members(wallet_address);

CREATE INDEX idx_bounty_prizes_project_id ON bounty_prizes(project_id);
CREATE INDEX idx_milestones_project_id ON milestones(project_id);
CREATE INDEX idx_payments_project_id ON payments(project_id);

CREATE INDEX idx_multisig_transactions_status ON multisig_transactions(status, network);
CREATE INDEX idx_multisig_transactions_call_hash ON multisig_transactions(call_hash);
CREATE INDEX idx_multisig_transactions_created_at ON multisig_transactions(created_at DESC);

CREATE INDEX idx_multisig_approvals_transaction_id ON multisig_approvals(transaction_id);
CREATE INDEX idx_multisig_approvals_signer_address ON multisig_approvals(signer_address);

-- ============================================
-- FUNCTION: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to projects
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to multisig_transactions
CREATE TRIGGER update_multisig_transactions_updated_at
  BEFORE UPDATE ON multisig_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTION: Calculate M2 Week
-- ============================================
CREATE OR REPLACE FUNCTION calculate_m2_week(hackathon_end_date TIMESTAMPTZ)
RETURNS INTEGER AS $$
BEGIN
  RETURN FLOOR(EXTRACT(EPOCH FROM (NOW() - hackathon_end_date)) / (7 * 24 * 60 * 60)) + 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (DISABLED FOR NOW)
-- ============================================
-- Auth is handled in Express backend
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE bounty_prizes DISABLE ROW LEVEL SECURITY;
ALTER TABLE milestones DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE multisig_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE multisig_approvals DISABLE ROW LEVEL SECURITY;