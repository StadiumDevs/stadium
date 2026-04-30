-- Stadium Phase 2 Revamp — wallet_contacts (issue #67, Phase 2 §4.1).
-- See docs/stadium-revamp-phase-2-spec.md §4.1.
--
-- One row per wallet that has ever interacted with notification preferences.
-- Email is nullable — a row may exist with notifications_enabled = false and no
-- email if the user explicitly opted out before entering one.
-- Email format is enforced at the API layer, not with a DB-level CHECK.

CREATE TABLE IF NOT EXISTS wallet_contacts (
  wallet_address        TEXT PRIMARY KEY,
  email                 TEXT,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_contacts_email ON wallet_contacts (email) WHERE email IS NOT NULL;
