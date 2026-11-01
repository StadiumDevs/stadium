-- Tracked programs (Free Society Hack): server-side drafts, teammate editors,
-- a required feedback step before finalizing, and a last-edit stamp judges see.
--
-- status: 'draft' entries are visible only to their team; 'submitted' entries
--   are in the judges' queues. Existing rows (and every legacy program) are
--   'submitted', so nothing changes for them.
-- finalized_at: the first "Finalize and submit"; the judging batch uses it.
-- feedback_submitted_at: when the team submitted the event feedback (ratings);
--   finalizing needs it, and later updates never ask again.
-- last_edited_*: who saved last (point person or a teammate) and when.
--
-- Additive and idempotent: safe to re-run.

ALTER TABLE program_submissions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS feedback_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_edited_by_email TEXT,
  ADD COLUMN IF NOT EXISTS last_edited_by_name TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'program_submissions_status_check') THEN
    ALTER TABLE program_submissions
      ADD CONSTRAINT program_submissions_status_check CHECK (status IN ('draft', 'submitted'));
  END IF;
END $$;

-- Existing rows stay judged, keep their feedback, and get a last-edit stamp.
UPDATE program_submissions SET finalized_at = created_at
  WHERE finalized_at IS NULL AND status = 'submitted';
UPDATE program_submissions s SET feedback_submitted_at = s.created_at
  WHERE s.feedback_submitted_at IS NULL
    AND EXISTS (SELECT 1 FROM submission_experience_ratings r WHERE r.submission_id = s.id);
UPDATE program_submissions SET
  last_edited_at = COALESCE(updated_at, created_at),
  last_edited_by_email = luma_email,
  last_edited_by_name = submitter_name
  WHERE last_edited_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_program_submissions_program_status
  ON program_submissions(program_id, status);

-- Teammates the point person gave edit access (their Luma email was checked
-- in when added). One team per person per program.
CREATE TABLE IF NOT EXISTS submission_editors (
  submission_id TEXT NOT NULL REFERENCES program_submissions(id) ON DELETE CASCADE,
  program_id    TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  added_by      TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (submission_id, email),
  CONSTRAINT submission_editors_one_team_per_program UNIQUE (program_id, email)
);

ALTER TABLE submission_editors ENABLE ROW LEVEL SECURITY;
