## Summary

<!-- 1–3 bullets on what changed and why -->

Closes #

## Test plan

- [ ] `cd server && npm test` — pass
- [ ] `cd client && npm run build` — pass
- [ ] `cd client && npm run lint` — pass
- [ ] Manual verification (describe):

## Invariants verified

- [ ] `BYPASS_ADMIN_CHECK` still `false` in `AdminPage.tsx`
- [ ] New admin routes use `server/api/middleware/auth.middleware.js`
- [ ] No hardcoded admin/wallet addresses
- [ ] No new `console.log/warn/error` in client production code
- [ ] No new Supabase imports or calls
- [ ] New env vars added to `.env.example` (if applicable)

## Backlog items logged

<!-- List items added to docs/improvement-backlog.md, or "none" -->

## For reviewer

- [ ] This PR is **draft** and a human CODEOWNER must approve before merge
- [ ] Agent is NOT in CODEOWNERS
