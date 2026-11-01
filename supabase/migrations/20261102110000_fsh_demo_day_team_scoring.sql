-- Free Society Hack page content (mirrors client/src/lib/freeSocietyHackContent.ts):
-- 1. Demo day schedule (Thu 5 Nov 11:30–13:30 IST): demos from 11:45, prizes at 13:00.
-- 2. Agentic Commerce judging: 1 to 5 per criterion (max 15), averaged, ties on How innovative.
-- 3. How to submit: solo or a team of up to 4; one submission that can enter both tracks.
-- Idempotent: the schedule rows are replaced wholesale; the text replaces are no-ops once applied.

UPDATE programs p
SET content = (
  SELECT jsonb_agg(
    CASE WHEN elem->>'type' = 'schedule' THEN jsonb_set(elem, '{rows}', '[
      {"time": "Wed 4 Nov 11:00", "label": "Hack starts"},
      {"time": "Wed 4 Nov 20:00", "label": "Evening judging (projects in by now)"},
      {"time": "Thu 5 Nov 00:00", "label": "Submissions close"},
      {"time": "Thu 5 Nov 08:00", "label": "Morning judging"},
      {"time": "Thu 5 Nov 11:00", "label": "Doors open, top teams announced"},
      {"time": "Thu 5 Nov 11:30", "label": "Kickoff (10 min)"},
      {"time": "Thu 5 Nov 11:40", "label": "Zcash India (5 min)"},
      {"time": "Thu 5 Nov 11:45–12:15", "label": "Privacy demos 1–6"},
      {"time": "Thu 5 Nov 12:15–12:30", "label": "Bitrefill demos 1–3 (3 min on stage + 2 min changeover each)"},
      {"time": "Thu 5 Nov 12:30–13:00", "label": "Judges rank winners"},
      {"time": "Thu 5 Nov 13:00–13:15", "label": "Prize announcements"},
      {"time": "Thu 5 Nov 13:15–13:30", "label": "Photos and close"}
    ]'::jsonb) ELSE elem END
    ORDER BY ord
  )
  FROM jsonb_array_elements(p.content) WITH ORDINALITY AS t(elem, ord)
)
WHERE p.slug = 'free-society-hack-2026' AND jsonb_typeof(p.content) = 'array';

UPDATE programs
SET content = replace(
  replace(
    content::text,
    '**Judging:** three Bitrefill judges score every submission out of 5 on use of the Bitrefill tech stack, following the requirements, and how innovative it is; the scores are averaged.',
    '**Judging:** three Bitrefill judges score every submission from 1 to 5 on use of the Bitrefill tech stack, following the requirements, and how innovative it is (max 15); the scores are averaged across the judges, and ties go to the higher How innovative score.'
  ),
  'Submit on Stadium by **Thu 5 Nov, 00:00 IST**, with the email you registered with on Luma. Pick your track, or **Both**, and fill in what that track asks for.',
  'Submit on Stadium by **Thu 5 Nov, 00:00 IST**, with the email you registered with on Luma. Solo or a team of up to 4, including the point person. One submission per project: pick your track, or **Both** to enter and win in both, and fill in what that track asks for.'
)::jsonb
WHERE slug = 'free-society-hack-2026';
