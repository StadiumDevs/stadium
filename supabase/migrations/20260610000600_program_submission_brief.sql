-- A short brief (2-3 sentences) describing what the submitted project does.
-- Required at the application layer (submission.validator.js); the column is
-- left nullable so the migration is safe against any rows created before the
-- field existed.
--
-- Additive and idempotent — safe to re-run.

ALTER TABLE program_submissions
  ADD COLUMN IF NOT EXISTS project_brief TEXT;
