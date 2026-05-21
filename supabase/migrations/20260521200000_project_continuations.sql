-- Project continuations — 'What's next, milestone 3?' submissions.
--
-- Triggered by the team after they finish M2: a small form that captures
-- (a) the current status of the project, (b) whether they want continued
-- support and what for, and (c) an optional URL pointing at the next thing
-- (Grant application, new repo branch, demo deployment, etc.). Helps the
-- ops team keep a finger on the pulse post-M2.
--
-- Additive and idempotent.

CREATE TABLE IF NOT EXISTS project_continuations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  current_status     TEXT NOT NULL,
  want_support       BOOLEAN NOT NULL DEFAULT FALSE,
  support_for        TEXT,
  next_step_url      TEXT,
  submitted_by       TEXT NOT NULL,
  submitted_by_chain TEXT NOT NULL CHECK (submitted_by_chain IN ('substrate', 'ethereum', 'solana')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_continuations_project_recent
  ON project_continuations(project_id, created_at DESC);
