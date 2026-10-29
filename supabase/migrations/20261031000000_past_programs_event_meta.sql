-- Past programs on /programs show their event date, city and Luma link
-- (design review, 29 Oct). Fills ONLY empty fields: an existing value is never
-- overwritten, and a slug that doesn't exist is a no-op. Luma pages checked
-- for title, city and start date.
--
-- Before applying: confirm the two Denver slugs (dogfooding-2026-denver,
-- pitchoff-2026-denver). They come from the playground data; the production
-- rows may have been created with different slugs through the admin.

UPDATE programs SET
  event_url = COALESCE(event_url, 'https://luma.com/blockspace-symmetry'),
  location = COALESCE(location, 'Berlin'),
  event_starts_at = COALESCE(event_starts_at, '2024-08-19T10:00:00+02:00')
WHERE slug = 'symmetry-2024';

UPDATE programs SET
  event_url = COALESCE(event_url, 'https://luma.com/blockspacesynergy'),
  location = COALESCE(location, 'Berlin'),
  event_starts_at = COALESCE(event_starts_at, '2025-07-16T10:00:00+02:00')
WHERE slug = 'synergy-2025';

UPDATE programs SET
  event_url = COALESCE(event_url, 'https://luma.com/Sub0Symbiosis'),
  location = COALESCE(location, 'Buenos Aires'),
  event_starts_at = COALESCE(event_starts_at, '2025-11-14T10:00:00-03:00')
WHERE slug = 'symbiosis-2025';

UPDATE programs SET
  event_url = COALESCE(event_url, 'https://luma.com/dogfooding'),
  location = COALESCE(location, 'Denver'),
  event_starts_at = COALESCE(event_starts_at, '2026-02-19T13:00:00-07:00')
WHERE slug = 'dogfooding-2026-denver';

-- PromptOff! Vibe Coding Contest (the PitchOff! Denver program).
UPDATE programs SET
  event_url = COALESCE(event_url, 'https://luma.com/vibecodingcomp'),
  location = COALESCE(location, 'Denver'),
  event_starts_at = COALESCE(event_starts_at, '2026-02-20T12:00:00-07:00')
WHERE slug = 'pitchoff-2026-denver';

-- Prompt × Purchase (Bitrefill).
UPDATE programs SET
  event_url = COALESCE(event_url, 'https://luma.com/internetmoneyhack'),
  location = COALESCE(location, 'Berlin')
WHERE slug = 'bitrefill-2026';
