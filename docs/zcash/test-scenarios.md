# Free Society Hack: playground test scenarios

Run against the mock playground: `cd client && npm run dev:harness`, then `http://localhost:8080`
(or a Vercel preview built with `VITE_USE_MOCK_DATA=true` + `VITE_USE_TEST_WALLET=true` + Alice in `VITE_ADMIN_ADDRESSES`).
Start from a fresh seed: admin page → RESET PLAYGROUND (or clear site data).

## Test scenarios

### Public page (brief §5, §7.6)
- [ ] On /programs/free-society-hack-2026, load the page → the ·PROGRAM / HACKATHON header (name, status, CAPITAL SOCIAL, BKC, MUMBAI) is the first block under BACK TO PROGRAMS, then ·ABOUT THIS HACKATHON, then the projects grid
- [ ] On /programs/free-society-hack-2026 at 1280px wide, look at ·ABOUT THIS HACKATHON → it is exactly as wide as the projects grid below it, with the event thumbnail in the left column and the description, date, location, schedule and SIGN UP ON LUMA in the right column
- [ ] On /programs/free-society-hack-2026 at 390px wide, look at ·ABOUT THIS HACKATHON → thumbnail above the details in one column, and the page has no horizontal scroll
- [ ] On /programs/bitrefill-2026, load the page → the same header, then ·ABOUT THIS HACKATHON with the thumbnail left and details right, as wide as the sections below
- [ ] On /programs/free-society-hack-2026, open ·HACKATHON DETAILS → there is no "How Privacy projects are judged" section and no rubric table; a Builder Pack section links to the Free Society Hack Builder Pack on Notion
- [ ] On /programs/free-society-hack-2026, look at Memo Mailbox (ticked "I want to be anonymous") → its card says BY ANONYMOUS and its modal shows point person "Anonymous" and the teammate as "Teammate · design"; "Siddharth Rao" and "Kavya Iyer" appear nowhere on the page
- [ ] On /programs/free-society-hack-2026 at 375px wide, open Chai Ledger's card → the modal sits inside the viewport with a visible border and at least 12px of space on both sides; the close button stays visible after scrolling the modal, and one Escape closes it (no tooltip pops open on the tx badge)
- [ ] On /programs/free-society-hack-2026 at 1280px wide, load the page → the projects grid shows 32 cards in 3 columns, a ·WINNERS group of 8 cards first, then ·ALL OTHER PROJECTS
- [ ] On /programs/free-society-hack-2026 at 820px wide, load the page → the grid has 2 columns and the page has no horizontal scroll
- [ ] On /programs/free-society-hack-2026 at 390px wide, load the page → the grid has 1 column and the page has no horizontal scroll
- [ ] On /programs/free-society-hack-2026, click the AGENTIC COMMERCE filter → only Agentic Commerce and both-track entries show (10 cards, including Ticket Veil and Agent Wallet Guard)
- [ ] On /programs/free-society-hack-2026, type "payroll" in the search box → only Quiet Payroll shows
- [ ] On /programs/free-society-hack-2026, click Chai Ledger's card → a modal shows pitch, description, track, themes "1. Private payment rails" and "3. Privacy beyond the transaction", point person "Priya Nair (mock)", teammate "Arjun Mehta (mock) · frontend", public URL, demo video with 1:54, repo, all 6 technologies, VERIFIED ON TESTNET with the MOCK-…0001 txid linked to testnet.zcashexplorer.app/transactions/<txid> (▸ EXPLORER), next milestone with its link to the zcash-sdk issue, and friction notes with Faucet / WebZjs or SDK / Docs tags; no email address appears
- [ ] On /programs/free-society-hack-2026, look at non-winner cards → every card shows a ·NEXT MILESTONE and none has a PROJECT PAGE link; the words "NEXT STEP" appear nowhere on the page
- [ ] On /programs/free-society-hack-2026, look at the Hushbox (second prize) and Tip Jar SDK (third prize) cards → each shows a ★ ECOSYSTEM PRIZE badge and ·30-DAY MILESTONE with the partner and AGREE / DELIVER / SHARE; Hushbox is IN PROGRESS, Tip Jar SDK is COMPLETED; exactly 2 cards carry the badge
- [ ] On /programs/free-society-hack-2026, look at tx badges → VERIFIED ON TESTNET, NOT FOUND / NOT SHIELDED (ZecSplit, Proof of Reserves Lite) and COULD NOT CHECK (Memo Mailbox) all appear; Agentic-only cards show no badge
- [ ] On /programs/free-society-hack-2026, look at Ticket Veil → it shows two prizes ($200 Privacy third, $800 Agentic Commerce second)
- [ ] On /programs/free-society-hack-2026/projects/fsh-05-tip-jar-sdk, load → the winner page shows the $200 third prize plus the Ecosystem Prize line, a 5-step milestone tracker with all steps ticked and dates, and full details
- [ ] On /programs/free-society-hack-2026/projects/fsh-03-quiet-payroll (a second prize without the flag), load → the winner page shows the $300 prize and no milestone tracker
- [ ] On /programs/free-society-hack-2026/projects/fsh-06-orchard-receipts (a non-winner), load → the 404 page shows
- [ ] On /programs/bitrefill-2026, load → no tracked grid, Bitrefill content as on develop below the about panel

