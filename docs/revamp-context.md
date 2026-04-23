# Stadium Revamp — Context for Implementation

*A companion to `stadium-revamp-phase-1-spec.md`. Read both before starting work. This doc is context; the spec is contract.*

---

## How to use this document

This document gives you the strategic and historical context behind the Phase 1 spec. It exists because the spec tells you *what* to build, but the spec cannot anticipate every micro-decision you will make daily — copy tone, naming, UX tradeoffs, how to handle edge cases that aren't in a test scenario. Those decisions should be made in the direction this document points.

**If this document and the spec ever conflict, the spec wins.** This document informs; the spec commits. If something here is directly relevant to an issue you're working on and the spec contradicts it, flag the conflict back to the human before making a call yourself.

## What Stadium is, as of the start of Phase 1

Stadium today is, in code terms, a post-hackathon project tracker bolted onto a hackathon winners archive. It tracks six-week M2 incubator cohorts from WebZero's Polkadot hackathons: projects, their teams, their milestones, their submissions, their admin approvals, their multisig-gated USDC payouts. The data model is project-rooted — a project is the primary entity, and hackathons are embedded as columns on it.

The app has three user roles: public visitors (no wallet), team members (wallet matches someone in `team_members`), and admins (wallet in an env-var allowlist). Everything that writes state requires a SIWS signature.

The product is narrowly built. It knows one program exists — the M2 incubator — and every piece of program-specific logic is hardcoded around M2: the six-week phase timeline, the `m2_*` column prefixes, the `/api/m2-program` routes, the `ProjectDetailsPage` tab structure assuming Overview / Milestones / Team & Payments. There is no notion of a program as a first-class entity.

This is what Phase 1 exists to change, but only just enough to unlock one specific user journey. The rest of the revamp comes later.

## What Stadium is becoming

Strategically, Stadium is being repositioned as the **operating tool** for WebZero's broader builder programs business — not as a standalone product, and not as a hackathon platform that competes with DoraHacks or Akindo. This distinction matters for how you make implementation decisions.

WebZero is the business. It is a five-person Berlin events and DevRel agency that runs builder programs for partners — hackathons, hacker houses (The Blockspace), Pitch Offs, Dogfooding sessions, and the M2 incubator. Partners pay WebZero to produce these programs end-to-end. In 2026 the agency widens its partner pool beyond Polkadot to any ecosystem or company that wants to run a builder program.

Stadium is WebZero's operating layer. It is what partners see when they look at their program. It is what builders carry with them after the program ends. It is how five agency employees run many programs in parallel without drowning in spreadsheets. It is not sold separately, and it is not trying to be venture-scale software.

The framing that should guide implementation decisions: **Stadium is the digital extension of what it feels like to participate in a WebZero program.** All other competitor platforms feel corporate — impersonal project pages, cookie-cutter submission forms, everything optimised for the sponsor's logo reel. Stadium should feel the opposite: warm, human, curated, built around the builders rather than around partner KPIs. When in doubt about tone, language, or UX polish — err toward human, toward specific, toward something a builder would want to show their friends. Not toward generic SaaS.

## The one user journey Phase 1 exists to deliver

> **Plata Mia**, a past sub0 hackathon winner whose project is already in Stadium, **logs in, posts an update on their project, flags that they're looking for a grant, sees the open Dogfooding program, and applies to it with their existing project in one action.**

This is the only journey Phase 1 needs to work. Every issue in the spec exists to enable some part of it. If during implementation you find yourself adding something that doesn't directly serve this journey, stop and flag it — it probably belongs to Phase 2.

The journey captures four capabilities Stadium does not have today:

1. **Programs beyond M2.** Today Dogfooding does not exist as an entity in the data model.
2. **Project updates over time.** Today a project's state is a snapshot. There's no timeline of "here's what happened since the last cohort."
3. **Looking-for-funding signal.** Today a builder cannot declare "we're open to a grant of type X." They apply to programs that happen to be open or they don't.
4. **Self-serve program application from an existing project.** Today a project enters Stadium because an admin imports it from a Google Form. A past winner cannot apply to a new program using their existing project record.

