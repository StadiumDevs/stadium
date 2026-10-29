-- Tracked programs (Free Society Hack): what the server needs to take real
-- submissions and judging. Additive only; the Bitrefill flow is unchanged.
--
-- 1. program_submissions.details / track: the tracked submission fields
--    (track, themes, pitch, team, txid, next milestone, friction, anonymous),
--    validated in the API (validateSubmissionDetails) and stored as JSONB, with
--    the track as a column for filtering.
-- 2. submission_rubric_scores: per-judge rubric scores, one row per
--    (submission, judge, track), criteria as JSONB so each track keeps its own
--    rubric. Partial scores are allowed (judges' work autosaves); only fully
--    scored rows count. Plus the judge's revisit flag and pre-scoring checks.
-- 3. program_admin_emails.name / tracks: a judge's display name and the
--    tracks they may score (NULL = every track).
--
-- Config mirrored in server/api/constants/{rubrics,trackedPrograms}.js and
-- client/src/lib/programProfiles.ts.

ALTER TABLE program_submissions ADD COLUMN IF NOT EXISTS details JSONB;
ALTER TABLE program_submissions ADD COLUMN IF NOT EXISTS track TEXT
  CHECK (track IS NULL OR track IN ('privacy', 'agentic', 'both'));
CREATE INDEX IF NOT EXISTS program_submissions_program_track_idx
  ON program_submissions (program_id, track);

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
  -- The judge's own "unsure, come back to this" mark. Doesn't change whether
  -- a fully scored row counts.
  revisit BOOLEAN NOT NULL DEFAULT false,
  -- What the judge checked before scoring: { "video", "repo", "tx": boolean }.
  -- A prompt and reminder only; doesn't affect scoring.
  checks JSONB NOT NULL DEFAULT '{}'::jsonb,
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
-- A judge's display name (shown to other judges instead of their email).
ALTER TABLE program_admin_emails ADD COLUMN IF NOT EXISTS name TEXT;
