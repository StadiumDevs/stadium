-- Stadium Phase 1 Revamp — project_funding_signals (issue #42, Block C).
-- See docs/stadium-revamp-phase-1-spec.md §4.4.
--
-- 1:1 with projects but stored as a table (not a column) so we can later
-- track changes over time without another migration.

CREATE TABLE IF NOT EXISTS project_funding_signals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  is_seeking   BOOLEAN NOT NULL DEFAULT FALSE,
  funding_type TEXT CHECK (funding_type IN ('grant', 'bounty', 'pre_seed', 'seed', 'other')),
  amount_range TEXT,
  description  TEXT CHECK (description IS NULL OR length(description) <= 500),
  updated_by   TEXT NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id)
);

CREATE INDEX IF NOT EXISTS idx_funding_signals_is_seeking
  ON project_funding_signals(is_seeking) WHERE is_seeking = TRUE;