The journey's subtle requirement — "with their existing project in one action" — is the load-bearing UX quality. The previous data on Plata Mia's project is the entire point. Make applying feel like "bring what you already built," not "re-enter everything in a new form."

## What Phase 1 is explicitly not doing

The strategy conversation leading to this spec generated a lot of correct long-term direction that is nonetheless wrong for Phase 1. Capturing the deliberate cuts so you don't accidentally smuggle them back in.

**We are not renaming the `m2_*` columns.** Clean-up that sounds right but gives no alpha user anything. A rename is a three-place change (SQL migration + `project.repository.js` + the offline Mongoose model) with real risk of breaking the live M2 program. Phase 2 or later.

**We are not promoting the embedded hackathon columns to a `hackathons` table.** Same reasoning. The current `hackathon_*` columns work; they are ugly but functional; the revamp gets delivered without touching them.

**We are not introducing a `builders` table.** The strategy conversation landed on a dual-spine architecture — projects AND builders as first-class entities — but Dogfooding is project-keyed and doesn't need it. Pitch Off, which is builder-keyed, is a Phase 2 feature. Wallet addresses in `team_members` remain the implicit identity layer.

**We are not building polymorphic program participations.** A single `program_applications` table with `project_id` does the job for Dogfooding. If Phase 2 needs polymorphism for Pitch Off, we migrate then.

**We are not building partner-scoped admin access.** All programs in Phase 1 are WebZero-owned. The spec adds an `owner` column to `programs` with the fixed value `'webzero'` — reserving the shape for Phase 2 without building the UI.

**We are not building mentor entities.** Mentors in M2 remain a free-text string on the agreement. The strategy conversation identified this as a real gap but it's Phase 2+.

**We are not building notifications, discovery surfaces for sponsors, or any form of milestone bounty marketplace.** All deferred.

**We are not touching the multisig payout plumbing.** M2 payments work; don't touch them. Dogfooding doesn't have payouts.

**We are not making project profiles or builder profiles mandatory for participation.** The strategy conversation was clear that enforcing profiles creates lock-in and defeats the authenticity positioning. Profiles should be optional and sparse; participation should be frictionless.

When reviewing any piece of the spec, if you find yourself thinking "it would be cleaner if we also..." — the answer is almost certainly no, not in this phase.

## The guiding design principle for Phase 1: additive, not transformative

Every change in this phase adds a new table, a new route, or a new component. Nothing gets renamed. Nothing gets restructured. The existing M2 flow keeps working untouched. A user who has been using Stadium as a pure M2 tracker should experience zero regressions in their existing flows.

This matters because if Phase 1 fails to resonate with alpha users, we want to be able to walk it back with a few drop-tables and removed routes — not spend a sprint restoring functionality we accidentally destroyed during the revamp.

Another consequence: when you find a legacy quirk that bothers you, log it via `/log-improvement` instead of fixing it inline. Phase 1 will surface plenty of things that should probably change eventually. Capture them; don't act on them.

## The aesthetic and tone to aim for

The strategic work behind Phase 1 identified that Stadium's competitors all feel corporate — DoraHacks, Akindo, Devpost, Devfolio, TAIKAI. Impersonal project pages. Generic submission forms. A dashboard vibe. Stadium is positioned as the opposite: boutique, warm, editorial, built around the builder's perspective.

Practical implications for the UI work in this phase:

**Copy should read like a human wrote it.** "Post an update" not "Submit status report." "Looking for a grant" not "Funding interest declaration." "Apply to Dogfooding" not "Initiate application workflow." When you draft microcopy in a new component, pick the most conversational phrasing that still communicates clearly.

**Empty states are opportunities, not apologies.** An empty Updates tab should feel like "nothing here yet — post the first one" with a warm CTA, not a grey box saying "No data." The empty-state text is some of the highest-surface-area copy in the app.

