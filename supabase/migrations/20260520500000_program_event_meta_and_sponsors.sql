-- Program event metadata + sponsors.
-- Adds an `event_url` field to `programs` (Luma / registration link) and a new
-- `program_sponsors` table to track each program's sponsor goals: submission
-- target, target builder profiles, application instructions, and post-event
-- follow-up notes. A program has zero or many sponsors.
--
-- Additive and idempotent — safe to re-run.

ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS event_url TEXT;

CREATE TABLE IF NOT EXISTS program_sponsors (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id               TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL,
  submission_target        INTEGER,
  target_profiles          TEXT[] NOT NULL DEFAULT '{}',
  application_instructions TEXT,
  follow_up_notes          TEXT,
  apply_url                TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_program_sponsors_program_id
  ON program_sponsors(program_id);
