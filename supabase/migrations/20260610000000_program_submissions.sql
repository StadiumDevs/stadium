-- Public hackathon project submissions (Bitrefill).
-- Anyone can submit via the program page; no wallet/login required. A submission
-- captures just enough to judge it: who submitted, the Luma email they signed up
-- with, the project title, and links to a video demo + GitHub repo.
--
-- One submission per (program, luma_email). The email is stored lowercased by
-- the repository (like program_signups / program_admin_emails), so the UNIQUE
-- constraint is effectively case-insensitive.
--
-- Additive and idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS program_submissions (
  id              TEXT PRIMARY KEY,
  program_id      TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  submitter_name  TEXT NOT NULL,
  luma_email      TEXT NOT NULL,
  project_title   TEXT NOT NULL,
  video_url       TEXT NOT NULL,
  github_url      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT program_submissions_email_per_program UNIQUE (program_id, luma_email)
);

CREATE INDEX IF NOT EXISTS idx_program_submissions_program_id
  ON program_submissions(program_id);