**Avoid adding "helpful" UI that makes builders feel watched or managed.** Progress bars, completion percentages, compliance-flavoured badges — these are sponsor-platform patterns and they break the tone. Builders are not metrics targets.

**When you have to choose between sparse and polished vs. feature-complete and generic, choose sparse and polished.** Five beautifully designed fields beat a twenty-field application form on every dimension that matters for Phase 1.

## The user roles the spec touches and how they intersect

**Public visitors.** See all programs (the new `/programs` index and detail pages), all projects, all updates on projects. Don't see applications. Don't see admin surfaces. Nothing changes for them except the new `/programs` surface.

**Team members (wallet in `team_members` for at least one project).** Can post project updates, edit their funding signal, apply their project to an open program. This is the audience of Phase 1 — Plata Mia's team are team members.

**Admins (wallet in the admin allowlist).** Can create / edit / close programs, review applications, accept or reject them. The admin surface grows significantly in this phase — it's the primary way WebZero ops configures a program before it opens.

**Note on applicants who aren't yet team members.** If someone wants to apply to Dogfooding but has never been through a WebZero program before and isn't on any project's team, they cannot apply in Phase 1. They need a project in Stadium first, and the only way to get one is through an existing program (hackathon, M2). This is an intentional narrow cut — the self-serve "create a project from scratch and apply" flow is out of scope for Phase 1. Mentioning this so you don't accidentally build that flow as a "small convenience" — it's not small, and it expands scope significantly.

## The agentic workflow's constraints on this phase

This is important because the loop shapes what's easy to ship and what isn't.

Playwright runs against Vercel previews in mock mode. Mock mode bypasses the server and serves static fixtures. The consequence: **any UI flow that requires a SIWS signature cannot be fully verified by `stadium-tester` today.** This affects roughly six of Phase 1's thirteen issues.

For those issues, the plan is:
- Unit-test the server behaviour thoroughly (validation, auth rejection, happy path, edge cases).
- For the UI, exercise what you can in mock mode (layout, disabled states, empty states).
- Manual SIWS QA before PR merge, documented as a `## Manual QA checklist` block in the issue body.

Do not try to invent a test that pretends to verify a SIWS-gated flow when it actually doesn't. The tester's report being green on a flow that was never exercised is worse than no test at all.

When you encounter a Phase 1 issue with SIWS-gated writes, explicitly list in the PR description which scenarios were auto-verified by `stadium-tester` and which require manual sign-off. The human reviewer should see this cleanly.

There is a tactical backlog item for a "SIWS test-wallet harness" that would unblock this. If you have spare cycles during Phase 1 and the harness is viable to spike, flag it as a potentially valuable side-quest before committing to it — it's arguably higher-leverage than any individual Phase 1 issue because it unblocks verification for the rest of the revamp.

## Data model additions, summarised

The spec has the full DDL. A high-level orientation:

**`programs`** is the new root entity for anything that isn't an M2 incubator. Light schema — name, slug, type (enum), status, dates, location, owner (always `'webzero'` in Phase 1). Existing M2 cohorts are not migrated into this table during Phase 1. They remain as embedded state on the `projects` row. The `programs` table coexists alongside the M2-aware columns without replacing them.

**`program_applications`** joins a project to a program. Uniqueness is enforced on `(program_id, project_id)` — a project can apply to a given program only once, and must withdraw to re-apply. Application metadata lives in a JSONB column so Dogfooding's "what do you want feedback on" doesn't need its own schema. If the uniqueness constraint turns out to be wrong for real-world Dogfooding (e.g. teams routinely want to re-apply after being rejected), flag this — it's easy to drop.

**`project_updates`** is an append-only log on projects. Immutable. Short body (1–2000 chars) and an optional link. No reactions, no comments, no edits. If you find yourself adding more, stop — the whole point of a minimal updates feature is to see whether builders actually post.

