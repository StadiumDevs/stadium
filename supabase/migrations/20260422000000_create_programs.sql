-- Stadium Phase 1 Revamp — introduce `programs` as a first-class entity.
-- See docs/stadium-revamp-phase-1-spec.md §4.1 (closes #36).
--
-- Additive: creates one new table. Existing M2 / hackathon state on `projects`
-- remains untouched.

CREATE TABLE IF NOT EXISTS programs (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  slug                  TEXT NOT NULL UNIQUE,
  program_type          TEXT NOT NULL CHECK (program_type IN ('dogfooding', 'pitch_off', 'hackathon', 'm2_incubator')),
  description           TEXT,
  status                TEXT NOT NULL CHECK (status IN ('draft', 'open', 'closed', 'completed')),
  owner                 TEXT NOT NULL DEFAULT 'webzero',
  applications_open_at  TIMESTAMPTZ,
  applications_close_at TIMESTAMPTZ,
  event_starts_at       TIMESTAMPTZ,
  event_ends_at         TIMESTAMPTZ,
  location              TEXT,
  max_applicants        INTEGER,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_programs_status ON programs(status);
CREATE INDEX IF NOT EXISTS idx_programs_type ON programs(program_type);
