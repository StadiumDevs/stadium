-- Stadium Phase 1 Revamp — program_applications (issue #43, Block D).
-- See docs/stadium-revamp-phase-1-spec.md §4.2.
--
-- A project applies once to a given program; UNIQUE (program_id, project_id)
-- enforces this. Application metadata lives in a JSONB column so per-program-
-- type fields don't require a new table per type — the server-side validator
-- dispatches on programs.program_type.

CREATE TABLE IF NOT EXISTS program_applications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id         TEXT NOT NULL REFERENCES programs(id)  ON DELETE CASCADE,
  project_id         TEXT NOT NULL REFERENCES projects(id)  ON DELETE CASCADE,
  status             TEXT NOT NULL CHECK (status IN ('submitted', 'accepted', 'rejected', 'withdrawn')),
  application_fields JSONB NOT NULL DEFAULT '{}',
  submitted_by       TEXT NOT NULL,
  submitted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by        TEXT,
  reviewed_at        TIMESTAMPTZ,
  review_notes       TEXT,
  UNIQUE (program_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_program_applications_program ON program_applications(program_id);
CREATE INDEX IF NOT EXISTS idx_program_applications_project ON program_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_program_applications_status  ON program_applications(status);
