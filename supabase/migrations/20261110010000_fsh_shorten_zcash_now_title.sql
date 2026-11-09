-- Free Society Hack: shorten Sachin's zcash-now title for display (organisers'
-- request, 10 Nov 2026). One row, matched by id; the id (and the project page
-- URL) doesn't change. The privacy review and judges' feedback fixtures match
-- this entry by repo URL, so they're unaffected. Idempotent.
UPDATE program_submissions
   SET project_title = 'zcash-now: A keyless MCP server'
 WHERE id = 'zcash-now-a-keyless-mcp-server-and-llms-txt-that-keep-ai-coding-agents-current-on-zcash-so-a-developer-new-to-zcash-gets-code-that-works-on-today-s-nu7-testnet-the-first-time-70fbde'
   AND program_id = (SELECT id FROM programs WHERE slug = 'free-society-hack-2026');
