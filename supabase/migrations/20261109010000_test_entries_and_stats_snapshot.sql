-- Test entries: a submission made to try the form (e.g. an organiser's
-- "Example Project"). Kept for the record but excluded from judging, the
-- leaderboard, the public list and the stats page.
ALTER TABLE program_submissions
  ADD COLUMN IF NOT EXISTS is_test_entry BOOLEAN NOT NULL DEFAULT false;

-- Free Society Hack: the organiser's test entry from 2 Nov.
UPDATE program_submissions
   SET is_test_entry = true
 WHERE project_title = 'Example Project'
   AND program_id = (SELECT id FROM programs WHERE slug = 'free-society-hack-2026');

-- The published prize winners and submission stats page: a snapshot taken
-- when a platform admin publishes it, so later score, prize or feedback
-- changes don't change what is public until they republish.
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS stats_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS stats_published_at TIMESTAMPTZ;