### Admin + judging (brief §4, §7.3–7.5, §7.7) — needs the test-wallet harness
- [ ] On /admin/programs/free-society-hack-2026, connect the admin wallet → exactly one wallet signature (the login), no LOAD ADMIN DATA step, and no request to /admin/session in mock mode
- [ ] On /admin/programs/free-society-hack-2026 after logging in, stay 20 seconds (4+ judges' progress refreshes), reload, and change an Ecosystem Prize flag → no further signatures
- [ ] On /admin/programs/free-society-hack-2026 with the admin session expired (clear stadium_admin_session_v1) → background refreshes never open the wallet; on reload ·ADMIN SESSION EXPIRED shows and SIGN IN AGAIN asks for one signature, then the sections load
- [ ] On /admin/programs/free-society-hack-2026, connect the admin wallet → the ·PLAYGROUND bar (with OPEN AS JUDGE links for all 7 judges), ·JUDGING, ·ECOSYSTEM PRIZE MILESTONES, ·CHECK-INS and ·FRICTION REPORT sections render
- [ ] On /admin/programs/free-society-hack-2026 as the wallet admin, look at ·JUDGING → there is no SCORE tab, no judge picker and no score cards; the ·JUDGES' PROGRESS table (7 judges, names only, no emails) and the leaderboard show
- [ ] On /admin/programs/free-society-hack-2026?judge=bitrefill-judge-1@example.com (the judge's email link) → SCORING AS Bitrefill Judge 1 (mock) shows with no select on the page, and the scoring bar has exactly 10 boxes, all Agentic Commerce or both-track
- [ ] On /admin/programs/free-society-hack-2026?judge=nobody@example.com → "nobody@example.com is not a judge for this program." shows and no score card renders
- [ ] On /admin/programs/free-society-hack-2026?judge=judge-a@example.com, look at the top of ·JUDGING → ·JUDGES' PROGRESS lists all 7 judges with SCORED counts (Judge A 24/24 marked YOU), above the sticky scoring bar showing 24 / 24 SCORED and 24 numbered boxes
- [ ] On /admin/programs/free-society-hack-2026?judge=judge-a@example.com, the open project is Chai Ledger (1 / 24) → six criteria (Works, Private, Easy, Needed, Continuing, Bonus) with level descriptors show, the saved choice is 3/2/2/3/3/1 = 14/16, the note "Paid at the URL from Zingo… Server stores customer emails next to orders." is filled, status SAVED · MORNING, a JUDGING GUIDE link points to the Privacy track judging guide on Notion, and the txid links to the explorer
- [ ] On /admin/programs/free-society-hack-2026?judge=judge-a@example.com, look at the scoring bar → every saved project's box is green and the progress fill is green, so unscored (outlined) and draft (dashed) boxes stand out
- [ ] On /admin/programs/free-society-hack-2026?judge=judge-a@example.com, click box 5 in the scoring bar → project 5 / 24 opens; NEXT ▸ opens 6 / 24 and ◂ PREV goes back to 5 / 24
- [ ] On /admin/programs/free-society-hack-2026?judge=judge-a@example.com, change one criterion and reload → the same project is still open, shows DRAFT with the change kept, its box is dashed and the bar says 1 DRAFT
- [ ] On /admin/programs/free-society-hack-2026?judge=judge-a@example.com, open Memo Mailbox (anonymous) → POINT PERSON ANONYMOUS shows, not the builder's name
- [ ] With the judge-a link open in one tab, add a new Privacy project from another tab (submit it on /programs/free-society-hack-2026 with status OPEN; the automated run writes it straight into the playground store, which is what a submit does) → without a reload, the judge tab's progress table shows Judge A 24/25; reload the judge tab (its queue loads on open), score the new project with SAVE & NEXT → the bar shows 25 / 25 SCORED and a second judge tab (judge-b link) shows Judge A 25/25 within 5 seconds, without a reload
- [ ] On /admin/programs/free-society-hack-2026, open LEADERBOARD (PRIVACY) → order is Chai Ledger 13.0, Proof of Reserves Lite 12.4, Hushbox 12.0, Quiet Payroll 12.0 (TIE · BROKEN BY CONTINUING), Ticket Veil 11.6, Tip Jar SDK 11.0, Orchard Receipts 11.0 (TIE · BROKEN BY NEEDED); all rows 5/5 judges
- [ ] On /admin/programs/free-society-hack-2026?judge=judge-a@example.com, open LEADERBOARD and click Chai Ledger's name → the project details modal opens (pitch, links, txid, next milestone, prize) with OPEN PROJECT PAGE (results are published in the seed; the link is hidden while unpublished); JUDGES' SCORES ▾ still shows each judge's scores
- [ ] On /admin/programs/free-society-hack-2026?judge=judge-a@example.com, LEADERBOARD, click Memo Mailbox → the modal shows point person "Anonymous"; as the wallet admin the same modal shows Siddharth Rao (mock)
- [ ] On /admin/programs/free-society-hack-2026, LEADERBOARD (PRIVACY), look at Proof of Reserves Lite → the warning "Average Works score is 0: this project can't be selected as a winner." shows and its prize select is disabled
- [ ] On /admin/programs/free-society-hack-2026, leaderboard PRIVACY → prize selects show top ×1, second ×2, third ×2; AGENTIC COMMERCE shows $1,000 / $800 / $600 / $100 best feedback (Bill Pilot)
- [ ] On /admin/programs/free-society-hack-2026, leaderboard PRIVACY → the ECOSYSTEM PRIZE checkbox is ticked on Hushbox and Tip Jar SDK, and disabled on every other row (2/2 flagged); unticking Hushbox enables it on the other podium rows only
- [ ] On /admin/programs/free-society-hack-2026, click EXPORT CSV (SCORES + NOTES) → the CSV has 32 rows with track, pointPersonName/Email (Memo Mailbox shows Siddharth Rao (mock), with anonymous = yes on that row only), nextMilestone, nextMilestoneLinks, ecosystemPrize (yes on exactly 2 rows), frictionAreas/Notes, and per judge: total, each of works/private/easy/needed/continuing/bonus, notes and session
- [ ] On /admin/programs/free-society-hack-2026, FRICTION REPORT → notes grouped by area (Faucet, Node or indexer, WebZjs or SDK, Wallet, Docs, Other) with project and track; EXPORT CSV downloads them
- [ ] On /admin/programs/free-society-hack-2026, CHECK-INS → 14-day and 30-day cards show SENT dates and still-building counts split into Ecosystem Prize winners (2/2 at both) and everyone else
- [ ] On /admin/programs/free-society-hack-2026?judge=judge-a@example.com, open Memo Mailbox → RE-CHECK → after retries the badge stays COULD NOT CHECK (not a failure)
- [ ] On /admin/programs/free-society-hack-2026, click RESET PLAYGROUND → after reload every seeded state above is restored
