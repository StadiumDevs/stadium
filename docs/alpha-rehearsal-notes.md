# Alpha rehearsal notes — Dogfooding 2026

*Spec: `docs/stadium-revamp-phase-1-spec.md` §5 Issue 13. Gate: Block G.*

The end-to-end walk of Plata Mia's journey, run by a WebZero team member posing as Plata Mia against real data on the production Stadium instance. Capture friction verbatim — copy tone, empty-state feel, modal friction, any "huh, I didn't expect that" moment. This file is the raw input to the Phase 1 retro, not a polished deliverable.

---

## Pre-conditions

- [ ] `develop` merged into `main` (PR #60 or equivalent).
- [ ] Railway has redeployed with Phase 1 server code. Confirm `GET https://stadium-production-996a.up.railway.app/api/programs` returns `{ programs: [...] }`.
- [ ] Vercel production has redeployed with Phase 1 client code. Confirm `https://stadium.joinwebzero.com/programs` renders (not 404).
- [ ] 4 Supabase migrations applied to prod (programs, project_updates, project_funding_signals, program_applications). *Done 2026-04-22.*
- [ ] `node server/scripts/seed-dogfooding-program.js` run against prod Supabase.
- [ ] `#27` resolved — Plata Mia's bountyPrize row split into three discrete bounties. *Shipped via PR #50.*
- [ ] `#28` resolved — symbiosis-2025 bounty reconciliation applied. *Shipped via PR #51.*
- [ ] Plata Mia's project visible at `https://stadium.joinwebzero.com/m2-program/plata-mia-15ac43` with clean data shape.

## Rehearsal logistics

- **Rehearsal date**: _TBD_ (target: ~23 May 2026, ~3 weeks before Dogfooding event).
- **Rehearsal driver**: _TBD_ (WebZero team member with a test wallet on the Plata Mia team_members list).
- **Observer**: _TBD_ (takes notes).
- **Environment**: production (`https://stadium.joinwebzero.com`). Do not rehearse on preview — preview is mock mode and doesn't actually sign.

---

## Step 1 — Log in

Scenario: driver arrives at the home page cold, with a fresh browser profile. Wallet extension is installed with the Plata Mia team wallet.

**Target behaviour**: driver sees a Stadium landing page, clicks "Connect Wallet" in the nav, signs a SIWS message, is returned to the home page with the wallet state visible.

**Observed**:
- Where was the "Connect Wallet" affordance? (nav, CTA button, somewhere else?)
- Was the SIWS message clear about what she was signing?
- Did anything break?

**Friction**:
- _Free text_

---

## Step 2 — Find her project

Scenario: once logged in, driver wants to get to her own project to post an update.

**Target behaviour**: driver finds her project card on `/m2-program` or via search, clicks through to `/m2-program/plata-mia-15ac43`.

**Observed**:
- Is the project discoverable without typing the slug? (status filter, search, recent activity?)
- Does the project page header feel like "her" project — i.e. does she see her team members, her repo link, her payout history?
- Is the "these are my projects" affordance obvious for a connected team member? (spec does not deliver this in Phase 1 — note if she expected it.)

**Friction**:
- _Free text_

---

## Step 3 — Post her first update

Scenario: she clicks into the Updates tab and posts what her team shipped this week.

**Target behaviour**: Updates tab visible alongside Overview / Milestones / Team & Payments. She clicks "Post update", writes 1–2 sentences, pastes a link to the v2 release, signs SIWS, sees her update appear at the top of the list.

**Observed**:
- Was the Updates tab discoverable? (spec §5 noted the `grid-cols-4` risk — confirm the tab strip is not visually broken.)
- Empty-state copy before she posts — does it invite her in?
- Modal copy — does "Post an update" feel like the right primitive, or is there friction around "is this a blog post? a changelog? a status ping?"
- Did the SIWS prompt show her the right statement? (Should be: *"Post an update to Plata Mia on Stadium"*.)
- After posting, did the update render immediately without a page reload?

**Friction**:
- _Free text_

---

## Step 4 — Flag that she's looking for a grant

Scenario: she wants Stadium to reflect that her team is applying for the W3F grant next month.

**Target behaviour**: on the Overview tab, she finds a "Funding signal" affordance, toggles "Actively seeking funding", picks type = grant, adds a short description. Signs SIWS. A "Looking for a grant · $30k–60k" badge appears on her Overview.

**Observed**:
- Is the funding-signal affordance discoverable on the Overview tab? (Expected as an edit button near the funding-signal badge area.)
- Modal copy — does it feel like a natural extension of her project page, or does it feel like a separate form?
- SIWS statement: *"Update funding signal for Plata Mia on Stadium"*.
- Badge appears on Overview after save.
- Does the badge surface feel appropriately "soft" — a signal, not a pitch?

**Friction**:
- _Free text_

---

## Step 5 — Discover the Dogfooding program

Scenario: she notices Stadium has a new "Programs" nav item and clicks it.

**Target behaviour**: she lands on `/programs`, sees Dogfooding 2026 as an open program card, clicks through to `/programs/dogfooding-2026-berlin`.

**Observed**:
- Is "Programs" in the top nav visible? (Expected between `M2 Program` and `Admin`.)
- Card copy — is "a week in Berlin for past WebZero winners…" compelling, or too terse?
- Dates / location visible on the card without having to click in?
- On the detail page, does the "Apply" CTA feel prominent without being pushy?

**Friction**:
- _Free text_

---

## Step 6 — Apply with her project

Scenario: she clicks Apply, the modal pre-fills with her project, she writes what she wants feedback on, signs, and gets an application receipt.

**Target behaviour**: modal titled "Apply to Dogfooding 2026" opens. Project selector defaults to Plata Mia (latest). `feedback_focus` textarea asks "What do you want feedback on?". She writes 2–3 sentences. Clicks Submit. Signs SIWS (statement: *"Apply project Plata Mia to program Dogfooding 2026 on Stadium"*). Toast confirms application submitted. The Apply CTA is replaced with a "submitted" indicator.

**Observed**:
- Project selector: if she has only 1 project, does the selector still render (spec §5 Issue 9 says yes, for consistency)?
- If she has >1 project, is the default the most-recently-updated?
- `feedback_focus` max-length (500) — does the character counter feel constraining at her natural length?
- Inline validation — if she submits empty, does she see the error beside the field (not only in a toast)?
- Post-submit state: does the "Applied" indicator make her feel the action landed, or does she wonder if she has to do anything else?

**Friction**:
- _Free text_

---

## Step 7 — Verify the loop closes

Scenario: she navigates back to her project page to confirm Stadium knows she applied.

**Target behaviour**: on `/m2-program/plata-mia-15ac43` Overview, a "Programs" section lists Dogfooding 2026 with status = submitted, linked by real anchor back to the program page.

**Observed**:
- Is the Programs section visible on Overview? (Should auto-hide when empty; should render when >=1 application exists.)
- Right-click → open in new tab on the program link works?
- Status badge reads "submitted" clearly?

**Friction**:
- _Free text_

---

## Step 8 — Admin processes the application

Scenario: an admin logs in, navigates to the Dogfooding program in `/admin`, sees Plata Mia's application in the queue, clicks Accept.

**Target behaviour**: admin at `/admin/programs/dogfooding-2026-berlin` sees Plata Mia's application card with her `feedback_focus` text. Clicks Accept. Status updates visibly without a page reload. No notification is sent (notifications are Phase 2+).

**Observed**:
- Is the admin program detail page reachable from the admin landing? (Click a program row.)
- Application card shows: project name (link back to project page), applying team member (wallet truncated), `feedback_focus`, submitted timestamp.
- Accept button updates status in place without reload.
- Filter chips (submitted / accepted / rejected) behave as expected.

**Friction**:
- _Free text_

---

## Retrospective

After the rehearsal, capture:

### What surprised us

- _Free text_

### What took longer than expected

- _Free text_

### What features did the alpha user want that we hadn't anticipated

- _Free text_ (this is the most valuable section — it is the direct input to Phase 2.)

### Things we would fix before inviting the real alpha cohort

- _Free text_ (every item here becomes a Phase 1.1 issue.)

### Things we would defer to Phase 2

- _Free text_ (every item here is a Phase 2 spec candidate.)

---

*Rehearsal complete on [DATE] by [DRIVER] / [OBSERVER]. Retro held on [DATE]. Phase 2 spec seeded from this file on [DATE].*
