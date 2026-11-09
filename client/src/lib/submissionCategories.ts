// Submission categories for programs with `categories` in their profile (Free
// Society Hack: the curated map in programStatsConfig.ts). A project is
// matched by id or title (programStats.ts categorize); anything unmatched is
// Uncategorized, with a keyword-based suggestion for the admin preview. The
// judging table, the ranked CSV, the admin chart and the stats page all use this.
import type { SubmissionCategory } from "./programStatsConfig";
import { UNCATEGORIZED } from "./programStatsConfig";
import { categorize, suggestCategory } from "./programStats";

export { UNCATEGORIZED };

export type CategoryMatch = { id: string; label: string; by: "id" | "title" | null; suggested: string | null };

type Classifiable = {
  id?: string;
  projectTitle: string;
  projectBrief?: string | null;
  details?: { pitch?: string | null } | null;
};

export function classifySubmission(categories: SubmissionCategory[], s: Classifiable): CategoryMatch {
  const hit = categorize(categories, { id: s.id ?? "", projectTitle: s.projectTitle });
  return { ...hit, suggested: hit.by ? null : suggestCategory(categories, s) };
}

/** Counts per category in config order (Uncategorized last, only when used), largest first. */
export function countByCategory(categories: SubmissionCategory[], subs: Classifiable[]) {
  const counts = new Map<string, number>();
  for (const s of subs) {
    const c = classifySubmission(categories, s);
    counts.set(c.id, (counts.get(c.id) ?? 0) + 1);
  }
  return [...categories, UNCATEGORIZED]
    .map((c) => ({ id: c.id, label: c.label, count: counts.get(c.id) ?? 0 }))
    .filter((c) => c.count > 0 || c.id !== UNCATEGORIZED.id)
    .sort((a, b) => b.count - a.count);
}

/** The themes a submission picked, or "No theme" (e.g. Agentic-only entries). */
export const NO_THEME = "No theme";
export const themesOf = (s: { details?: { themes?: string[] | null } | null }) =>
  s.details?.themes?.length ? s.details.themes : [NO_THEME];
