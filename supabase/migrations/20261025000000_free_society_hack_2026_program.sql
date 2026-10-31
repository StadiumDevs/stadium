-- Creates the Free Society Hack program (Zcash, Mumbai, 4-5 Nov 2026), as in
-- the playground but in its pre-event state: status 'draft' (registration open
-- on Luma; an admin sets 'open' at 11:00 IST on 4 Nov), no results.
--
-- Runs BEFORE 20261026000000_free_society_hack_2026_content.sql (filename
-- order) so the content UPDATE there finds the row.
--
-- Safe to re-run and safe if an admin already created the program by hand:
-- the INSERT does nothing on any conflict (slug or id), and the UPDATE fills ONLY
-- empty fields (an existing value is never overwritten; prize tiers only if
-- none are set).
--
-- Not here: judges (invite them in the admin EDIT modal with name and track)
-- and the Luma guest sync (Luma guests -> SYNC NOW, needs LUMA_API_KEY).
-- Values mirror client/src/lib/mockPrograms.ts and
-- client/src/lib/programProfiles.ts (FREE_SOCIETY_HACK_PRIZE_TIERS).

INSERT INTO programs (id, name, slug, program_type, description, status, owner, applications_open_at, applications_close_at, event_starts_at, event_ends_at, location, max_applicants, event_url, luma_event_id, cover_image_url, prize_tiers)
VALUES (
  'free-society-hack-2026',
  'Free Society Hack',
  'free-society-hack-2026',
  'hackathon',
  'A Zcash hackathon with a Bitrefill track at True Tramm Trunk, BKC, Mumbai. Two tracks, Privacy (Zcash) and Agentic Commerce (by Bitrefill). All times IST.',
  'draft',
  'webzero',
  '2026-10-12T00:00:00+05:30',
  '2026-10-30T23:59:00+05:30',
  '2026-11-04T11:00:00+05:30',
  '2026-11-05T00:00:00+05:30',
  'True Tramm Trunk, BKC, Mumbai',
  75,
  'https://luma.com/freesocietyhackathon',
  'evt-B6kmWqZYUUeTkIP',
  '/fsh-cover.webp',
  '[{"amount":1300,"currency":"USD","label":"Privacy: top prize"},{"amount":300,"currency":"USD","label":"Privacy: second prize"},{"amount":200,"currency":"USD","label":"Privacy: third prize"},{"amount":1000,"currency":"USD","label":"Agentic Commerce: most innovative"},{"amount":800,"currency":"USD","label":"Agentic Commerce: second"},{"amount":600,"currency":"USD","label":"Agentic Commerce: third"},{"amount":100,"currency":"USD","label":"Agentic Commerce: best feedback"}]'::jsonb
)
ON CONFLICT DO NOTHING;

UPDATE programs SET
  description = COALESCE(description, 'A Zcash hackathon with a Bitrefill track at True Tramm Trunk, BKC, Mumbai. Two tracks, Privacy (Zcash) and Agentic Commerce (by Bitrefill). All times IST.'),
  applications_open_at = COALESCE(applications_open_at, '2026-10-12T00:00:00+05:30'),
  applications_close_at = COALESCE(applications_close_at, '2026-10-30T23:59:00+05:30'),
  event_starts_at = COALESCE(event_starts_at, '2026-11-04T11:00:00+05:30'),
  event_ends_at = COALESCE(event_ends_at, '2026-11-05T00:00:00+05:30'),
  location = COALESCE(location, 'True Tramm Trunk, BKC, Mumbai'),
  max_applicants = COALESCE(max_applicants, 75),
  event_url = COALESCE(event_url, 'https://luma.com/freesocietyhackathon'),
  luma_event_id = COALESCE(luma_event_id, 'evt-B6kmWqZYUUeTkIP'),
  cover_image_url = COALESCE(cover_image_url, '/fsh-cover.webp'),
  prize_tiers = CASE
    WHEN prize_tiers IS NULL OR prize_tiers = '[]'::jsonb THEN '[{"amount":1300,"currency":"USD","label":"Privacy: top prize"},{"amount":300,"currency":"USD","label":"Privacy: second prize"},{"amount":200,"currency":"USD","label":"Privacy: third prize"},{"amount":1000,"currency":"USD","label":"Agentic Commerce: most innovative"},{"amount":800,"currency":"USD","label":"Agentic Commerce: second"},{"amount":600,"currency":"USD","label":"Agentic Commerce: third"},{"amount":100,"currency":"USD","label":"Agentic Commerce: best feedback"}]'::jsonb
    ELSE prize_tiers
  END,
  updated_at = NOW()
WHERE slug = 'free-society-hack-2026';
