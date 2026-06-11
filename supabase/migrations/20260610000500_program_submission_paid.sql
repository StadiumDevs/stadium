-- Payout tracking for submissions: an admin marks a (winning) submission as
-- paid. This is the simple operational signal — "did we pay this team yet" —
-- with no wallet/on-chain machinery. paid_at / paid_by record when and who.
--
-- Additive and idempotent — safe to re-run.

ALTER TABLE program_submissions
  ADD COLUMN IF NOT EXISTS paid BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE program_submissions
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

ALTER TABLE program_submissions
  ADD COLUMN IF NOT EXISTS paid_by TEXT;
