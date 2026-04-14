# Improvement Backlog

Living list of improvements, nits, and observations that agents notice while working on unrelated issues. Items here are **not yet GitHub issues** — they are promoted via `/promote-backlog` after the user confirms.

## How to add an entry

Use `/log-improvement <short description>` or append manually with this template:

```
## [YYYY-MM-DD] <short title>
- **Severity**: nit | minor | major
- **File(s)**: path:line (or "multiple" with list)
- **Observed during**: issue #N / <task description>
- **Suggestion**: one or two sentences describing the change, not the fix
```

## How entries are promoted

`/promote-backlog` reads this file, asks which entries to promote, creates GitHub issues with the `claude-suggested` label, and appends `- **Promoted**: #<issue>` to the entry.

Do **not** manually edit `- **Promoted**` lines.

---

<!-- entries start below this line -->
