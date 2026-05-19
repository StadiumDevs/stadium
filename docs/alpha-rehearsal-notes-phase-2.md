# Alpha rehearsal notes — Phase 2: the loop closes

*Spec: `docs/stadium-revamp-phase-2-spec.md` §5 Issue 6, §12 Block E. Gate: Block E.*

> **Status: provisional template (rehearsal not yet run).**
>
> As of 2026-05-19, the Phase 2 rehearsal has not been executed against
> production. This file is the structured template the rehearsal driver fills
> in verbatim once the pre-conditions below are met. It mirrors the Phase 1
> template (`docs/alpha-rehearsal-notes.md`).
>
> The rehearsal is **operational and human-gated** — it cannot be run by an
> agent. It needs a production deploy, a configured email provider, a real
> inbox, and a person walking the flow. See *Pre-conditions* for the full
> blocker list.
>
> When the real rehearsal runs, fill the empty **Observed** / **Friction**
> fields verbatim. If observed friction reveals a structural gap (emails
> systematically lost, focus-refetch not firing on mobile, etc.), **stop and
> flag back** rather than patching mid-cycle — Phase 3 priorities depend on an
> honest signal here.

This is the end-to-end walk of Plata Mia's journey **with the notification loop
closed**: she opts in to email, an admin accepts her application, the email
lands, her status badge updates on focus without a manual reload, and she opts
back out. Run by a WebZero team member posing as Plata Mia against real data on
the production Stadium instance. Capture friction verbatim — copy tone, the gap
between Accept and email arrival, whether the badge update actually feels
"alive". This file is raw input to the Phase 2 retro, not a polished deliverable.

---

## Pre-conditions

