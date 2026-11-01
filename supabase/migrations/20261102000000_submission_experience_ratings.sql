-- Event experience ratings, given by the builder when they submit a project.
--
-- One row per (submission, category), each scored 1-5. Categories are
-- validated in app code (server/api/constants/experienceRatings.js) rather
-- than as an enum, so a new category needs no schema change. A resubmit
-- upserts the same rows. Ratings go with their submission (ON DELETE CASCADE).
--
-- Additive and idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS submission_experience_ratings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id TEXT NOT NULL REFERENCES program_submissions(id) ON DELETE CASCADE,
  program_id    TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  category      TEXT NOT NULL,
  score         SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT submission_experience_ratings_one_per_category UNIQUE (submission_id, category)
);

CREATE INDEX IF NOT EXISTS idx_submission_experience_ratings_program
  ON submission_experience_ratings(program_id, category);

-- Only the server (service role) reads and writes; no public policies.
ALTER TABLE submission_experience_ratings ENABLE ROW LEVEL SECURITY;
