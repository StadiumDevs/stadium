# Free Society Hack (Zcash) on Stadium

Status: mock-mode playground on branch `zcash-testing`. The client UX is built end to end against mock data. The server side is planned below and not yet built. Brief: `new-brief.md`. Playground scenarios: `docs/zcash/test-scenarios.md`.

## 1. What the playground is

The repo has no seeded backend and no staging Supabase, so the "testing playground" is the client's mock mode:

- **Local:** `cd client && npm run dev:harness`, then open `http://localhost:8080`.
- **Remote:** any Vercel branch preview built with `VITE_USE_MOCK_DATA=true`.

The program is `free-society-hack-2026` in `client/src/lib/mockPrograms.ts`. All of its data comes from one re-seedable fixture, `client/src/lib/mocks/freeSocietyHack.seed.ts`:

- 32 submissions.
- 7 judges.
- Scores from both judging sessions.
- 9 prizes across 8 projects.
- Two milestones.
- Tx check results.

State lives in `localStorage`, managed by `client/src/lib/mockTrackedSubmissions.ts`. To see the page **before the hack** (registration open, no projects yet), open `/programs/free-society-hack-2026?preview=before` (or PREVIEW: BEFORE THE HACK ↗ on the admin ·PLAYGROUND bar); it changes nothing stored. The mock-only **RESET PLAYGROUND** button on `/admin/programs/free-society-hack-2026` re-seeds it.

**Playground limits:**
- **Status changes don't survive a reload.** The status buttons change program status in memory only.
- **The Bitrefill mock is separate.** It keeps using `mockJudging.ts`, unchanged.
- **The submit form is hidden on the seed.** Results are published, so the page shows the post-event layout. To try submitting:
  1. Set status OPEN on the playground bar.
  2. Click UNPUBLISH RESULTS on the leaderboard.
  3. Submit as `builder@example.com`.

## 2. Scrutiny (brief §3)

### Slug-specific code

