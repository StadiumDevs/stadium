-- How each track's results were ranked when a platform admin published them:
-- { "<track>": { "normalized": bool, "method": "offset" | "zscore" | null } }.
-- Set on publish and cleared on unpublish, so changing the admin's ranking
-- toggle afterwards never changes what is public.
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS results_ranking JSONB;
