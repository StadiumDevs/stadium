---
name: Feature request
about: Propose a new feature or enhancement. Fields marked (required) are relied on by the agentic workflow.
title: "feat: "
labels: ["feature"]
---

## Goal (required)

What user-facing outcome does this feature produce? One or two sentences.

## Acceptance criteria (required)

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Files likely affected (optional hint)

Paths the implementer should start from. OK to leave blank — the explorer will figure it out.

- `client/src/...`
- `server/api/...`

## Out of scope

What **not** to touch. Prevents scope creep.

- ...

## Test scenarios

White-box checks the `stadium-tester` agent runs against the Vercel preview before the PR is opened. Format: `On <route>, <action> → <expected state>`. Keep scenarios to public routes or preview-mocked admin views — SIWS-gated live flows are skipped automatically.

- [ ] On `/`, page loads → header shows "Stadium"
- [ ] On `/<route>`, <action> → <expected state>

## Notes / context

Links to designs, related issues, prior art.
