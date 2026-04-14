---
description: Read docs/improvement-backlog.md and (after user confirmation) promote selected entries to GitHub issues with the claude-suggested label.
---

Convert backlog entries in `docs/improvement-backlog.md` into GitHub issues. **Always ask the user which to promote before running `gh issue create`.**

## Steps

1. Confirm `gh` is installed: `gh --version`. If not, stop.
2. Read `docs/improvement-backlog.md`. Parse entries (delimited by `## [date] title`).
3. Show the user a numbered list of entries that are *not yet promoted* (promoted entries will have a trailing `- **Promoted**: #<issue>` line — skip those).
4. Ask the user which entries to promote — by number, range, or "all". Use `AskUserQuestion` if available; otherwise plain text.
5. For each selected entry, create an issue:
   ```bash
   gh issue create \
     --label claude-suggested \
     --title "<title from backlog entry>" \
     --body "$(cat <<'EOF'
   <Severity, File(s), Observed during, Suggestion from backlog>

   ---
   *Promoted from `docs/improvement-backlog.md` via `/promote-backlog`.*
   EOF
   )"
   ```
6. After each successful creation, append a line `- **Promoted**: #<issue-number>` to the entry in `docs/improvement-backlog.md` so it isn't suggested again.
7. Report to the user: list of promoted entries with issue URLs.

**Never** promote without confirmation. **Never** promote `nit` severity items unless the user explicitly includes them — default to `minor` and `major` when the user says "all".