| Item | Before | Now | Files |
|---|---|---|---|
| `TERMS_BY_SLUG` | Only Bitrefill had terms | Fixed: FSH terms added, **marked PLACEHOLDER** (drafted from the brief; the 14 Oct Luma doc wasn't available) | `client/src/lib/submissionTerms.ts` |
| `FEEDBACK_BY_SLUG` / `FeedbackAnswers` / aggregate | Built around Bitrefill's question ids | **Not generalised.** FSH needs friction notes and areas, not a survey, so they are first-class submission fields instead. Making the Bitrefill survey work for a second slug with new question ids costs about 0.5 day across 5 places (see note below) | `client/src/lib/submissionFeedback.ts` |
| Mock program | New slug 404'd in previews | Fixed: program, signups (every point person plus `builder@example.com`) and judges added | `client/src/lib/mockPrograms.ts` |
| Content | None | Fixed: `freeSocietyHackContent.ts` plus a migration generated from it. The `UPDATE … WHERE slug=` is a no-op until the program exists, so re-run it after creating the program | `client/src/lib/freeSocietyHackContent.ts`, `supabase/migrations/20261026000000_free_society_hack_2026_content.sql` |
| `DEFAULT_PRIZE_TIERS` (Bitrefill EUR) | Shown for any program without tiers | FSH sets explicit USD tiers. The form copy is now neutral and new rows default to USD. **The default values themselves are unchanged**, because a Bitrefill row with null tiers in prod would change. Always set tiers explicitly | `client/src/lib/constants.ts`, `server/api/utils/submission.validator.js`, `client/src/components/admin/ProgramFormModal.tsx` |

Where the survey's question ids are hardcoded today:
1. `SubmitProjectModal` answer assembly.
2. `FeedbackAnswers`.
3. Server `FEEDBACK_STRING_KEYS` in `submission.validator.js`. Unknown keys are silently dropped here.
4. `FEEDBACK_KEYS` in `submissions-csv.js`.
5. `aggregateFeedback` in `program-submission.repository.js`.

### Open questions

- **Does a submission record its track?** No: there was no track field anywhere. **Mock now**: `details.track` is `privacy`, `agentic` or `both`. The server needs a migration (§4).
- **Can one prize tier go to two projects?** Yes. Nothing enforces uniqueness. Caveat: `validatePrize` matches a tier by `amount` only, so two tiers with the same amount can't be told apart. FSH amounts are all unique, so this is fine here.
- **Can a judge be limited to one track?** No: a grant is only the `judge` or `admin` role per program (`auth.middleware.js:626-660`). **Mock now**: judges carry `tracks`, and their queue and score saves are limited to those tracks. The server needs this (§4).
- **Does `closed` still allow scoring and winner selection?** Yes. The server never checks program status for scoring, claiming, awards or publishing. Submissions aren't status-gated on the server either; only the client button is.
- **Can status change at a set time?** No. There is no cron, scheduler or Vercel cron, so an admin flips it by hand (times in §6).
- **Is `LUMA_GATE_MODE` server-wide?** Yes. It's read from `process.env` in `luma-sync.service.js:14-16` and applies to every Luma-synced program. Only set `approved` for a dry run when no other event is live.
- **Is the point person stored apart from teammates?** No: only `submitter_name` and `luma_email` existed. **Mock now**: the gated email is the point person, and teammates are in `details.team[]`.
- **Are judge scores and notes in the CSV?** No. The server CSV has no scores, and notes are private to each judge. **Mock now**: one CSV with every judge's criterion scores, total, notes and session, plus track, point person, Ecosystem Prize flag, next-step links and friction.
- **Can a winning project carry a second award (the Ecosystem Prize) on top of its tier?** No: a submission held one prize per program and nothing else. **Mock now** (28 Oct brief): an `ecosystemPrize` flag, separate from tiers. A global admin ticks it on the Privacy leaderboard for up to two podium projects at any prize level. Flagging opens the tracked milestone; losing the podium prize drops the flag. Server: one `program_submissions.ecosystem_prize BOOLEAN` (+0.25 day, in §4).
- **Can a judge score in two sessions without losing work?** Saved scores persist. Unsaved edits were lost on reload, and untouched fields saved as 0. **Mock now**: criteria start unscored rather than 0, unsaved drafts persist per judge on the device, and each score records its session.

### Cleanup done (scoped)

- `SubmitProjectModal`: the generic validation copy no longer says "Bitrefill surface".
- `ProgramFormModal`: neutral prize help text and placeholders.
- `ProgramSponsorsSection`: neutral placeholder.
- `ProgramResultsSummarySection`: neutral open-text heading. The Bitrefill-shaped feedback panel is hidden for tracked programs, which get the friction report instead.
- `MarkdownBody` now styles GFM tables (the rubric table). They scroll sideways on phones.

### Logged to the backlog, not fixed

See `docs/improvement-backlog.md` (2026-10-25 entries):
- Promote likely fails on NOT NULL columns, and it puts the Luma email into the public description.
- `requestChanges` writes the wrong key, so the feedback is never saved.
- **`PATCH /m2-program/:id` has no field allowlist (major).** A team member can set `totalPaid` or `m2Status`. I'd suggest promoting this one to an issue.
- The M2 week calendar is hardcoded to Nov 2025.
- No UI calls `promoteSubmission`.

## 3. How the two differences were done

### Milestones

**Finding:** the M2 milestone system isn't tied to `program_type`, but it doesn't fit FSH builders:
- It runs on `projects.m2_status`.
- Its calendar is hardcoded (`M2_WEEKS`, Nov 2025).
- It's edited through wallet-only `requireTeamMemberOrAdmin`. Builders who signed up with a Luma email have no wallet.
- It needs promotion into a project, which looks broken (backlog).

**Decision (agreed):** the milestone lives on the submission (`details.milestone`). The UI reuses `components/milestone-track.tsx`.

- **Steps and dates:** Agree by 13 Nov · check-in 19 Nov · Deliver by 4 Dec (partner confirms) · Share at the Friday Lounge by 4 Dec · $100 released 11 Dec.
- **Fields:** sentence, partner name and project, agreed date, delivery link, partner confirmed and its date, Lounge date, payout status.
- **Who edits:** the builder writes the sentence and delivery link. In mock that's a "BUILDER: EDIT MILESTONE" button on the winner page; the real version uses an emailed sign-in link. The admin assigns the partner and records the confirmation, Lounge date and payout.
- **Not completed** shows as "NOT COMPLETED. The builder keeps the day prize". It's never shown as a penalty.
- **Opening a milestone:** flagging a podium project for the Ecosystem Prize opens one automatically, seeded from the submission's next step. Unflagging hides it but keeps what was recorded.

### Privacy rubric

`client/src/lib/programProfiles.ts` holds a per-track rubric:
- **Privacy (final, 28 Oct):** Works, Private, Easy, Needed, Continuing scored 0–3 plus a Bonus of 0 or 1, no weights, max 16, with the brief's level descriptors. Tie-breaks are Continuing, then Needed. **Winner gate:** a project whose average Works is 0 can't take a prize; the leaderboard shows a warning and disables its prize select (the mock also refuses it). The judge view links the [Privacy track judging guide](https://app.notion.com/p/Privacy-track-judging-guide-4023e52aeb158049acc3e80512df018d) on Notion.
- **Agentic Commerce:** Bitrefill's existing 0–2 / 0–5 / 0–5 criteria. Tie-breaks are innovation, then tech stack, as today.

Judges pick a level line per criterion and write a note. The leaderboard ranks by the average total across the judges who scored each project, and labels any tie with what broke it.

### Project display

The Bitrefill flip still works. Tracked programs (`showSubmissionsLive`) show every submission as soon as it arrives. Before results, the wide grid sits below the event info. After results are published it moves to the top, with winners grouped first. Bitrefill's page is unchanged.

**Grid and cards**
- 3 / 2 / 1 columns, with search and a track filter.
- Every card shows its next milestone (with links to anything already started, in the details). The two Ecosystem Prize cards carry a ★ ECOSYSTEM PRIZE badge and show the partner and Agree / Deliver / Share instead.

**Detail modal and winner pages**
- Each card opens a detail modal with every field. It shows no emails.
- Only winners get `/programs/:slug/projects/:id`. Any other id returns a 404, and non-winner cards have no link.

### Review notes (28 Oct, `updates-review.md`)
- **Header first.** The ·PROGRAM / TYPE header is the first block on every program page, above any project grid (Bitrefill included).
- **Anonymous entries.** A form checkbox hides the point person's and teammates' names on the public page and from judges ("Anonymous", "Teammate"). Admins still see names in the CSV (with an `anonymous` column) and the milestone and check-in panels.
- **"Next milestone".** Every user-facing "next step" now reads "next milestone" (cards, details, form, judge view, rubric text, page content, terms, CSV headers). The data field is still `nextStep` in the mock; the server column is named `next_milestone`.
- **Txid explorer link.** Does Stadium really check the txid? Not yet: in the playground the check is a mock lookup (`client/src/lib/txCheck.ts`); the real lightwalletd check is in §4. Every txid now links to `https://testnet.zcashexplorer.app/transactions/<txid>` so anyone can verify it. The seeded `MOCK-…` txids are fake, so their links 404.
- **Modal.** The project modal is inset from the viewport with a visible border at every width. (The shared dialog has the same edge-to-edge issue on phones elsewhere; logged to the backlog.)
- **Judges locked to their email.** No judge picker. A judge signed in by their email link scores only as themselves; the wallet admin gets no scoring, only progress, leaderboard, prizes and CSV. In the playground, `?judge=<email>` (the OPEN AS JUDGE links on the playground bar) stands in for the emailed link; it is ignored outside mock mode.
- **Live judges' progress.** A table at the top of the judging panel shows every judge's scored / total for their tracks (names only). It refreshes every 5 s, after each save, and on saves from other tabs.
- **Scoring view.** A sticky bar with "N / M SCORED · K IN PROGRESS", a progress fill and one numbered box per project (saved, draft, unscored, current). One project at a time, with PREV / NEXT and SAVE & NEXT (jumps to the next unscored project). The open project is remembered per judge.

### More updates (28 Oct, `updates-review.md`)
- **Leaderboard names open the project.** Clicking a project's name on the leaderboard opens the same details modal as the public cards, so a judge can recall what it was. Judges get the public view (anonymous names hidden); the wallet admin sees names. Each judge's individual scores moved to a JUDGES' SCORES ▾ toggle on the row.
- **Judging guide.** JUDGING GUIDE ▸ now points to the Privacy track judging guide on Notion.
- **Scored boxes are green.** In the scoring bar, saved projects are filled green (as is the progress fill); drafts stay dashed and unscored stay outlined.
- **About panel under the header, on every program.** ·ABOUT THIS HACKATHON (or PROGRAM) sits right under the header and is as wide as the sections below: the event thumbnail on the left; the description, date, location, schedule and the Luma link on the right. One column on phones. It replaces the old KEY INFO, DESCRIPTION and KEY DATES panels. Once results are published, the rest of the page content collapses into ·HACKATHON DETAILS below the projects.
- **Judging rubric off the public page.** The "How Privacy projects are judged" section is gone; a Builder Pack section links to the [Free Society Hack Builder Pack](https://app.notion.com/p/Free-Society-Hack-Builder-Pack-3ff3e52aeb15807eace6f16f84a74c14) instead. The content migration was regenerated.
- **One wallet signature per admin session.** Connecting the admin wallet is the only signature: it opens a 15-minute admin session that every section and every write reuses. Background refreshes (the judges' progress poll) never open the wallet. When the session has expired, the page shows ·ADMIN SESSION EXPIRED with SIGN IN AGAIN (one signature). In mock mode the signature never leaves the browser (no `/admin/session` call). Previously a failed session exchange made every call, including the 5-second poll, ask the wallet again.
- **Register through Luma on the page.** While registration is open (status `draft` or `open`) and the program has a Luma event id, the about panel's REGISTER ON LUMA ▸ opens Luma's own registration and checkout in an overlay (Luma's embed script, `embed.lu.ma/checkout-button.js`, loaded only on that page). If the script is blocked, the button is a plain link to the Luma page. Once the program is `closed` or `completed`, it becomes EVENT PAGE ▸. In the playground, switch the status to DRAFT on the admin page's ·PLAYGROUND bar, then open the public page from within the app (status changes are in memory, so a full reload resets them).
- **Judges' scores autosave to their own record.** No DISCARD DRAFT, SAVE or SAVE & NEXT: every rubric click saves at once and the note saves after a short pause, partial scores included, to the judge's record on the server (`PUT /:slug/submissions/:id/rubric-scores/:track`; the judge is the email session, never the request). A change is kept on the device until the server confirms it, and is retried when the connection returns, every 15 s, and on the next load, so a refresh or dropped Wi-Fi loses nothing. The open project is in the URL (`#p=…`), so a refresh reopens it. Only fully scored projects count as scored (green); partly scored ones are dashed (IN PROGRESS · SAVED). Buttons: ◂ PREV, NEXT TO DO ▸, NEXT ▸. The migration `20261029000000_submission_rubric_scores.sql` must be applied to Supabase before the real event.
- **Judging updates (29 Oct).**
  - **Revisit.** A judge can mark a project ⚑ TO REVISIT when unsure; its box turns light orange (a new `warn` colour token) and the bar counts "R TO REVISIT". It's the judge's own reminder: a fully scored project still counts as scored. The flag is saved in the judge's record (`revisit` on `submission_rubric_scores`). NEXT TO DO ▸ (was NEXT UNSCORED) and the TO DO ONLY filter include flagged projects.
  - **Lighter options.** Level options are light cards with 14px body text and a round number badge; the selected one gets a green border and ✓ instead of a white fill.
  - **Questions as a carousel.** One question per slide with its title and number (WORKS · 1 / 6), then a NOTE slide with the note and a summary. Swipe, ◂ BACK / NEXT QUESTION ▸, ←/→ keys, or tap a question chip. Picking a level autosaves and stays on the question (you can change it); NEXT QUESTION ▸ (solid once answered), a swipe or ← → moves on. A project opens on its first unanswered question (or the note when all are answered).
  - **Check first.** Before the questions, the carousel walks the judge through VIDEO (watch the demo), REPO (README, code matches the demo, plus the app link) and, for Privacy projects with a txid, TX (the explorer link plus Stadium's own check). Their chips sit to the left of WORKS and turn green with ✓ when checked; opening the link marks a step checked, and a toggle sets or unsets it. START SCORING ▸ moves on to WORKS. Checks are saved with the judge's score (`checks` JSONB) and don't affect scoring. A project opens on its first unchecked step until it's fully scored, then on its note.
  - **Watch the video on the screen.** The VIDEO step plays the demo inline: direct video files in a player (playing it ticks VIDEO), YouTube (incl. Shorts and youtu.be), Vimeo, Loom and Google Drive in their embed player (`client/src/lib/demoUtils.ts`; tick VIDEO with the toggle). Any other host isn't framed; the judge gets "can't play here" and the new-tab link. The player loads only while the VIDEO step is open, so moving on stops it. Playground projects use MDN's public CC0 sample clip (store key bumped to `_v4`).
- **Builder feedback and the ranked CSV (29 Oct).**
  - **Feedback is free text.** The submission form ends with one optional question, FEEDBACK FOR THE ZCASH TEAMS (OPTIONAL, NOT SCORED), with light guidance ("Say which tool, e.g. the faucet, a wallet, an SDK, a node, the docs, and what happened") and an example. The six area checkboxes are gone, so there is no tagging to explain. Stored as `details.frictionNotes`; `frictionAreas` is no longer collected (ignored if an old client sends it).
  - **·BUILDER FEEDBACK** on the admin page (was ·FRICTION REPORT): every note, newest first, with project and track; a search box (e.g. "faucet"); EXPORT CSV.
  - **EXPORT RANKED CSV** on the leaderboard (admins), one file per track: projects in leaderboard order with rank, tie-break, average and per-criterion averages, prize, Ecosystem flag, point person and links, txid check, next milestone, the builder's feedback, then every judge **by name**: total, each criterion, their note and session. The all-fields EXPORT CSV (SCORES + NOTES) stays (submission order).
- **No check-in emails (29 Oct).** Stadium doesn't email builders. The 14- and 30-day check-ins (send buttons, the answer page, still-building counts) are removed, along with that server-plan row. The Ecosystem Prize milestone's "Check in" step (Thu 19 Nov) is now a date an admin records under ·ECOSYSTEM PRIZE MILESTONES → CHECKED IN ON. The page content and placeholder terms no longer promise check-in emails (content migration regenerated).
- **Submissions end to end, with fallbacks (29 Oct).** The builder's path:
  1. **The form is saved as a draft on the device** as they type (DRAFT SAVED ON THIS DEVICE · START OVER). Closing it, a refresh or an error loses nothing; a successful submit clears it.
  2. **On Luma's checked-in list:** saved and confirmed by email (with what they submitted). No login.
  3. **Not on the list:** USE ANOTHER EMAIL or **VERIFY THIS EMAIL** (sign-in link to that address; they come back to the page with the form restored). With the email verified, the server checks the Luma feed again straight away: found → accepted; still not there → **held for a master admin** ("Received, waiting for an organiser" + an email), listed first in ·REFUSED SUBMISSIONS as ✓ EMAIL VERIFIED · WAITING FOR APPROVAL; ACCEPT keeps the original time.
  4. **Couldn't reach Stadium / check-in couldn't be verified:** the draft is kept, TRY AGAIN, and one automatic retry after 5 s.
  5. **Updating:** "Already submitted? Update my submission" → verify the email → the form loads their submission → UPDATE SUBMISSION. Resubmitting an existing email **without** verifying is refused (401, recorded), so nobody can overwrite another team's entry by typing their email.
  6. Organisers can still add an attendee by hand in Luma guests.
  - **Server:** `POST /:slug/submissions` takes an optional `x-supabase-token` (the builder's verified email); `GET /:slug/submissions/mine` (their own entry, to edit); `GET /:slug/submissions/public` (the live list: no emails, anonymous names hidden). Emails: the confirmation lists the tracked fields and how to update; a new "waiting for approval" email.
  - **Not in this slice:** the real testnet tx check (badges show NOT CHECKED YET on real data; ~1 day), awards by track / Ecosystem flag / winner pages / server leaderboard and progress (the awards slice), and a hard close at midnight ("late" stays an informational flag).
- **Refused submissions are kept (29 Oct).** Every refused submit (not on the Luma checked-in list, invalid fields, or the check-in couldn't be verified) is stored with the attempt and the exact message the builder saw (`submission_refusals`), and written to the audit log. The builder's answer is unchanged. On the admin page, ·REFUSED SUBMISSIONS lists them (REFUSED / ACCEPTED / DISMISSED / ALL, with what they submitted). **Only a master (global) admin can ACCEPT** one: the stored attempt must still pass the same validation (only the Luma gate is skipped), and the entry is created with the attempt's original time, so a 19:50 refusal accepted at 21:30 is still in the Evening batch. DISMISS marks it reviewed and keeps it. Program admins see the list read-only.
- **More checks (29 Oct): judging data integrity.** A scrutiny of the judging and submission path found and fixed:
  - **Submissions lost their tracked fields on a real server.** `validateSubmission` kept only the Bitrefill fields, so `details` (track, txid, team, next milestone…) was silently dropped. Now validated server-side (`validateSubmissionDetails`, same rules as the form, plus a 64-hex txid check the form now also has) and stored as `details` + `track`.
  - **Judges had no profile on the server.** Invites now save a judge's name and tracks (`program_admin_emails.name`, `tracks`; the EDIT modal's invite form has a name field and track checkboxes), and `GET /:slug/judges` serves them. A judge sees other judges by name only.
  - **Removing a score.** Clicking the chosen level again clears it (stored as `null`); the box follows: green (complete) → dashed (some left) → outlined (nothing left).
  - **Batches.** Every Luma-gated submission lands in a judging batch by its first submission time: **in by Wed 4 Nov 20:00 IST = Evening, after = Morning** (a resubmit keeps its batch). Same rule on the server (`server/api/constants/trackedPrograms.js`) and client (`programProfiles.batchFor`). The judge's bar groups boxes under EVENING · IN BY 20:00 / MORNING · AFTER 20:00, with ALL / EVENING / MORNING filters and the batch on the card; the session defaults to the batch being judged now.
  - **Login flash.** While the admin approves the login signature, the page now says SIGNING IN instead of briefly showing "session expired".
  - **Tests:** server 509 (44 new), including an end-to-end sim (`server/sim/__tests__/rubric-judging-journey.test.js`): invite judges with names and tracks → Luma-checked-in builders submit at 19:30 and 20:30 IST (evening / morning) → a non-guest is refused → judges autosave partial, full and cleared scores, checks and revisit → wrong track, spoofed identity and uninvited access are refused.

## 4. Server build plan (after review)

| Work | Size |
|---|---|
| Submissions: **built (29 Oct).** `program_submissions.details JSONB` + `track`, validated by `validateSubmissionDetails` (mirrors the form; 64-hex txid; server-set fields never taken from the client), stored by the Luma-gated submit; `GET /:slug/tracked-submissions` (judge/admin) with each entry's batch. Also built: the public live list `GET /:slug/submissions/public` (no emails; names hidden when `anonymous`), `GET /:slug/submissions/mine`, verified-email fallbacks and refusal review. **Still to do:** `GET /:slug/submissions/:id/public` (winners only, with the awards slice) | 0.25 day left |
| Rubric: **built (29 Oct): per-judge score storage.** `submission_rubric_scores` (criteria JSONB per `(submission_id, judge_email, track)`, partial allowed, RLS on), `program_admin_emails.tracks TEXT[]` (NULL = all tracks) passed through `requireProgramJudge`, `GET /:slug/rubric-scores/mine` and `PUT /:slug/submissions/:id/rubric-scores/:track` (email judges only; identity from the session; tracks enforced), validator + rubric config in `server/api/constants/rubrics.js`, tests. Judges: **built**, `program_admin_emails.name` + `tracks` set on invite, `GET /:slug/judges` (names and tracks; emails only to admins or the judge themselves). **Still to do:** server leaderboard with tie-breaks and the Works-0 winner gate in `awardPrize`, awards keyed by track (`prize_by_track JSONB`), | 1 day left |
| Judges' progress: `GET /:slug/judging-progress` (judge or admin; names, tracks, scored / total), polled by the panel | 0.25 day |
| Ecosystem Prize flag: `program_submissions.ecosystem_prize BOOLEAN`, global-admin PATCH capped at two podium projects in the Privacy track, in the public results and CSV | 0.25 day |
| Milestone columns on the submission (or a `submission_milestones` table, incl. `checked_in_at` set by the admin), with the admin PATCH under `requireProgramAdmin` and the builder PATCH under an email magic-link session matched to `luma_email` | 1 day |
| **Testnet tx check:** service calling a public lightwalletd (`testnet.zec.rocks`) `GetTransaction`, parsing the Orchard action count, with retry/backoff, `tx_check JSONB` cache, `could_not_check` on timeouts, run fire-and-forget after submit, plus an admin re-check endpoint and tests | 1 day |
| **Builder feedback:** server CSV of the free-text feedback (mostly done once `details` exists) | 0.25 day |
| Server CSV with per-judge scores, notes and track | 0.5 day |

The tx check and builder-feedback CSV are each about a day or less, so none needs a separate go-ahead under the brief's rule. What's left on the server is about 5 days (tx check, awards and leaderboard, milestones, CSVs). See §5.

## 5. Decisions you need to make

1. **Scope for 4 Nov.** The mock UX is ready to review, but the server side is about 7 days. Options:
   - **(a) Run the event on the existing Bitrefill flow plus a minimum server slice.** That slice is about 2.5 days: submission `details`, track, the public live list, rubric scores and track-limited judges. The tx check and milestones follow in November, before the 13 Nov milestone deadline.
   - **(b) Slip the merge-by date.**

   I recommend (a).
2. **Terms.** Paste the 14 Oct Luma text to replace the placeholder.
3. ~~Themes~~ Resolved 28 Oct: 1. Private payment rails · 2. The first five minutes · 3. Privacy beyond the transaction.
4. **Default prize tiers.** Changing the neutral default needs a check of the prod Bitrefill row's `prize_tiers` first.

## 6. Ready for the real event (once the server slice is merged)

**Merge by Wed 28 Oct**, when the builder pack goes out.

1. On `/admin`, connect a global admin wallet and click CREATE PROGRAM.
   - Name `Free Society Hack`, slug `free-society-hack-2026`, type `hackathon`, status `draft`.
   - Location `Capital Social, BKC, Mumbai`.
   - Event `2026-11-04 11:00` to `2026-11-05 00:00` IST. Applications `12–30 Oct`. Max applicants 75.
   - Event URL `https://luma.com/freesocietyhackathon`.
2. Edit the program:
   - Set the cover image URL to `/fsh-cover.webp` (a 1200px, 165 KB WebP in `client/public`, made from the 13.5 MB Luma PNG). Don't link the raw Luma upload: it is 4000×4000 and stalls halfway on slow connections.
   - Enter the 7 prize tiers exactly as in the brief, in USD (no Ecosystem tier: it is a flag).
3. Apply `supabase/migrations/20261029000000_tracked_judging.sql` (submission details, judge profiles, rubric scores) and `20261030000000_submission_refusals.sql` (refused submissions), then run `supabase/migrations/20261026000000_free_society_hack_2026_content.sql` to load the page content.
4. In Luma guests, set the event id `evt-B6kmWqZYUUeTkIP` and click SYNC NOW. This needs `LUMA_API_KEY` on Railway. The same id drives the page's REGISTER ON LUMA button.
5. Judges: in the EDIT modal, invite the 5 Privacy judges with their **name** and track PRIVACY, and the 2 Bitrefill judges with track AGENTIC COMMERCE. Name and tracks are saved with the invite and enforced on every score.
6. Dry run on 3 Nov: set `SUBMIT_TEST_EMAILS` to your address, submit a test, check the page and judging, then delete the test submission and clear the variable.
7. **Wed 4 Nov 11:00 IST:** set status `open` by hand.
8. **Wed 4 Nov 20:00:** evening judging.
9. **Thu 5 Nov 00:00:** set status `closed` by hand. Scoring still works when closed.
10. **Thu 5 Nov 08:00:** morning judging.
11. **10:30:** export the CSV for the line-up.
12. **13:00:** award the five Privacy podium prizes (a Works-0 project is blocked), flag two of them for the Ecosystem Prize, then PUBLISH RESULTS.
13. Set status `completed` after demo day.
14. **Thu 19 Nov:** check in with the two Ecosystem Prize projects (outside Stadium) and record the date under ·ECOSYSTEM PRIZE MILESTONES → CHECKED IN ON.
15. **By Fri 11 Dec:** record the milestone outcomes and release the payouts.
16. **Fri 20 Nov:** export the builder feedback CSV (·BUILDER FEEDBACK → EXPORT CSV) for the grant committee.
