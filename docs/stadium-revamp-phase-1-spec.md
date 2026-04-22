# Stadium Revamp — Phase 1 Spec

*Version 0.1 — draft for team discussion. Author: strategy session with Claude, April 2026.*

This is the plan for the first shippable slice of the Stadium revamp. It is deliberately narrow. It captures the architectural vision we landed on in the strategy conversation, but defers anything not required for the one user journey we want to validate with alpha users first.

Once this phase ships and real builders use it, what we learn will inform Phase 2. Do not try to pre-plan Phase 2 from this document.

---

## 1. The target journey

The single journey this phase exists to deliver, stated the way the spec should always come back to:

> **Plata Mia** — a past sub0 hackathon winner whose project is already in Stadium — **logs in, posts an update on their project, flags that they're looking for a grant, sees the open Dogfooding program, and applies to it with their existing project in one action.**

Every issue in this phase exists to enable that journey. Any feature, schema change, or UI work that does not directly serve it goes into Phase 2.

## 2. What this phase builds, in plain English

Four new capabilities, tied together by one UX surface.

**A program abstraction that isn't M2.** Today, Stadium knows about hackathons (embedded on projects) and the M2 incubator (assumed, hardcoded in routes and column prefixes). Dogfooding does not exist in the data model. We introduce a lightweight `programs` table that can hold Dogfooding, Pitch Off, M2, and whatever comes next. The existing M2 state stays where it is — we are not renaming columns in this phase.

**Project updates.** Teams can post updates on their project ("we shipped v2", "we joined Y accelerator", "we're now building on Z chain"). Each update is a timestamped entry with a short body. Updates are visible on the project detail page and in the admin surface. Nothing more — no reactions, no comments, no notifications.

**Looking-for-funding flag.** A project can declare it's looking for a grant, at what stage, with a short description. This is a lean single-field toggle with metadata, not a bounty marketplace. The partner side of this (who sees it, how it gets matched) is out of scope. What matters is that builders can declare it so it's captured.

**Self-serve program application.** A team member can apply their existing project to an open program from inside Stadium. The application pulls most fields from the project automatically — the team does not re-enter what's already on record. Admins see applications in a queue and accept/reject them.

**The UX glue.** The project detail page grows a new section showing "programs this project is in / has applied to" and an apply-to-a-program CTA that actually works. The home page gains a programs surface showing what's currently open.

## 3. Architectural decisions, and things we are deliberately not doing

### 3.1 What we are doing

- **New `programs` table.** Light schema (see §4). Covers current and future program types.
- **New `program_applications` table.** Joins projects to programs. Has status, submitted fields, admin decision state.
- **New `project_updates` table.** 1:N from projects. Text body, author, timestamp, optional link.
- **New `project_funding_signals` table** (name up for debate). 1:1 with projects initially, but a table not a column, so we can later track changes over time without another migration. Holds the looking-for-funding flag and metadata.
- **New `programs` admin surface** so an admin can create a Dogfooding program and see applications to it.
- **New `/programs` public route** listing open programs.
- **Minimal builder-facing surface** on existing project detail pages: "post update" button (gated to team members), "looking for funding" edit control, "apply to program" CTA.

### 3.2 What we are deliberately not doing in this phase

