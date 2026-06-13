-- Winner selection + prize tiers + public results for program judging.
--
-- After judging completes, a platform (global) admin elects winners from the
-- scored submissions and assigns each a prize tier (configurable per program;
-- Bitrefill = 500 / 200 / 100 EUR giftcards). An explicit publish step then
-- exposes all submissions (winners highlighted) on the public program page.
--
-- prize_tiers: array of { amount:int, currency:text, label:text }. Null ⇒ the
--   app falls back to DEFAULT_PRIZE_TIERS, so the selector always has options.
-- results_published_at: null until a platform admin publishes; gates the
--   public results endpoint.
-- On a submission, a non-null prize_amount marks it a winner (flexible: a tier
--   may be assigned to any number of submissions). awarded_at/by are audit.
--
-- Columns are nullable — required-ness is enforced in the app layer, matching
-- the paid / project_brief migrations. Additive and idempotent — safe to re-run.

ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS prize_tiers JSONB;

ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS results_published_at TIMESTAMPTZ;

ALTER TABLE program_submissions
  ADD COLUMN IF NOT EXISTS prize_amount INTEGER;

ALTER TABLE program_submissions
  ADD COLUMN IF NOT EXISTS prize_currency TEXT;

ALTER TABLE program_submissions
  ADD COLUMN IF NOT EXISTS prize_label TEXT;

ALTER TABLE program_submissions
  ADD COLUMN IF NOT EXISTS awarded_at TIMESTAMPTZ;

ALTER TABLE program_submissions
  ADD COLUMN IF NOT EXISTS awarded_by TEXT;
