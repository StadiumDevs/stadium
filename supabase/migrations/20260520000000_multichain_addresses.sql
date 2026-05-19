-- Stadium multi-chain sign-in (Phase D).
--
-- Adds a `chain` discriminator to every address-bearing table so team members
-- and payout addresses can be Substrate, Ethereum or Solana. Every existing
-- row is Substrate; the `DEFAULT 'substrate'` backfills them in place before
-- any new constraint is applied.

-- ── team_members ──────────────────────────────────────────────────────────
-- Which chain a member's wallet_address belongs to.
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS wallet_chain TEXT NOT NULL DEFAULT 'substrate';

ALTER TABLE team_members
  DROP CONSTRAINT IF EXISTS team_members_wallet_chain_check;
ALTER TABLE team_members
  ADD CONSTRAINT team_members_wallet_chain_check
  CHECK (wallet_chain IN ('substrate', 'ethereum', 'solana'));

-- Team-member lookups now filter on (chain, address) — see findByTeamWallet.
DROP INDEX IF EXISTS idx_team_members_wallet_address;
CREATE INDEX IF NOT EXISTS idx_team_members_chain_wallet
  ON team_members (wallet_chain, wallet_address);

-- ── projects ──────────────────────────────────────────────────────────────
-- Which chain the donation / payout address belongs to.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS donation_chain TEXT NOT NULL DEFAULT 'substrate';

ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_donation_chain_check;
ALTER TABLE projects
  ADD CONSTRAINT projects_donation_chain_check
  CHECK (donation_chain IN ('substrate', 'ethereum', 'solana'));

-- ── wallet_contacts ───────────────────────────────────────────────────────
-- A raw address is no longer globally unique (the same string could exist on
-- two chains), so the primary key becomes composite. The new column backfills
-- every existing row to 'substrate' BEFORE the primary key is recreated, so
-- there are no key collisions.
ALTER TABLE wallet_contacts
  ADD COLUMN IF NOT EXISTS wallet_chain TEXT NOT NULL DEFAULT 'substrate';

ALTER TABLE wallet_contacts
  DROP CONSTRAINT IF EXISTS wallet_contacts_wallet_chain_check;
ALTER TABLE wallet_contacts
  ADD CONSTRAINT wallet_contacts_wallet_chain_check
  CHECK (wallet_chain IN ('substrate', 'ethereum', 'solana'));

ALTER TABLE wallet_contacts DROP CONSTRAINT IF EXISTS wallet_contacts_pkey;
ALTER TABLE wallet_contacts ADD PRIMARY KEY (wallet_chain, wallet_address);
