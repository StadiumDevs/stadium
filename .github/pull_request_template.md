## Summary

<!-- 1–3 bullets on what changed and why -->

Closes #

## Test plan

- [ ] `cd server && npm test` — pass
- [ ] `cd client && npm run build` — pass
- [ ] `cd client && npm run lint` — pass
- [ ] Manual verification (describe):

## Preview

- **Vercel preview URL**: <!-- Vercel bot will post this below; paste it here -->
- [ ] Preview opens and renders the changed feature (runs on mock data per `VITE_USE_MOCK_DATA=true`)
- [ ] No console errors on the preview

## UI verification (stadium-tester) — required

Paste the tester's full markdown report below. **Every scenario from the linked issue's `## Test scenarios` section must appear here with a PASS or a documented SKIPPED (needs-auth-harness) outcome. A PR without this section filled in is not eligible for merge.**

<!-- Paste stadium-tester report (table of scenario / result / notes) -->

- [ ] All scenarios PASS or are explicitly SKIPPED with a reason
- [ ] `window.__STADIUM_MOCK__` was `true` on the target URL when the tester ran

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
