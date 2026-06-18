-- Bounty prizes were USD-only (no currency column; amounts render with "$").
-- Hackathon submissions promoted into the winners panel carry non-USD prizes
-- (e.g. Bitrefill = EUR), so record the currency per bounty. Existing rows
-- default to USD, preserving current behavior.
--
-- Additive + idempotent.

ALTER TABLE bounty_prizes
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
