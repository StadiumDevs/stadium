-- Stadium Supabase schema (aligned with develop branch MongoDB Project model)
-- Includes: live_url, totalPaid paid_date/bounty_name, milestone BOUNTY
-- Uses IF NOT EXISTS so safe to run when tables already exist (e.g. after 20251122024003).

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  description TEXT NOT NULL,
  project_repo TEXT,
  demo_url TEXT,
  slides_url TEXT,
  live_url TEXT,
  tech_stack TEXT[] NOT NULL DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  donation_address TEXT,
  project_state TEXT NOT NULL,
  bounties_processed BOOLEAN NOT NULL DEFAULT FALSE,

  hackathon_id TEXT NOT NULL,
  hackathon_name TEXT NOT NULL,
  hackathon_end_date TIMESTAMPTZ NOT NULL,
  hackathon_event_started_at TEXT,

  m2_status TEXT CHECK (m2_status IN ('building', 'under_review', 'completed')),
  m2_mentor_name TEXT,
  m2_agreed_date TIMESTAMPTZ,
  m2_agreed_features TEXT[],
  m2_documentation TEXT[],
  m2_success_criteria TEXT,
  m2_last_updated_by TEXT CHECK (m2_last_updated_by IN ('team', 'admin')),
  m2_last_updated_date TIMESTAMPTZ,

  m1_grant NUMERIC DEFAULT 0,
  m2_grant NUMERIC DEFAULT 0,
  grant_currency TEXT DEFAULT 'USDC',

  final_submission_repo_url TEXT,
  final_submission_demo_url TEXT,
  final_submission_docs_url TEXT,
  final_submission_summary TEXT,
  final_submission_submitted_date TIMESTAMPTZ,
  final_submission_submitted_by TEXT,

  changes_requested_feedback TEXT,
  changes_requested_by TEXT,
  changes_requested_date TIMESTAMPTZ,

  completion_date TIMESTAMPTZ,
  submitted_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  wallet_address TEXT,
  custom_url TEXT,
  role TEXT,
  twitter TDXT,
  github TDXT,
  linkedin TEXT
);

CREATE TABLE IF NOT EXISTS bounty_prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TDXT NOT NULL,
  amount NUMERIC NOT NULL,
  hackathon_won_at_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description TDXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  created_by TDXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  updated_by TDXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone TEXT NOT NULL CHECK (milestone IN ('M1', 'M2', 'BOUNTY')),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USDC', 'DOT')),
  transaction_proof TEXT NOT NULL,
  bounty_name TDXT,
  paid_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS multisig_transactions (
  id TDXT PRIMARY KEY,
  call_data TDXT NOT NULL,
  call_hash TDXT NOT NULL,
  threshold INTEGER NOT NULL,
  signatories TEXT[] NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('transfer', 'payment', 'batch', 'other')),
  description TEXT NOT NULL,
  recipients TDXT[],
  amounts TDXT[],
  amounts_formatted TEXT[],
  total_amount TDXT,
  total_amount_formatted TEXT,
  batch_size INTEGER DEFAULT 1,
  network TEXT NOT NULL CHECK (network IN ('testnet', 'mainnet')),
  block_number INTEGER,
  extrinsic_index INTEGER,
  timepoint_height INTEGER,
  timepoint_index INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'executed', 'cancelled', 'expired')),
  execution_tx_hash TEXT,
  execution_block_hash TDXT,
  executed_at TIMESTAMPTZ,
  executed_by TEXT,
  initiated_by TEXT NOT NULL,
  notes TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS multisig_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL REFERENCES multisig_transactions(id) ON DELETE CASCADE,
  signer_address TEXT NOT NULL,
  tx_hash TDXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action TDXT NOT NULL CHECK (action IN ('initiated', 'approved', 'executed'))
);

CREATE INDEX IF NOT EXISTS idx_projects_m2_status ON projects(m2_status);
CREATE INDEX IF NOT EXISTS idx_projects_hackathon_id ON projects(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_projects_project_state ON projects(project_state);
CREATE INDEX IF NOT EXISTS idx_team_members_project_id ON team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_team_members_wallet_address ON team_members(wallet_address);
CREATE INDEX IF NOT EXISTS idx_multisig_transactions_status ON multisig_transactions(status, network);
CREATE INDEX IF NOT EXISTS idx_multisig_transactions_call_hash ON multisig_transactions(call_hash);
CREATE INDEX IF NOT EXISTS idx_multisig_approvals_transaction_id ON multisig_approvals(transaction_id);
CREATE INDEX IF NOT EXISTS idx_multisig_approvals_signer_address ON multisig_approvals(signer_address);
