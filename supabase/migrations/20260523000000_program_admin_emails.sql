-- Email-keyed program admins (social sign-in onboarding).
-- A program admin can be granted by EMAIL instead of wallet address: an
-- existing admin invites someone by email, that person signs in via Supabase
-- Auth (email magic link), and if their verified email is listed here for the
-- program they get view access. View-only — wallet-keyed `program_admins` keep
-- their existing mutation powers; this table only grants the read surface.
--
-- `email` is always stored lowercased + trimmed by the repository, so the
-- (program_id, email) primary key is effectively case-insensitive.
--
-- Additive and idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS program_admin_emails (
  program_id  TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  invited_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (program_id, email)
);

CREATE INDEX IF NOT EXISTS idx_program_admin_emails_email
  ON program_admin_emails(email);
