-- ============================================
-- SEED DATA FOR DEVELOPMENT
-- ============================================

-- Insert test project
INSERT INTO projects (
  id,
  project_name,
  description,
  hackathon_id,
  hackathon_name,
  hackathon_end_date,
  project_state,
  bounties_processed
) VALUES (
  'test-project-abc123',
  'Test Project',
  'A test project for development',
  'synergy-2025',
  'Synergy 2025',
  NOW() - INTERVAL '2 weeks',
  'active',
  false
);

-- Insert test team member
INSERT INTO team_members (
  project_id,
  name,
  wallet_address,
  role
) VALUES (
  'test-project-abc123',
  'Test Developer',
  '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  'Developer'
);

-- Insert test bounty prize
INSERT INTO bounty_prizes (
  project_id,
  name,
  amount,
  hackathon_won_at_id
) VALUES (
  'test-project-abc123',
  'Best DeFi Project',
  5000,
  'synergy-2025'
);