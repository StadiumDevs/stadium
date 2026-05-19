-- Stadium #88 — single-use sign-in nonces (anti-replay).
--
-- Every x-siws-auth message carries a client-generated nonce. Recording each
-- nonce the first time it is presented and rejecting repeats makes a captured
-- auth header non-replayable. A row is only needed until the owning message
-- expires, so expires_at drives opportunistic cleanup.

CREATE TABLE IF NOT EXISTS auth_nonces (
  nonce       TEXT PRIMARY KEY,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_nonces_expires_at ON auth_nonces (expires_at);
