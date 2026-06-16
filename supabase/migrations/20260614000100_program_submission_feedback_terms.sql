-- Submission terms agreement + post-submission feedback.
--
-- agreed_to_terms_at: when the submitter ticked the "I agree to the submission
--   terms" box. Null for submissions made before terms existed / programs with
--   no terms.
-- feedback: free-form JSONB capturing the program's feedback questions (which
--   Bitrefill surfaces, agent environment, where they landed, blockers, etc.).
--   JSONB so the question set can evolve without a schema change.
--
-- Additive and idempotent — safe to re-run.

ALTER TABLE program_submissions
  ADD COLUMN IF NOT EXISTS agreed_to_terms_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS feedback JSONB;
