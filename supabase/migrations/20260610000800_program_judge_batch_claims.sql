-- Which batches a judge has claimed to score.
--
-- With a large submission field, judging is split into fixed batches of 10
-- (BATCH_SIZE in the app). A judge claims the batches they'll cover; multiple
-- judges may claim the same batch, and a judge may claim several. Each project
-- ends up scored by at least one judge (not necessarily all). Batch membership
-- itself is DERIVED from submission order in the app — only the claim is stored.
--
-- judge_email stored lowercased by the repository.
--
-- Additive and idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS program_judge_batch_claims (
  program_id    TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  judge_email   TEXT NOT NULL,
  batch_number  INTEGER NOT NULL CHECK (batch_number >= 1),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (program_id, judge_email, batch_number)
);

CREATE INDEX IF NOT EXISTS idx_judge_batch_claims_program ON program_judge_batch_claims (program_id);
