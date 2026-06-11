-- Per-judge, per-submission scores (Bitrefill rubric).
--
--   requirements_score : 0-2  (met the requirements)
--   tech_stack_score   : 0-5  (use of the Bitrefill tech stack)
--   innovation_score   : 0-5  (how innovative the submission is)
--   => max total 12
--
-- One row per (submission, judge_email), upserted as a judge edits their draft.
-- The judge identity is the Supabase-verified email (stored lowercased by the
-- repository), never a value the client supplies in the body.
--
-- The CHECK constraints are a second line of defence behind the controller's
-- range validation, so an out-of-range score can never reach the leaderboard.
--
-- Additive and idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS submission_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id       TEXT NOT NULL REFERENCES program_submissions(id) ON DELETE CASCADE,
  program_id          TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  judge_email         TEXT NOT NULL,
  requirements_score  INTEGER NOT NULL DEFAULT 0 CHECK (requirements_score BETWEEN 0 AND 2),
  tech_stack_score    INTEGER NOT NULL DEFAULT 0 CHECK (tech_stack_score   BETWEEN 0 AND 5),
  innovation_score    INTEGER NOT NULL DEFAULT 0 CHECK (innovation_score   BETWEEN 0 AND 5),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT submission_scores_one_per_judge UNIQUE (submission_id, judge_email)
);

CREATE INDEX IF NOT EXISTS idx_submission_scores_program_id
  ON submission_scores(program_id);
CREATE INDEX IF NOT EXISTS idx_submission_scores_judge
  ON submission_scores(program_id, judge_email);
