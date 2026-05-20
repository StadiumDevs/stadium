-- Program signups (Luma / external CSV imports).
-- Captures the raw "who registered for the event" list from Luma exports so
-- admins can track headcount and follow-ups independently of project-level
-- program_applications. A signup is a person; an application is a project.
--
-- raw_row preserves any columns the Luma CSV had that we don't model
-- explicitly (custom Q&A, ticket type, etc.) so we never lose data.
--
-- Additive and idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS program_signups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id      TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  name            TEXT,
  wallet          TEXT,
  registered_at   TIMESTAMPTZ,
  source          TEXT NOT NULL DEFAULT 'luma',
  raw_row         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT program_signups_email_per_program UNIQUE (program_id, email)
);

CREATE INDEX IF NOT EXISTS idx_program_signups_program_id
  ON program_signups(program_id);
