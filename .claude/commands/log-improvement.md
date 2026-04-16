---
description: Append an improvement or observation to docs/improvement-backlog.md. Does not open GitHub issues.
argument-hint: <short description>
---

Append a new entry to `docs/improvement-backlog.md` capturing: **$ARGUMENTS**.

## Steps

1. Read `docs/improvement-backlog.md` to understand the current format.
2. Ask yourself (and answer in the entry):
   - **Severity**: `nit` (cosmetic/tiny), `minor` (small quality issue), `major` (real bug or risk)
   - **File(s)**: specific `path:line` references
   - **Observed during**: the issue number or task you were working on
   - **Suggestion**: one or two sentences. Don't write the fix — describe the change.
3. Append (do not rewrite the file) using this template:

   ```
   ## [YYYY-MM-DD] <title>
   - **Severity**: nit | minor | major
   - **File(s)**: path:line
   - **Observed during**: issue #N / <task>
   - **Suggestion**: ...
   ```

   Use today's date. Title should be short and specific.

4. Confirm to the user: "Logged: <title>" and nothing else.

**Do not** open a GitHub issue from this command. `/promote-backlog` handles that separately and asks first.