**`project_funding_signals`** is 1:1 with projects but in its own table (not a column) so we can later track changes over time without migrating again. A boolean "seeking" flag, a type enum, a free-text amount range, a short description. One row per project, updated in place.

Every FK cascades on parent delete. Nothing is rename-sensitive.

## Invariants and principles to uphold

These are non-negotiable and exist independent of this spec. Capturing them here because a brainstorming agent building new things is the most likely kind of agent to accidentally violate one.

**The API data layer is Supabase.** Server-side Mongoose is script-only, never in the API path. When you add a new table, the repository goes in `server/api/repositories/`, not `server/models/`.

**`BYPASS_ADMIN_CHECK` must stay `false`.** There is real production history of this being set to `true` and shipping as a full auth bypass. If you ever see this flag being touched during implementation work, flag it loudly.

**Admin wallets come from env vars. Always.** No hardcoded addresses anywhere in the codebase.

**No `console.log` / `warn` / `error` in production client code.** Deliberately stripped. Use the project's existing logging conventions for server code.

**Every admin-protected route uses the `requireAdmin` or `requireTeamMemberOrAdmin` middleware.** No ad-hoc auth checks inside controllers.

**Client env vars that reach the browser must be prefixed `VITE_`.** Anything else is server-only.

**Server is ESM.** `import` not `require`.

**Dark mode is forced.** No light-mode-only styles, no `prefers-color-scheme` branches.

**PRs target `develop`.** Agents never merge. Never force-push shared branches. Never bypass with `--no-verify`.

## How to approach an individual Phase 1 issue

This maps to the existing `ship-issue` loop. Nothing new. Emphasising because the details matter:

1. **Read the issue's `## Test scenarios` block carefully.** The scenarios are non-negotiable — they describe the verifiable contract. If you think a scenario is wrong, raise it before writing code. Don't silently reinterpret.
2. **Check the issue's `## Manual QA checklist` block if present.** SIWS-gated issues will have one. Internalise what the human reviewer will walk through before merging.
3. **When planning, consult this context doc.** If the issue is ambiguous and this doc gives clarity, follow this doc's direction. If the spec gives different guidance, follow the spec.
4. **Prefer the smallest diff that satisfies the scenarios.** The Phase 1 instinct is additive and minimal. If you find yourself wanting to refactor an adjacent file to make the new feature cleaner, stop — log it as an improvement and ship the feature without the refactor.
5. **Write the PR description as if the reader has never seen this context doc.** Summary, test plan, tester report, any backlog entries. Don't assume context.
6. **Stop and report on any failure.** Never bypass, never disable a test, never force-push.

## What "done" looks like for Phase 1

The whole phase lands when:

- Plata Mia's team successfully completes the target journey end-to-end against a real Dogfooding program.
- The `stadium-tester` scenarios that can be automated are green across all thirteen issues.
- Each SIWS-gated issue has a completed manual QA checklist signed off by a human before merge.
- The rehearsal note from Issue 13 is written, captured in `docs/`, and reviewed by the team.
- No regressions in the existing M2 flow. A current cohort team who logs in during or after Phase 1 sees their M2 experience unchanged.

After that, the team holds a retro. What real alpha users did, what surprised the team, what features they asked for that Phase 1 didn't anticipate — that retro is the input to Phase 2. Do not start planning Phase 2 before the retro.

## Questions you should ask before starting

If any of these are unclear from the spec or this doc, ask the human before beginning implementation work:

- Is Plata Mia the right specific alpha user, or are there better candidates?
- Is there existing visual / design language in the app that new surfaces (programs page, application modal) should match tightly, or is there room to introduce a slightly warmer tone for the new surfaces?
- Is there a specific production date for the Dogfooding event the phase is aiming at? That anchors the timeline for Issue 13.
- Who is the primary human reviewer for Phase 1 PRs? That determines how much context goes in each PR description.

---

*This document was written April 2026, in tandem with the Phase 1 spec. It should be re-read before each issue is started and updated if Phase 1 scope changes during implementation.*