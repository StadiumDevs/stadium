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
- [ ] API data access goes through `server/api/repositories/` (Supabase); no Mongoose in `server/api/**`; no Supabase in `server/scripts/`
- [ ] New env vars added to `.env.example` (if applicable)

## Real wallet QA

<!-- Required only when CI labels this PR `needs-real-wallet-qa` (it touches the
sign-in path: siwsUtils, client/src/lib/auth, auth middleware, server/api/auth,
admin session/tier routes). The test wallet signs silently, so a person must
check the real extension popup. Tick each item after doing it; the
"Real wallet QA" check stays red until all are ticked. Otherwise delete this section. -->

- [ ] Signed in with a real wallet extension (Polkadot.js / Talisman / SubWallet)
- [ ] The signing popup shows the expected message text (statement, domain, address)
- [ ] Rejected the signature once: the app shows a clear error and stays usable
- [ ] Signed in again successfully after the rejection

## Backlog items logged

<!-- List items added to docs/improvement-backlog.md, or "none" -->

## For reviewer

- [ ] This PR is **draft** and a human CODEOWNER must approve before merge
- [ ] Agent is NOT in CODEOWNERS
