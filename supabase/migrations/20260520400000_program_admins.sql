-- Per-event admin permissions (Phase 3, closes #95).
-- `program_admins` lets each program (event or continuation track) carry its
-- own admin allow-list — distinct from the global `ADMIN_WALLETS` env, which
-- stays as the superadmin escape hatch.
--
-- The stored `wallet` is the normalized form (substrate SS58, EVM lowercase,
-- Solana base58) so lookups are direct equality checks. `wallet_chain` keeps
-- the per-chain comparison honest — an address valid on chain X can't be
-- spoofed via chain Y.

CREATE TABLE IF NOT EXISTS program_admins (
  program_id   TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  wallet_chain TEXT NOT NULL CHECK (wallet_chain IN ('substrate', 'ethereum', 'solana')),
  wallet       TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (program_id, wallet_chain, wallet)
);

CREATE INDEX IF NOT EXISTS idx_program_admins_wallet
  ON program_admins(wallet_chain, wallet);
