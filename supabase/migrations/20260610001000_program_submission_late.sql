-- Marks a submission made after the program's deadline (event end). The deadline
-- is informational — submissions aren't blocked — so this flag lets judges/admins
-- see which entries came in late. Computed at submit/resubmit time in the app.
--
-- Additive and idempotent — safe to re-run.

ALTER TABLE program_submissions
  ADD COLUMN IF NOT EXISTS late BOOLEAN NOT NULL DEFAULT false;