- [ ] P2-01..P2-05 all merged to `develop` (#67, #68, #69, #70 merged; **#71 / PR #78 still open as of 2026-05-19**).
- [ ] `develop` merged into `main`.
- [ ] Railway production redeployed with the Phase 2 server code. Confirm `GET https://stadium-production-996a.up.railway.app/api/wallet-contacts/<any-address>` returns `{ status: 'success', data: { email_set, notifications_enabled } }`.
- [ ] Vercel production redeployed with the Phase 2 client code. Confirm the Notifications card renders on a project Overview tab for a connected team member.
- [ ] Supabase production migrations applied: `wallet_contacts`, `notifications`.
- [ ] `RESEND_API_KEY` + `RESEND_FROM_EMAIL` set on the Railway **production** environment.
- [ ] The Resend from-domain has **DKIM + SPF** configured and green in the Resend dashboard.
- [ ] Pre-flight deliverability check: send a test email to `alexander.lansky@gmail.com` and confirm it lands in the inbox (not spam) before the rehearsal proper.
- [ ] Plata Mia's project on prod (`/m2-program/plata-mia-15ac43`) has at least one team member whose wallet the rehearsal driver can sign with.
- [ ] (Phase 1 pre-condition) Plata Mia has an existing application to Dogfooding 2026 in `submitted` state.

## Rehearsal logistics

- **Rehearsal date**: _TBD_ (target: by ~7 June 2026 — must complete before admins start accepting real Dogfooding applications; applications close ~30 May, event is 13–19 June 2026).
- **Rehearsal driver**: _TBD_ (WebZero team member with a test wallet on the Plata Mia `team_members` list, and access to the inbox for the email they will enter).
- **Admin operator**: _TBD_ (WebZero team member with an admin wallet, runs Step 3).
- **Observer**: _TBD_ (takes notes, runs the timer in Step 4).
- **Environment**: production (`https://stadium.joinwebzero.com`). Do **not** rehearse on a Vercel preview — preview is mock mode and does not send real email or sign real SIWS.

---

## Step 1 — Pre-condition: she has already applied

Scenario: Plata Mia applied to Dogfooding 2026 during Phase 1. Her application is
in `submitted` state.

**Target behaviour**: on `/m2-program/plata-mia-15ac43` Overview, the Programs
section lists Dogfooding 2026 with status = `submitted`.

**Observed**:
- Is the existing application still showing `submitted` before the rehearsal starts?
- Anything stale or surprising about the project page on first load?

**Friction**:
- _Free text_

---

## Step 2 — She opts in to email notifications

Scenario: she wants Stadium to email her when something changes on her project.

**Target behaviour**: on the Overview tab she finds the **Notifications** card
(visible because she is a connected team member). Empty state copy invites her in
("Want an email when something changes? Drop your address."). She enters her
email, leaves "Notify me about this project" toggled on, clicks Save, signs the
SIWS message (statement: *"Update notification preferences for wallet on
Stadium"*). The card flips to a confirmation state ("You'll get email about this
project") and a toast confirms.

**Observed**:
- Was the Notifications card discoverable on the Overview tab, or did she scroll past it?
- Empty-state copy — did it feel inviting or like a form?
- Was the SIWS statement clear about what she was signing?
- After save, did the card flip to confirmation without a reload?

**Friction**:
- _Free text_

---

## Step 3 — Admin accepts her application

Scenario: a WebZero admin processes the Dogfooding queue.

**Target behaviour**: admin opens `/admin/programs/dogfooding-2026-berlin`,
clicks **Load / refresh**, sees Plata Mia's application with status `submitted`,
clicks **Accept**. The status updates in place; the application moves to the
`accepted` filter.

**Observed**:
- Did the admin reach the queue without consulting a developer?
- Did Accept update the status visibly without a reload?

**Friction**:
- _Free text_

---

## Step 4 — The email arrives

Scenario: the moment after the admin clicks Accept.

**Target behaviour**: within ~1 minute, an `application_accepted` email arrives
in Plata Mia's inbox — **inbox, not spam** — with editorial, human copy ("You're
in — Dogfooding 2026"), naming her project and linking to her project page.

**Observed**:
- **Timer**: gap between the admin's Accept click and the email landing. _____ seconds. (If > 2 minutes, log as friction.)
- Inbox or spam folder?
- Does the email copy read like a human wrote it?
- Does the link in the email go to the right place?

**Friction**:
- _Free text_

---

## Step 5 — The badge updates on focus, without a reload

Scenario: before Step 3, she had left her project page open in a background tab.
After the email lands, she switches back to that tab.

**Target behaviour**: on focus, the Programs section on her Overview tab
re-fetches and her badge for Dogfooding 2026 now reads `accepted` — **without her
clicking reload**. (A manual Refresh button next to the badge is also available.)

**Observed**:
- **Count the manual reloads** between Accept and seeing `accepted`. Target: zero.
- Did the badge update feel "alive", or did she instinctively reload anyway?
- Did focus-refetch fire on mobile, if tested there?

**Friction**:
- _Free text_

---

## Step 6 — She opts back out

Scenario: she decides she does not want further emails.

**Target behaviour**: on the Notifications card she switches "Notify me about
this project" off, signs SIWS. She refreshes the page and confirms the toggle is
still off (`notifications_enabled = false` persisted).

**Observed**:
- Was the opt-out toggle easy to find from the confirmation state?
- After refresh, did the off state persist?

**Friction**:
- _Free text_

---

## Retrospective

After the rehearsal, capture:

### Did the loop feel alive?

- _Free text_ — the core question Phase 2 exists to answer: between the admin's
  Accept and Plata Mia knowing, did it feel immediate and trustworthy?

### What surprised us

- _Free text_

### What took longer than expected

- _Free text_

### What the alpha user wanted that we hadn't anticipated

- _Free text_ (most valuable section — direct input to Phase 3.)

### Things we would fix before the real Dogfooding cohort

- _Free text_ (every item here becomes a Phase 2.1 issue.)

### Things we would defer to Phase 3

- _Free text_ (every item here is a Phase 3 spec candidate.)

---

*Rehearsal complete on [DATE] by [DRIVER] / [ADMIN] / [OBSERVER]. Retro held on
[DATE]. Phase 3 spec seeded from this file on [DATE].*
