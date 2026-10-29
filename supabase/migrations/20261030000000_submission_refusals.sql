-- Refused project submissions are kept, with why. Today a refused submit
-- (not on the Luma checked-in list, invalid fields, or the check-in couldn't
-- be verified) answers 403 / 400 / 503 and stores nothing; now the attempt and
-- the exact reason are recorded, and a master (global) admin can accept a
-- refused project, which creates the entry with the attempt's original time.
-- Additive only.

CREATE TABLE IF NOT EXISTS submission_refusals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  luma_email TEXT NOT NULL,
  submitter_name TEXT,
  project_title TEXT,
  -- The attempted submission: known fields only, strings capped (never the raw body).
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason_code TEXT NOT NULL CHECK (reason_code IN ('not_checked_in', 'invalid', 'unverified')),
  -- The exact message the builder was shown.
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'refused' CHECK (status IN ('refused', 'accepted', 'dismissed')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  accepted_submission_id TEXT REFERENCES program_submissions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS submission_refusals_program_status_idx
  ON submission_refusals (program_id, status, created_at DESC);

ALTER TABLE submission_refusals ENABLE ROW LEVEL SECURITY;

-- An entry a master admin let in from a refusal points back at it.
ALTER TABLE program_submissions ADD COLUMN IF NOT EXISTS accepted_from_refusal_id UUID;
