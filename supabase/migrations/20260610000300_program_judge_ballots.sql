-- A judge's overall ballot status for a program.
--
-- 'in_progress' (default) means the judge is still scoring. 'submitted' means
-- they have finalized scores for ALL submissions and clicked "submit"; their
-- submission_scores rows are then locked against further edits.
--
-- This is the signal that gates the leaderboard: it unlocks only once every
-- registered judge (role='judge' in program_admin_emails) has a 'submitted'
-- ballot here. Kept separate from submission_scores because "this judge is
-- globally done" is a ballot-level fact, not a per-score one.
--
-- judge_email stored lowercased by the repository.
--
-- Additive and idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS program_judge_ballots (
  program_id    TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  judge_email   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted')),
  submitted_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (program_id, judge_email)
);
