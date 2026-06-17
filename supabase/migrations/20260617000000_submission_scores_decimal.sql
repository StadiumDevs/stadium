-- Allow decimal judge scores (e.g. 4.3/5).
--
-- Widen the three score columns from INTEGER to NUMERIC(3,1) (one decimal place).
-- This is non-destructive and backward-compatible: existing integer scores are
-- preserved (5 -> 5.0), the BETWEEN range CHECK constraints stay valid for
-- numerics, and the previously-deployed integer-only code keeps writing fine.
-- Safe to run while the old build is still serving.
--
-- Idempotent-ish: re-running ALTER TYPE to the same type is a cheap no-op.

ALTER TABLE submission_scores
  ALTER COLUMN requirements_score TYPE NUMERIC(3,1),
  ALTER COLUMN tech_stack_score   TYPE NUMERIC(3,1),
  ALTER COLUMN innovation_score   TYPE NUMERIC(3,1);
