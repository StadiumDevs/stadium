-- Past programs on /programs show their event date, city, Luma link and event
-- image (design review, 29 Oct). The first part fills ONLY empty fields: an
-- existing value is never overwritten, and a slug that doesn't exist is a
-- no-op. Luma pages checked for title, city, start date and cover image; the
-- images are served from the client (client/public/program-covers, WebP).
--
-- The last part OVERWRITES on purpose (requested): PromptOff! Denver was
-- recorded as a pitch-off ("PitchOff! Denver 2026") and the Bitrefill program
-- is renamed "PROMPT x PURCHASE".
--
-- Slugs checked against production on 30 Oct 2026 (GET /api/programs):
-- dogfooding-2026-denver and pitchoff-2026-denver exist as written.

UPDATE programs SET
  event_url = COALESCE(event_url, 'https://luma.com/blockspace-symmetry'),
  location = COALESCE(location, 'Berlin'),
  event_starts_at = COALESCE(event_starts_at, '2024-08-19T10:00:00+02:00'),
  cover_image_url = COALESCE(cover_image_url, '/program-covers/symmetry-2024.webp')
WHERE slug = 'symmetry-2024';

UPDATE programs SET
  event_url = COALESCE(event_url, 'https://luma.com/blockspacesynergy'),
  location = COALESCE(location, 'Berlin'),
  event_starts_at = COALESCE(event_starts_at, '2025-07-16T10:00:00+02:00'),
  cover_image_url = COALESCE(cover_image_url, '/program-covers/synergy-2025.webp')
WHERE slug = 'synergy-2025';

UPDATE programs SET
  event_url = COALESCE(event_url, 'https://luma.com/Sub0Symbiosis'),
  location = COALESCE(location, 'Buenos Aires'),
  event_starts_at = COALESCE(event_starts_at, '2025-11-14T10:00:00-03:00'),
  cover_image_url = COALESCE(cover_image_url, '/program-covers/symbiosis-2025.webp')
WHERE slug = 'symbiosis-2025';

UPDATE programs SET
  event_url = COALESCE(event_url, 'https://luma.com/dogfooding'),
  location = COALESCE(location, 'Denver'),
  event_starts_at = COALESCE(event_starts_at, '2026-02-19T13:00:00-07:00'),
  cover_image_url = COALESCE(cover_image_url, '/program-covers/dogfooding-2026-denver.webp')
WHERE slug = 'dogfooding-2026-denver';

-- PromptOff! Vibe Coding Contest (the PitchOff! Denver program).
UPDATE programs SET
  event_url = COALESCE(event_url, 'https://luma.com/vibecodingcomp'),
  location = COALESCE(location, 'Denver'),
  event_starts_at = COALESCE(event_starts_at, '2026-02-20T12:00:00-07:00'),
  cover_image_url = COALESCE(cover_image_url, '/program-covers/pitchoff-2026-denver.webp')
WHERE slug = 'pitchoff-2026-denver';

-- Prompt × Purchase (Bitrefill).
UPDATE programs SET
  event_url = COALESCE(event_url, 'https://luma.com/internetmoneyhack'),
  location = COALESCE(location, 'Berlin')
WHERE slug = 'bitrefill-2026';

-- Requested overwrites (29 Oct).
UPDATE programs SET
  name = 'PromptOff! Denver 2026',
  program_type = 'hackathon',
  location = 'The Blockspace Church, Denver',
  description = 'Welcome to PromptOff! during ETHDenver at The Blockspace Church. 2 hours. One prompt. Prove you can vibe code something that works. A fast, fun vibe coding showdown: you get a surprise prompt, 2 hours on the clock, and one goal, to ship a working prototype with at least one successful user journey. Show up solo or with a partner (teams of 2 max); the prompt is revealed at the start; submit your project via GitHub when time''s up; then demo and vote for winners. No coding experience required: just bring a laptop, your AI tool of choice, and the confidence to ship a working demo.',
  updated_at = NOW()
WHERE slug = 'pitchoff-2026-denver';

UPDATE programs SET
  name = 'PROMPT x PURCHASE',
  updated_at = NOW()
WHERE slug = 'bitrefill-2026';
