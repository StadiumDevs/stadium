-- A platform admin can flag a program as "judging in progress". The public
-- program page then shows a JUDGING IN PROGRESS badge next to its status.
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS judging_in_progress BOOLEAN NOT NULL DEFAULT false;
