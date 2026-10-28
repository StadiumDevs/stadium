-- Per-judge rubric scores for tracked programs (Free Society Hack): one row per
-- (submission, judge, track), with the criteria as JSONB so each track keeps
-- its own rubric. Partial scores are allowed: judges' work autosaves as they
-- go, and only fully scored rows count towards the leaderboard and progress.
-- Sits beside the Bitrefill `submission_scores` table, which is unchanged.
-- Rubric definitions: server/api/constants/rubrics.js (mirrors
-- client/src/lib/programProfiles.ts).

CREATE TABLE IF NOT EXISTS submission_rubric_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id TEXT NOT NULL REFERENCES program_submissions(id) ON DELETE CASCADE,
  program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  -- From the verified email session, never the request body. Lowercased.
  judge_email TEXT NOT NULL,
  track TEXT NOT NULL CHECK (track IN ('privacy', 'agentic')),
  -- { "<criterion id>": 0..max | null }. Validated in the API.
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  -- Judging session the score was last saved in (e.g. 'evening', 'morning').
  session TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT submission_rubric_scores_one_per_judge_track UNIQUE (submission_id, judge_email, track)
);

CREATE INDEX IF NOT EXISTS submission_rubric_scores_program_judge_idx
  ON submission_rubric_scores (program_id, judge_email);

-- Same posture as every other public table: the API uses the service role;
-- no anon/authenticated policies.
ALTER TABLE submission_rubric_scores ENABLE ROW LEVEL SECURITY;

-- Which tracks an invited judge may score. NULL = every track (existing
-- grants, and the Bitrefill flow, are unaffected).
ALTER TABLE program_admin_emails ADD COLUMN IF NOT EXISTS tracks TEXT[];
