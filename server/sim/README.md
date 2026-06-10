# Judging simulation

A role-playing simulation of the Bitrefill judging journey. Agents (a submitter,
three judges, an organizer) drive the **real** controllers, the
`requireProgramJudge` middleware, and the scoring service against an in-memory
Supabase fake — no live database required.

It doubles as an end-to-end integration test and a source of UX findings.

## Run

```bash
cd server
npx vitest run sim/__tests__/judging-journey.test.js
```

It runs as part of `npm test` too (the file lives under `__tests__/`).

## What it exercises

submit → dedup/validation → invite judges → eligibility flagging → range-checked
scoring → ballot gating → leaderboard lock/unlock + tally + ranking → ballot lock.

## Output

Each run regenerates `SIMULATION_REPORT.md` here: a journey walkthrough plus a
ranked list of improvement ideas (some discovered empirically by the run, e.g.
an ineligible entry placing on the leaderboard).

## Files

- `fakeSupabase.js` — in-memory Supabase query-builder fake (sim/test only; never shipped, not wired to any route).
- `simState.js` — shared singleton store + auth registry the mocked `db.js` and the test both read.
- `__tests__/judging-journey.test.js` — the agents + scenarios + report generator.
