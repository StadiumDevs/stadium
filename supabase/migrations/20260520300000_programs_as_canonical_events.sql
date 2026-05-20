-- Stadium multi-event reframe — Phase 1 (closes #93).
-- Promotes `programs` to the canonical entity for every event and continuation
-- track: backfills the historical hackathons, seeds the upcoming Bitrefill
-- event, and adds singleton rows for the M2 and Dogfooding tracks. Adds a
-- nullable `program_id` FK on `projects` and backfills it from `hackathon_id`.
--
-- Additive and idempotent — safe to re-run. Legacy `hackathon_*` columns on
-- `projects` are untouched; their removal is Phase 4.

INSERT INTO programs (id, name, slug, program_type, description, status, owner, event_starts_at, event_ends_at, location)
VALUES
  ('symbiosis-2025', 'Symbiosis 2025', 'symbiosis-2025', 'hackathon',
    'WebZero Symbiosis 2025 hackathon.',
    'completed', 'webzero', NULL, '2025-11-19T23:00:00Z', NULL),
  ('symmetry-2024', 'Symmetry 2024', 'symmetry-2024', 'hackathon',
    'WebZero Symmetry 2024 hackathon.',
    'completed', 'webzero', NULL, '2024-08-22T04:55:00Z', NULL),
  ('synergy-2025', 'Synergy 2025', 'synergy-2025', 'hackathon',
    'WebZero Synergy 2025 hackathon.',
    'completed', 'webzero', NULL, '2025-07-18T23:00:00Z', NULL),
  ('bitrefill-2026', 'Bitrefill 2026', 'bitrefill-2026', 'hackathon',
    'WebZero hackathon hosted with Bitrefill in Berlin.',
    'draft', 'webzero', '2026-06-17T00:00:00Z', NULL, 'Berlin'),
  ('m2-incubator', 'M2 Incubator', 'm2-incubator', 'm2_incubator',
    'Continuation track for event winners — focused build sprint with a mentor.',
    'open', 'webzero', NULL, NULL, NULL),
  ('dogfooding', 'Dogfooding', 'dogfooding', 'dogfooding',
    'Continuation track where past winners trade structured feedback by using each other''s products.',
    'open', 'webzero', NULL, NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS program_id TEXT REFERENCES programs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_program_id ON projects(program_id);

UPDATE projects
SET program_id = hackathon_id
WHERE program_id IS NULL
  AND hackathon_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM programs WHERE programs.id = projects.hackathon_id);
