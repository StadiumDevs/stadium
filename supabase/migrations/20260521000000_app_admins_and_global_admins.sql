-- App-level admin tiers + signup-import staleness signal.
--
-- Three-tier model (separate from treasury multisig signers in
-- AUTHORIZED_SIGNERS env — which stays as a stricter concern):
--
--   Tier 0  app_admins      manage admins; bootstrap-seeded once
--   Tier 1  global_admins   manage all programs across all events
--   Tier 2  program_admins  manage one program (already exists, #95)
--
-- Both new tables use the same chain-tagged (wallet_chain, wallet) shape
-- as program_admins so lookups stay symmetric.
--
-- Additive and idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS app_admins (
  wallet_chain TEXT NOT NULL CHECK (wallet_chain IN ('substrate', 'ethereum', 'solana')),
  wallet       TEXT NOT NULL,
  label        TEXT,
  added_by     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (wallet_chain, wallet)
);

CREATE INDEX IF NOT EXISTS idx_app_admins_wallet
  ON app_admins(wallet_chain, wallet);

CREATE TABLE IF NOT EXISTS global_admins (
  wallet_chain TEXT NOT NULL CHECK (wallet_chain IN ('substrate', 'ethereum', 'solana')),
  wallet       TEXT NOT NULL,
  label        TEXT,
  added_by     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (wallet_chain, wallet)
);

CREATE INDEX IF NOT EXISTS idx_global_admins_wallet
  ON global_admins(wallet_chain, wallet);

-- Signup-import staleness: ProgramSignupsSection shows "last imported X
-- days ago" so admins know when Luma may have new entries. Existing rows
-- are backfilled to created_at since that's the closest signal we have.
ALTER TABLE program_signups
  ADD COLUMN IF NOT EXISTS imported_in_batch_at TIMESTAMPTZ;

UPDATE program_signups
   SET imported_in_batch_at = created_at
 WHERE imported_in_batch_at IS NULL;
