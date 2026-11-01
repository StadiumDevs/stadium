-- Free Society Hack: llms-full.txt is replaced by one brief per track
-- (llms-zcash.txt, llms-bitrefill.txt). Rewrite the two links in the page
-- content; text-level replace so the rest of the content is untouched.
-- Mirrors client/src/lib/freeSocietyHackContent.ts.
UPDATE programs
SET content = replace(
  replace(
    content::text,
    'and in [llms-full.txt](/programs/free-society-hack-2026/llms-full.txt).',
    'and in the track briefs: [llms-zcash.txt](/programs/free-society-hack-2026/llms-zcash.txt) and [llms-bitrefill.txt](/programs/free-society-hack-2026/llms-bitrefill.txt).'
  ),
  'Give it [llms.txt](/programs/free-society-hack-2026/llms.txt) or the full [llms-full.txt](/programs/free-society-hack-2026/llms-full.txt): the tracks, themes, what to submit, how it''s judged and the developer resources, in one file it can read.',
  'Give it your track''s brief: [llms-zcash.txt](/programs/free-society-hack-2026/llms-zcash.txt) for Privacy, [llms-bitrefill.txt](/programs/free-society-hack-2026/llms-bitrefill.txt) for Agentic Commerce, or both if you enter both. Each has the rules, what to submit, how it''s judged and the developer resources. The index is [llms.txt](/programs/free-society-hack-2026/llms.txt).'
)::jsonb
WHERE slug = 'free-society-hack-2026';
