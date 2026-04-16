---
name: Bug report
about: Something is broken. Fields marked (required) are relied on by the agentic workflow.
title: "fix: "
labels: ["bug"]
---

## Repro steps (required)

1. ...
2. ...
3. ...

## Expected (required)

What should happen.

## Actual (required)

What happens instead. Include error messages, screenshots, console output if relevant.

## Environment

- Where: local / preview / production
- Browser / Node version: ...
- Wallet / extension (if admin flow): ...

## Files likely affected (optional hint)

- `client/src/...` or `server/api/...`

## Test scenarios

White-box checks the `stadium-tester` agent runs against the Vercel preview before the PR is opened. Describe the *fixed* behavior as verifiable steps. Format: `On <route>, <action> → <expected state>`.

- [ ] On `/<route>`, reproduce the bug's precondition → UI shows fixed state (not the broken one)
- [ ] ...

## Notes
