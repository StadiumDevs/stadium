-- Stadium Phase 1 Revamp — project_updates (issue #39, Block B).
-- See docs/stadium-revamp-phase-1-spec.md §4.3.
--
-- Immutable append-only log. No edit, no delete from the API. Typos are fixed
-- by posting a new update.

CREATE TABLE IF NOT EXISTS project_updates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  body       TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  link_url   TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_updates_project_created_at
  ON project_updates(project_id, created_at DESC);
