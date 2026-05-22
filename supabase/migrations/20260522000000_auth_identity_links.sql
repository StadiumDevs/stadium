-- Social sign-in (Google / Apple / passkey via Supabase Auth) is added
-- alongside wallet (SIWS) auth. Authorization stays wallet-based: a Supabase
-- Auth user is LINKED to a wallet, and social sign-in then resolves to that
-- wallet so the existing admin/team authorization works unchanged.
--
-- One link per Supabase user (PK). The wallet is looked up by (chain, address)
-- when resolving a social session to its wallet principal.

CREATE TABLE IF NOT EXISTS auth_identity_links (
  supabase_user_id  UUID PRIMARY KEY,
  email             TEXT,
  wallet_chain      TEXT NOT NULL DEFAULT 'substrate',
  wallet            TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_identity_links_wallet
  ON auth_identity_links(wallet_chain, wallet);
