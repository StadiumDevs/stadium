-- Link a submission to the Stadium project it was promoted into.
--
-- An admin can "promote" a winning/selected submission into a real `projects`
-- row so it flows into the existing project + payout tracking (team_members,
-- payments, bounties_processed, the admin project tables). This column records
-- that link, makes promotion idempotent (a submission promotes once), and keeps
-- the originating submission (Luma email, video) reachable from the project.
--
-- Nullable: most submissions are never promoted. ON DELETE SET NULL so deleting
-- a project doesn't orphan-block the submission row.
--
-- Additive and idempotent — safe to re-run.

ALTER TABLE program_submissions
  ADD COLUMN IF NOT EXISTS promoted_project_id TEXT
  REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_program_submissions_promoted_project
  ON program_submissions(promoted_project_id);