- **We are not renaming the `m2_*` columns or promoting `hackathon_*` out of the projects row.** Both are tempting clean-ups. Both are three-place changes (SQL + `project.repository.js` + Mongoose model) with zero user-visible improvement. Risk without payoff during alpha. They can happen in Phase 2 or later.
- **We are not introducing a `builders` table.** Dogfooding is project-keyed; Pitch Off (which needs builders) is a Phase 2 feature. Wallet addresses in `team_members` remain the implicit identity layer.
- **We are not building polymorphic participations.** Current hackathon + M2 state stays where it is (embedded on projects). Dogfooding applications go through the new `program_applications` table. If Pitch Off later needs a different participation shape, we decide then.
- **We are not building partner-scoped admin access.** All programs are owned by WebZero in this phase. Partners still interact with WebZero directly. We add an `owner` column to `programs` with a fixed `"webzero"` value — so the column exists for later, without anyone building UI around it.
- **We are not building mentor entities, discovery surfaces, notifications, or a bounty marketplace.** All Phase 2+.
- **We are not touching the payout / multisig plumbing.** M2 payments remain untouched. Dogfooding does not have payouts (it's structured feedback, not funding).
- **We are not building a program_participations polymorphic junction.** If Phase 2 needs it, we migrate then. Premature polymorphism is the single easiest way to blow up this phase's scope.

### 3.3 The guiding principle

**Small, additive, reversible.** Every change is a new table or a new route, not a rewrite. The existing M2 path keeps working untouched. If Phase 1 fails to resonate with alpha users, we can walk it back with a few drop-tables and removed routes — nothing in the existing app breaks.

## 4. Schema additions

All new. No renames, no destructive migrations.

### 4.1 `programs`

```sql
CREATE TABLE programs (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  slug                  TEXT NOT NULL UNIQUE,
  program_type          TEXT NOT NULL CHECK (program_type IN ('dogfooding', 'pitch_off', 'hackathon', 'm2_incubator')),
  description           TEXT,
  status                TEXT NOT NULL CHECK (status IN ('draft', 'open', 'closed', 'completed')),
  owner                 TEXT NOT NULL DEFAULT 'webzero',
  applications_open_at  TIMESTAMPTZ,
  applications_close_at TIMESTAMPTZ,
  event_starts_at       TIMESTAMPTZ,
  event_ends_at         TIMESTAMPTZ,
  location              TEXT,
  max_applicants        INTEGER,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_programs_status ON programs(status);
CREATE INDEX idx_programs_type ON programs(program_type);
```

Notes:
- `program_type` is an enum at DB level. `'m2_incubator'` and `'hackathon'` are included so we can later backfill historical programs without changing the schema, but we do not touch historical data in this phase.
- `owner` is reserved for Phase 2+ partner programs. Always `'webzero'` for now.
- `max_applicants` is nullable — most programs are uncapped.

### 4.2 `program_applications`

```sql
CREATE TABLE program_applications (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id             TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  project_id             TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status                 TEXT NOT NULL CHECK (status IN ('submitted', 'accepted', 'rejected', 'withdrawn')),
  application_fields     JSONB NOT NULL DEFAULT '{}',
  submitted_by           TEXT NOT NULL,
  submitted_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by            TEXT,
  reviewed_at            TIMESTAMPTZ,
  review_notes           TEXT,
  UNIQUE (program_id, project_id)
);

CREATE INDEX idx_applications_program ON program_applications(program_id);
CREATE INDEX idx_applications_project ON program_applications(project_id);
CREATE INDEX idx_applications_status ON program_applications(status);
```

Notes:
- `application_fields` JSONB holds program-type-specific fields (e.g. Dogfooding asks "what do you want feedback on"). Keeping this JSONB means we don't need a new table per program type.
- `UNIQUE (program_id, project_id)` — a project can only apply once to a given program. If they want to re-apply they must withdraw first.

### 4.3 `project_updates`

```sql
CREATE TABLE project_updates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  body          TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  link_url      TEXT,
  created_by    TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_updates_project ON project_updates(project_id, created_at DESC);
```

Notes:
- Immutable. No edit, no delete, no comments, no reactions. A team member who wants to correct an update posts another one.
- `link_url` is optional but validated the same way other URLs are validated server-side.

### 4.4 `project_funding_signals`

```sql
CREATE TABLE project_funding_signals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  is_seeking    BOOLEAN NOT NULL DEFAULT FALSE,
  funding_type  TEXT CHECK (funding_type IN ('grant', 'bounty', 'pre_seed', 'seed', 'other')),
  amount_range  TEXT,
  description   TEXT CHECK (length(description) <= 500),
  updated_by    TEXT NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id)
);
```

Notes:
- One row per project. Updated in place.
- `amount_range` is a free text field initially (e.g. "10k–50k USD"). We can enumerate later if a clear pattern emerges.

## 5. The shippable issues

Thirteen issues. Each one is small enough to go through the ship-issue loop end-to-end. They are ordered such that each issue leaves the app in a deployable state — the app works after every single one, even though the full journey isn't wired up until the end.

Each issue below has: a title, a summary, the files the implementer should touch (best-guess — `stadium-explorer` will confirm), test scenarios that the `stadium-tester` can verify, and — where applicable — a **verification blocker** note if the Playwright loop can't verify it.

### Issue 1 — Introduce `programs` table + read-only admin list

**Summary.** Create the `programs` SQL migration. Add a repository (`program.repository.js`) with a `list()` method. Add GET `/api/programs` returning all programs (public, no auth). Add an admin-side UI block at `/admin` that lists all programs read-only. No create/edit flow yet.

**Files (best-guess).** `supabase/migrations/<timestamp>_create_programs.sql`, `server/api/repositories/program.repository.js` (new), `server/api/services/program.service.js` (new), `server/api/controllers/program.controller.js` (new), `server/api/routes/program.routes.js` (new), `client/src/lib/api.ts`, `client/src/pages/AdminPage.tsx`, `client/src/components/admin/ProgramsTable.tsx` (new).

**Test scenarios.**
- On `/admin`, an admin sees a "Programs" section with a table (possibly empty) and no JS errors.
- On `/api/programs`, a GET returns `200` with `{ programs: [] }` when the table is empty.
- On `/api/programs`, after a program is seeded via SQL, a GET returns that program's name and status.

**Verification notes.** The admin-side list is SIWS-gated. **Playwright blocker** — the tester runs in mock mode without a wallet. Verify via (a) an extension to mock mode: seed one Dogfooding program into the mock fixtures and assert the admin table renders it when `VITE_USE_MOCK_DATA=true`, and (b) a manual check with a real wallet against a local dev server before PR merge.

---

### Issue 2 — Seed a Dogfooding program manually + list it publicly

**Summary.** Add a `seed-dogfooding-program.js` script under `server/scripts/` that inserts one Dogfooding program with realistic metadata (applications_open_at = now, applications_close_at = 30 days from now, status = `'open'`). Add a GET `/api/programs?status=open` filter. Add a public `/programs` route on the client that renders open programs as cards. Link to it from the top nav.

**Current state (audit 2026-04-22).** `/programs` currently 404s (no redirect to replace). Top nav today contains `Stadium / Home / M2 Program / Admin` — insert the new `Programs` link between `M2 Program` and `Admin`.

**Implementation convention — anchors.** The new `ProgramCard` must use real `<a href="/programs/:slug">` anchors so cards support right-click-open-in-new-tab and are shareable. Do **not** follow the existing `/m2-program` card pattern (`div[role="button"]` with click handler) — that pattern is a known regression tracked on the backlog; new surfaces use real anchors even though existing ones don't.

**Files.** `server/scripts/seed-dogfooding-program.js` (new), `server/api/repositories/program.repository.js`, `server/api/controllers/program.controller.js`, `client/src/pages/ProgramsPage.tsx` (new), `client/src/components/ProgramCard.tsx` (new), `client/src/App.tsx` (route), `client/src/components/Navigation.tsx` (or wherever the top nav lives).

**Test scenarios.**
- On `/programs`, a visitor sees at least one program card when one is seeded, with the program name, type, and description visible.
- On `/programs`, clicking a program card opens the program detail (route added in Issue 3).
- On `/`, the main navigation has a visible "Programs" link that goes to `/programs`.

**Verification notes.** Fully testable through the Playwright + mock-mode path. Add the Dogfooding program to the mock fixtures so preview URLs show it.

---

### Issue 3 — Public program detail page

**Summary.** New route `/programs/:slug`. Shows program name, description, dates, location, status, and an "Apply" CTA that is disabled and labelled "Sign in with wallet to apply" when the user is not authenticated. (Actual apply flow comes in Issue 8.)

**Files.** `client/src/pages/ProgramDetailPage.tsx` (new), `client/src/App.tsx`, `server/api/controllers/program.controller.js` (GET `/api/programs/:slug`), `server/api/repositories/program.repository.js` (findBySlug).

**Test scenarios.**
- On `/programs/dogfooding-<slug>`, the page shows the program's name, description, and dates.
- On `/programs/nonexistent-slug`, the page shows a not-found state.
- On `/programs/dogfooding-<slug>`, an un-authenticated visitor sees the "Apply" button in a disabled state with wallet-connect messaging.

---

### Issue 4 — Project updates: data model + server API

**Summary.** Create the `project_updates` migration. Add `project-update.repository.js`. Add POST `/api/m2-program/:id/updates` (wallet-gated via `requireTeamMemberOrAdmin`) and GET `/api/m2-program/:id/updates` (public). No UI yet — this issue ships schema + API only.

**Files.** `supabase/migrations/<timestamp>_create_project_updates.sql`, `server/api/repositories/project-update.repository.js` (new), `server/api/services/project-update.service.js` (new), `server/api/controllers/project.controller.js` (extend), `server/api/routes/m2-program.routes.js` (extend), `server/api/utils/validation.js` (add update body validator).

**Test scenarios.**
- On `/api/m2-program/<existing-project-id>/updates`, a public GET returns `200` with `{ updates: [] }` initially.
- On `/api/m2-program/<existing-project-id>/updates`, after inserting a row via SQL, the public GET returns that row.

**Verification notes.** POST is SIWS-gated. **Playwright blocker** — the tester cannot exercise POST flows. Verify with server unit tests (validation, auth rejection, happy path) and a manual SIWS flow before merge. A full end-to-end test has to wait for the "SIWS test-wallet harness" tactical backlog item to land.

---

### Issue 5 — Project updates: UI read surface

**Summary.** On `ProjectDetailsPage`, add a new "Updates" tab alongside Overview / Milestones / Team & Payments. For a project with no updates, show an empty state. For a project with updates, show them reverse-chronologically with author, timestamp, body, and optional link.

**Implementation note (audit 2026-04-22).** The existing `TabsList` on `ProjectDetailsPage` is styled with `class="… grid w-full grid-cols-3"`. Update the grid to `grid-cols-4` (or switch to `flex`) when adding the Updates tab — the column count is hardcoded at the callsite, not inferred from the children. One-line diff, but easy to miss.

**Files.** `client/src/pages/ProjectDetailsPage.tsx`, `client/src/components/project/ProjectUpdatesTab.tsx` (new), `client/src/lib/api.ts` (fetch updates).

**Test scenarios.**
- On `/m2-program/<project-id>`, an "Updates" tab is visible alongside the existing tabs.
- On `/m2-program/<project-id-with-no-updates>`, clicking the Updates tab shows an empty state with appropriate copy.
- On `/m2-program/<project-id-with-seeded-updates>`, clicking the Updates tab shows the updates reverse-chronologically with body text visible.

**Verification notes.** Fully testable through Playwright against mock fixtures. Add a project with seeded updates to the mock data.

---

### Issue 6 — Project updates: UI write surface (team members only)

**Summary.** When a connected wallet is a team member of the project, the Updates tab shows a "Post update" button that opens a modal with a body field (max 2000 chars) and an optional link. Submitting triggers a SIWS signature and POSTs to the API. New update appears at the top of the list.

**Files.** `client/src/components/project/ProjectUpdatesTab.tsx`, `client/src/components/project/PostUpdateModal.tsx` (new), `client/src/lib/api.ts`, `client/src/lib/siws.ts` (extend statement list).

**Test scenarios.**
- On `/m2-program/<project-id>`, an un-authenticated visitor does NOT see a "Post update" button.
- On `/m2-program/<project-id>`, a visitor whose wallet is a team member sees a "Post update" button.
- On `/m2-program/<project-id>` after a team member posts an update, the update appears at the top of the list without a page reload.

**Verification notes.** Scenarios 2 and 3 are **Playwright blockers** — they require SIWS signing. Scenario 1 is testable. For 2 and 3, the `stadium-tester` can be extended to check visibility in mock mode (where the mock auth flag can pretend a given wallet is connected), but the actual POST signed flow is manual. Recommend: manual SIWS check before PR merge, plus a server unit test for the POST endpoint's auth behaviour.

---

### Issue 7 — Funding signal: data model, API, and UI

**Summary.** Create the `project_funding_signals` migration. Add GET `/api/m2-program/:id/funding-signal` (public) and PATCH `/api/m2-program/:id/funding-signal` (team-or-admin gated). Add UI to the Overview tab: a small "Looking for: [type] — [description]" badge visible when `is_seeking = true`, and an edit affordance (modal) for team members.

**Files.** `supabase/migrations/<timestamp>_create_project_funding_signals.sql`, `server/api/repositories/funding-signal.repository.js` (new), `server/api/services/funding-signal.service.js` (new), `server/api/controllers/project.controller.js` (extend), `server/api/routes/m2-program.routes.js` (extend), `client/src/pages/ProjectDetailsPage.tsx`, `client/src/components/project/FundingSignalBadge.tsx` (new), `client/src/components/project/EditFundingSignalModal.tsx` (new), `client/src/lib/api.ts`.

**Test scenarios.**
- On `/m2-program/<project-id-with-seeking-true>`, the project overview shows a visible "Looking for [type]" badge.
- On `/m2-program/<project-id-with-seeking-false>`, no funding signal badge is shown.
- On `/api/m2-program/<project-id>/funding-signal`, a public GET returns the current signal.

**Verification notes.** Read-side is Playwright-testable against mock fixtures. Write-side (the edit modal) is SIWS-gated — same blocker as Issue 6, same mitigation.

---

### Issue 8 — Program application: data model + API

**Summary.** Create the `program_applications` migration. Add `program-application.repository.js`. Add POST `/api/programs/:slug/applications` (team-or-admin gated, body includes `project_id` and `application_fields` JSON). Add GET `/api/programs/:slug/applications` (admin only). Add GET `/api/m2-program/:id/applications` (public — lists which programs a project has applied to).

**`application_fields` validation.** The server validator dispatches on the target program's `program_type`. Each type has its own schema registered in `server/api/utils/application-fields.validator.js` (new). Phase 1 ships one registered schema:

- **`dogfooding`**: `{ feedback_focus: string, length 1..500 }` — required.

POSTs against a program whose `program_type` has no registered validator return `400 unsupported_program_type_for_application`. Adding a new program type in Phase 2 is a two-line change: register the schema, export it. Client mirrors the same schema when rendering the per-type fields in the apply modal (Issue 9).

**Files.** `supabase/migrations/<timestamp>_create_program_applications.sql`, `server/api/repositories/program-application.repository.js` (new), `server/api/services/program-application.service.js` (new), `server/api/controllers/program.controller.js` (extend), `server/api/routes/program.routes.js` (extend), `server/api/middleware/auth.middleware.js` (extend SIWS statement list for "Apply project X to program Y on Stadium"), `server/api/utils/validation.js`.

**Test scenarios.**
- On `/api/programs/<slug>/applications` (admin GET), an empty result is returned for a new program.
- On `/api/m2-program/<project-id>/applications`, a public GET returns all applications that project has submitted (empty initially).

**Verification notes.** All write paths SIWS-gated. **Playwright blocker** on write flows. Server unit tests should cover: validation of `application_fields` structure, uniqueness constraint (re-application returns 409), admin-only access on the admin GET, auth rejection on team-gated POST.

---

### Issue 9 — Program application: builder UI ("apply with this project")

**Summary.** On `/programs/:slug`, when the connected wallet is a team member of any existing project, the Apply button opens a modal titled "Apply to [Program Name]". The modal shows a selector of the team member's projects, prefilled with the latest one. For Dogfooding specifically, the modal asks a program-type-specific question: "What do you want feedback on?" (500 char max). Submit triggers a SIWS signature and POST.

On success, the modal closes, a success toast appears, and a "You've applied — status: submitted" indicator replaces the Apply button on the program page.

**Multi-project wallet handling.** `findByTeamWallet(address)` may return N ≥ 2 projects — past winners who have been team members across multiple hackathons (Plata Mia is a plausible case). The project selector must:
- Always render as a selector, even when N = 1 (consistent UX).
- Default to the most-recently-updated project.
- Show all N projects, ordered by `updated_at DESC`.
- Disable the Apply button only when N = 0 (with the "You need to be a team member…" messaging).

**Form validation.** The modal's `feedback_focus` textarea uses the same 1..500 validation as the server (see Issue 8). Use the shared validator — do not reintroduce a client-only regex.

**Files.** `client/src/pages/ProgramDetailPage.tsx`, `client/src/components/program/ApplyToProgramModal.tsx` (new), `client/src/lib/api.ts`, `client/src/lib/wallet-context.tsx` (or wherever auth state lives — add a helper `getMyProjects(walletAddress)`), `server/api/repositories/project.repository.js` (add `findByTeamWallet(address)` if not present).

**Test scenarios.**
- On `/programs/<slug>`, an un-authenticated visitor sees Apply button in disabled state (as per Issue 3).
- On `/programs/<slug>`, a connected wallet that is a team member on at least one project sees the Apply button enabled.
- On `/programs/<slug>`, a connected wallet that is NOT on any team sees the Apply button disabled with messaging "You need to be a team member on a Stadium project to apply."
- On `/programs/<slug>`, after a team member applies, the page shows "Applied — status: submitted" instead of the Apply CTA.

**Verification notes.** Scenarios 1 and 3 can be tested in mock mode. Scenarios 2 and 4 are **SIWS-gated blockers** — manual verification before merge. This is the single highest-value issue in the phase and also the one the loop can verify the least; budget time for thorough manual QA.

---

### Issue 10 — Project detail: show program applications

**Summary.** On `ProjectDetailsPage`, add a new small "Programs" section (not a full tab — a section on the Overview) showing which programs this project has applied to, with the application status. Link to each program page.

**Implementation convention — anchors.** Each program in the list links via a real `<a href="/programs/:slug">` anchor (same rule as Issue 2's `ProgramCard`). Users should be able to right-click-open-in-new-tab on any program name.

**Files.** `client/src/pages/ProjectDetailsPage.tsx`, `client/src/components/project/ProjectProgramsSection.tsx` (new), `client/src/lib/api.ts`.

**Test scenarios.**
- On `/m2-program/<project-id>` for a project with one submitted application, the Overview shows a "Programs" section with the program name and "submitted" status.
- On `/m2-program/<project-id>` for a project with no applications, the Programs section shows an empty state or is hidden.

**Verification notes.** Fully testable through Playwright against mock fixtures. This is the moment where the "intuitive link between the two" materialises in UI — the project page now shows where the project has been applied, not just what the team built.

---

### Issue 11 — Admin: create / edit programs

**Summary.** On `/admin`, add a "Create program" button that opens a modal: name, slug (auto-generated from name, editable), type (enum dropdown), description, open/close dates, event dates, location, max applicants. Save hits POST `/api/programs` (admin-gated). The existing programs table gains an "Edit" button per row opening the same modal pre-filled.

**Files.** `client/src/components/admin/ProgramFormModal.tsx` (new), `client/src/components/admin/ProgramsTable.tsx` (extend), `server/api/controllers/program.controller.js` (POST, PATCH), `server/api/routes/program.routes.js` (extend), `server/api/services/program.service.js` (validation, slug uniqueness), `server/api/utils/validation.js`.

**Test scenarios.**
- On `/admin` as an admin, clicking "Create program" opens a modal.
- On `/admin`, submitting the form with all required fields creates a new row visible in the table.
- On `/admin`, the Edit button on a row pre-fills the form with that program's data.

**Verification notes.** All SIWS-gated. **Playwright blocker** — same mitigation as admin flows. Important: test slug uniqueness (two programs with the same slug must fail with a clear error), and test the `applications_open_at` < `applications_close_at` constraint.

---

### Issue 12 — Admin: review applications queue

**Summary.** On `/admin`, when an admin clicks a program row, they go to a per-program admin view showing all applications with filter (submitted / accepted / rejected). Each application card shows the project, the applying team member, application fields, and accept/reject buttons. Accept/reject action updates status via PATCH and sends no notification (notifications are out of scope).

**Files.** `client/src/pages/AdminProgramPage.tsx` (new), `client/src/components/admin/ApplicationCard.tsx` (new), `server/api/controllers/program.controller.js` (PATCH applications), `server/api/routes/program.routes.js`, `server/api/services/program-application.service.js`.

**Test scenarios.**
- On `/admin/programs/<slug>`, an admin sees a list of applications for that program.
- On `/admin/programs/<slug>`, clicking "Accept" on an application updates its status visibly without a page reload.
- On `/admin/programs/<slug>`, filter chips (submitted / accepted / rejected) correctly filter the list.

**Verification notes.** SIWS-gated; same mitigation as all admin flows.

---

### Issue 13 — End-to-end alpha readiness: seed data, copy pass, one real Dogfooding program

**Summary.** Not a code feature — an operational issue. (a) Seed script creates one real 2026 Dogfooding program with final copy, dates, and a call-for-applications message. (b) Pick 3–5 existing projects (Plata Mia + others) whose teams we want as alpha users; confirm their wallets are in team_members and their projects look polished on the Stadium detail page. (c) Copy pass on the three new UI surfaces (Updates, Funding Signal, Apply) — replace any placeholder copy with final copy. (d) Manual end-to-end rehearsal: we walk through Plata Mia's exact journey from login to applied, noting friction.

**Target event.** Dogfooding is running **13–19 June 2026 in Berlin**. The program record created in this issue should reflect those dates (`event_starts_at`, `event_ends_at`, `location = "Berlin"`). Applications open at a date the team picks; close no later than the day before the event starts. Phase 1 needs to land such that the rehearsal (step d) can run with at least two weeks of buffer before applications open — working backwards, Block G should complete **by late May 2026**.

**Pre-conditions validated (audit 2026-04-22).** Vercel preview audit confirmed Plata Mia renders on `/m2-program`, and the sampled cohort of past winners (OpenArkiv, Kleo Protocol, ObraClara, Playnet) all have clean data shape (repo link, live URL, 5–7 team members). The alpha-candidate assumption is valid at the data-shape level.

**Pre-conditions not yet validated — blockers before Block G.** Two existing GitHub issues must land before the rehearsal, tracked separately from the 13 Phase 1 issues:

- **Issue #27** — *Plata Mia bountyPrize is three bounties concatenated into one row.* Her current `bountyPrize` row is stored as `[{name: "Polkadot main track, xx Network bounty, Hyperbridge bounty", amount: 2500}]` instead of three separate rows. Rehearsing with this shape gives Plata Mia a broken first impression on her own Overview. Split before running the rehearsal.
- **Issue #28** — *Verify / restore `fix-bounty-amounts-supabase.js`.* The bounty-amounts reconciliation script was deleted without a confirmed production run. The 2026-04-22 audit validated alpha-candidate data *shape* but not bounty *amounts*. Confirm the full CSV reconciliation has been applied; if not, restore and run before the rehearsal.

These are separate issues in their own right and not part of the 13 Phase 1 issues. They are called out here because Block G cannot be marked green until they are resolved.

**Files.** `server/scripts/seed-alpha-dogfooding-2026.js` (new), misc copy updates, `docs/alpha-rehearsal-notes.md` (new, capturing what we found).

**Test scenarios.**
- Internal rehearsal: a WebZero team member posing as Plata Mia successfully completes the full journey, documenting every moment of friction.

**Verification notes.** This issue is the one we don't skip. It's where the phase proves whether it actually works for real users. The outcome of this issue should directly feed Phase 2 planning.

---

## 6. Loop-readiness summary

Thirteen issues, grouped by how well the current agentic workflow can verify them:

**Fully verifiable by `stadium-tester`** (mock-mode Playwright): 2, 3, 5, 10.

**Partially verifiable** (read side testable, write side SIWS-blocked): 1, 7.

**Write-flow blocked by SIWS** (need server unit tests + manual QA before merge): 4, 6, 8, 9, 11, 12.

**Not a code issue** (operational): 13.

The implication: **at least six of the thirteen issues have a write flow that the Playwright loop cannot verify today.** The SIWS test-wallet harness item on the tactical backlog becomes higher priority as a consequence of this phase — if we run Phases 2, 3, 4 all with this much manual verification overhead, agentic velocity will degrade. Consider prioritising the harness work either before Phase 1 ships or immediately after.

## 7. What this phase intentionally does not answer

Captured here so they don't get quietly deferred without anyone noticing:

- **Pitch Off as a program type.** Requires builder-keyed applications (not project-keyed). A real builders table, or an extension to `program_applications` with nullable `project_id` and a new `builder_wallet_address`, is needed. Phase 2.
- **Notifications on state changes.** An applicant whose status changes from submitted to accepted currently finds out by reloading `/programs/:slug`. Email or Telegram notifications are Phase 2+ and have been flagged in the gap analysis doc for months.
- **Partner-scoped admin.** Still only WebZero admins can see all applications. A partner running their own program cannot yet have scoped access. Phase 2+.
- **Mentor entities, discovery surfaces, milestone marketplace, multi-chain payouts.** All out of scope as discussed in the strategy session. Note: `/m2-program` already exposes a `Teams I Mentor` view-filter option (currently a placeholder). Phase 2 mentor work should reuse this exact label, not introduce new terminology.
- **Renaming `m2_*` columns and promoting `hackathon_*` to a table.** Architectural tidying. Phase 2 or Phase 3. Don't touch in Phase 1.
- **Fixing anchor semantics on existing `/m2-program` cards.** They currently render as `div[role="button"]` and right-click-open-in-new-tab is broken. Phase 1's new surfaces use real anchors; the old surfaces stay as they are (logged as backlog). Strict "additive, nothing gets restructured."

## 8. How to use this document

This document is not itself a GitHub issue. It is the spec that seeds 13 GitHub issues, each of which is a single-issue `ship-issue` loop run.

The recommended sequence to populate the issues:
1. Circulate this spec internally. Get one pass of pushback — especially on the "we are deliberately not doing" section, where strong opinions should be captured before issues are written.
2. **Reconcile with existing open issues before creating new ones** (see §8.1 below).
3. Create the 13 GitHub issues using your standard issue template, with the `## Test scenarios` block for each populated from the scenarios above.
4. For the six issues with SIWS write-flow blockers, add a `## Manual QA checklist` block to the issue body so the reviewer knows what to walk through before merge.
5. Sequence the issues linearly — do not parallelise. The point of the tight feedback loop is that each issue's learnings inform the next. Issue 6's "post update modal UX" might affect how Issue 9's "apply modal UX" feels; run the first to inform the second.
6. After Issue 13 rehearsal, hold a short retro. What surprised us? What took longer than expected? What feature did the alpha users want that we hadn't anticipated? That retro is the input to Phase 2 — not this document.

### 8.1 Existing open issues — triage before creating Phase 1 issues

At the time this spec was authored (2026-04-22), six issues were open. Triage them as follows before creating the 13 new Phase 1 issues:

| # | Title | Disposition |
|---|---|---|
| **#27** | *data: Plata Mia bountyPrize is three bounties concatenated into one row* | **Resolve before Block G.** Listed as a pre-condition in Issue 13. |
| **#28** | *ops: verify / restore `fix-bounty-amounts-supabase.js`* | **Resolve before Block G.** Listed as a pre-condition in Issue 13. |
| **#26** | *schema: store M2 program entitlement per project* | **Defer.** Tangential to the target journey. Revisit at the Phase 1 retro; the existing WinnersTable badge-and-tooltip mitigation remains in place. |
| **#15** | *Notes for improving post-hackathon follow-up process* | **Link, don't fold in.** Phase 1 partially answers two bullets (*"handle what the step is after M2 is completed"* and *"way for teams to associate the project to whatever the next step is"*) — `program_applications` delivers exactly this for Dogfooding. Remaining bullets (non-judge reviewers, 1-on-1 reviews, non-winner form, LinkedIn sharing) stay as Phase 2+ inputs. Add a comment on #15 pointing to this spec and revisit at the retro. |
| **#17** | *Automations for M2 follow-ups* | **Link, don't fold in.** Pure Phase 2+ material (reminders, notifications, dashboards, escalations, templates). Notifications are explicitly deferred (§3.2, context-doc §64). Add a comment on #17 noting it is Phase 2 input and revisit at the retro. |
| **#12** | *Sprint 3: integrate on-chain payouts* | **Defer explicitly.** Contradicts context-doc §52: *"not touching the payout / multisig plumbing."* Leave open; not part of this phase. |

Concretely, the pre-Phase-1 actions are:

1. Post a short comment on **#27** and **#28** linking to this spec and flagging them as Block G blockers. They can be addressed in parallel with Block A; they do not need to ship first.
2. Post a short comment on **#15** and **#17** linking to this spec, noting which bullets Phase 1 addresses (for #15) and that they will be revisited at the retro.
3. Post a short comment on **#26** and **#12** noting they are deferred out of Phase 1 with the reasoning.
4. Only then create the 13 new issues from §5.

---

## 9. Mock fixture ownership

Phase 1 expands what the Vercel preview can demonstrate. Preview URLs run in **mock mode** (`VITE_USE_MOCK_DATA=true`) and read from `client/src/lib/mockWinners.ts` today. Extending this for the new entities is part of the spec, not an afterthought.

**Layout.** Each new entity gets its own companion fixture file:

- `client/src/lib/mockPrograms.ts` — added in Issue 2
- `client/src/lib/mockProjectUpdates.ts` — added in Issue 5
- `client/src/lib/mockFundingSignals.ts` — added in Issue 7
- `client/src/lib/mockApplications.ts` — added in Issue 10

`client/src/lib/api.ts` switches on `USE_MOCK_DATA` to serve from these files for the corresponding new GET endpoints. POSTs/PATCHes in mock mode mutate in-memory objects or `localStorage`, matching the existing pattern for M2 mock writes.

**Seed rule: reuse real projects, don't invent synthetic ones.** The mock data anchor set is existing past winners already in `mockWinners.ts` — OpenArkiv, Kleo Protocol, Plata Mia, ObraClara, Playnet. Adding "Project Acme" or "Example Corp" breaks the boutique aesthetic from `docs/revamp-context.md` §"Aesthetic and tone." Each new fixture references these projects by their real IDs.

**Cumulative expectation.** By the end of Block E (Issue 10), the mock dataset must render the **complete Plata Mia journey** — i.e. a visitor hitting the preview URL should be able to see a Dogfooding program, her project with at least one update posted, a funding signal visible on her Overview, and an application to the Dogfooding program showing on the Programs section of her project page. Issue 13's rehearsal repeats this against real data, but the preview rehearsal is a prerequisite.

---

## 10. Client-side validation convention

Every new client form in Phase 1 — the Post Update modal (Issue 6), the Edit Funding Signal modal (Issue 7), the Apply to Program modal (Issue 9), and the Create Program modal (Issue 11) — must reuse the server's validation functions from `server/api/utils/validation.js`. Shared logic lives in a new `client/src/lib/validation.ts` that imports from or mirrors the server module.

Rules:

- **No new client-only regexes or length checks** that don't exist on the server. If the server enforces `length(body) BETWEEN 1 AND 2000`, the client enforces the same — not a stricter or looser bound.
- **Surface validation errors inline**, not only as toasts after a round-trip. Current M2 modals use toast-only feedback; Phase 1 modals must show the error beside the offending field. This is partly aesthetic (context-doc §"Aesthetic") and partly functional — users shouldn't need to submit a form to find out their input was bad.
- **SS58 addresses**: reuse `validateSS58` shape — 47–48 alphanumeric, no `0/O/I/l`.
- **URLs in `link_url`** (updates), **`funding_signals.description`** (length ≤ 500), and `application_fields.feedback_focus` (length 1..500): same server constraints, mirrored client-side.

Rationale: a gap the improvements doc calls out explicitly is that existing modals validate only on the server, creating avoidable round-trip errors. Phase 1 does not retrofit the existing modals — but it does not add to the pile either.

---

## 11. Login / visitor model

Phase 1 keeps Stadium's existing wallet-based identity and extends it to the new surfaces without introducing a fallback path.

**Non-wallet visitors can:**
- Browse `/programs` and `/programs/:slug`.
- Browse any project detail page, including the new Updates tab and the funding-signal badge.
- See the "Apply" CTA in a disabled state with wallet-connect messaging.

**SIWS is triggered only when a user initiates a write action** — posting an update, editing a funding signal, applying to a program, or any admin action. The signature request happens at submit time, not on page load.

**No non-wallet fallback in Phase 1.** No magic link. No email login. No session cookies. Alpha users who cannot install the Polkadot-JS extension cannot participate — this is an accepted constraint. Plata Mia already has a wallet (her team was paid through the multisig during M2), so the target journey is unaffected.

This locks down the "read-only preview before signing" expectation so no issue accidentally gates read surfaces behind SIWS.

---

## 12. Implementation plan — journey-gated execution

The thirteen issues ship in **seven blocks**. Each block pauses for a **journey-slice verification gate** before the next block starts. The gates are what make the plan real — without them, the app could pass every issue's individual scenarios while the end-to-end journey silently breaks.

### Block → Issues → Gate

| Block | Issues | Journey slice gated on |
|---|---|---|
| **A — Program surface scaffolding** | 1, 2, 3 | "I can find the Dogfooding program." Home → nav "Programs" link → `/programs` → card → `/programs/:slug`. Apply CTA disabled with wallet-connect copy. |
| **B — Project updates** | 4, 5, 6 | "I can post an update on my project." A team member on a sampled real project connects wallet → opens Updates tab → posts → sees update at top of list. |
| **C — Funding signal** | 7 | "I can flag that we're looking for a grant." Team member edits funding signal → "Looking for: grant" badge appears on Overview. |
| **D — Application wiring** | 8, 9 | "I can apply my project to Dogfooding in one action." From `/programs/dogfooding`, team member clicks Apply → modal prefilled with their project → fills `feedback_focus` → signs → page shows "Applied — status: submitted." |
| **E — Cross-surface visibility** | 10 | "My project page shows where I've applied." On the project's Overview, the Programs section lists Dogfooding at "submitted" and links via anchor to the program page. |
| **F — Admin lifecycle** | 11, 12 | "Admin can set up Dogfooding and process applications." Admin creates the Dogfooding program in-app, sees the application queue, accepts the sampled application. |
| **G — Alpha rehearsal** | 13 | End-to-end against real data, real Dogfooding program, real Plata Mia. Output: `docs/alpha-rehearsal-notes.md`. |

### Verification lanes per gate

Each gate runs three lanes:

1. **Auto lane** — `stadium-tester` against the Vercel preview, executing the composed test scenarios from the block's issues. Mock-mode only.
2. **Manual SIWS lane** — a human with a real wallet walks the SIWS-gated write actions against local dev or staging, ticking off the `## Manual QA checklist` block in each issue. Blocks B, C, D, F require this lane.
3. **Journey lane** — a human posing as Plata Mia walks the full journey slice end-to-end, documenting friction in `docs/journey-notes/block-<X>.md`. Copy tone, empty-state feel, modal friction, any "huh, I didn't expect that" moment.

### Rules

- **Do not start block N+1 until block N's gate is green on all three applicable lanes.** If only manual/journey lanes fail, fix before proceeding — even if auto is green.
- **Journey notes land in `docs/journey-notes/block-<X>.md`** at the end of each block. They are the raw input to the Phase 1 retro.
- **If a gate reveals the spec was wrong, stop and flag back to the human.** Phase 2 decisions start from the journey notes; early incorrect signal compounds.
- **By end of Block E, the preview must render Plata Mia's full journey end-to-end** (see §9). Block F and G then repeat against admin-originated and real data respectively.

### Verification-cost summary

- **Fully auto-verifiable**: Block A (most), Block E (fully).
- **Auto + one manual SIWS walk**: Blocks B, C, D, F.
- **Manual-only**: Block G.

Six of seven blocks have at least one SIWS-gated action. The tactical backlog's **SIWS test-wallet harness** (`docs/improvement-backlog.md`) is higher-leverage than any individual Phase 1 issue because it unblocks five blocks at once. If an implementer has spare cycles during Block A or Block B and the harness looks viable, flag it as a side-quest before committing.

### Working-backwards calendar

The Dogfooding event starts **13 June 2026 in Berlin**. Working backwards:

- Applications should open ~2 weeks before the event → **~30 May 2026**.
- Block G rehearsal should complete ~1 week before that → **~23 May 2026**.
- Therefore: **Blocks A–F must land by mid-May 2026**, with a ~1-week buffer for unforeseen friction.

If a block's gate slips, the decision is not "skip the gate" — it's "raise with the team whether the Dogfooding event date is still realistic." Gates are load-bearing; a dropped gate means the alpha user (Plata Mia) encounters a bug the loop should have caught.

---

*End of Phase 1 spec. Phase 2 will be written after Phase 1 ships and we've watched real alpha users.*