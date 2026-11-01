-- Free Society Hack: llms-full.txt is replaced by an index plus one
-- self-contained brief per track for AI coding agents:
--   /programs/free-society-hack-2026/llms.txt                   (index)
--   /programs/free-society-hack-2026/privacy/llms.txt           (Zcash)
--   /programs/free-society-hack-2026/agentic-commerce/llms.txt  (Bitrefill)
-- Rewrite the two links in the page content; text-level replace so the rest
-- of the content is untouched. Mirrors client/src/lib/freeSocietyHackContent.ts.
UPDATE programs
SET content = replace(
  replace(
    content::text,
    'and in [llms-full.txt](/programs/free-society-hack-2026/llms-full.txt).',
    'and in the track briefs for coding agents: [Privacy llms.txt](/programs/free-society-hack-2026/privacy/llms.txt) and [Agentic Commerce llms.txt](/programs/free-society-hack-2026/agentic-commerce/llms.txt).'
  ),
  '**Using an AI assistant?** Give it [llms.txt](/programs/free-society-hack-2026/llms.txt) or the full [llms-full.txt](/programs/free-society-hack-2026/llms-full.txt): the tracks, themes, what to submit, how it''s judged and the developer resources, in one file it can read.',
  '**Using a coding agent?** Give it your track''s brief: [Privacy llms.txt](/programs/free-society-hack-2026/privacy/llms.txt) or [Agentic Commerce llms.txt](/programs/free-society-hack-2026/agentic-commerce/llms.txt), or both if you enter both. Each is self-contained: the rules, what to submit, how it''s judged and the stack. Save it as AGENTS.md in your repo. The event index is [llms.txt](/programs/free-society-hack-2026/llms.txt).'
)::jsonb
WHERE slug = 'free-society-hack-2026';
