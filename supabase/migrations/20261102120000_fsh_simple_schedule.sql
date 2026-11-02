-- Free Society Hack: the public schedule keeps only the key times (the detailed
-- demo-day run-of-show stays in the internal runbook). Mirrors
-- client/src/lib/freeSocietyHackContent.ts. Idempotent: replaces the rows.
UPDATE programs p
SET content = (
  SELECT jsonb_agg(
    CASE WHEN elem->>'type' = 'schedule' THEN jsonb_set(elem, '{rows}', '[
      {"time": "Wed 4 Nov 11:00", "label": "Hack starts"},
      {"time": "Wed 4 Nov 20:00", "label": "Evening judging (projects in by now)"},
      {"time": "Thu 5 Nov 00:00", "label": "Submissions close"},
      {"time": "Thu 5 Nov 08:00", "label": "Morning judging"},
      {"time": "Thu 5 Nov 11:00", "label": "Top teams announced to demo"},
      {"time": "Thu 5 Nov 11:30", "label": "Demos"},
      {"time": "Thu 5 Nov 13:00", "label": "Prize announcements"}
    ]'::jsonb) ELSE elem END
    ORDER BY ord
  )
  FROM jsonb_array_elements(p.content) WITH ORDINALITY AS t(elem, ord)
)
WHERE p.slug = 'free-society-hack-2026' AND jsonb_typeof(p.content) = 'array';
