// Automatic submission categories (agents, rewards, wallets…) for programs
// with `categories` in their profile. Derived on every render from the
// submission's own text, never stored: editing a pitch re-files the project.
import type { ApiTrackedSubmission } from "./api";
import type { SubmissionCategory } from "./programProfiles";

export const OTHER_CATEGORY = { id: "other", label: "Other" } as const;

export type CategoryMatch = { id: string; label: string; matched: string[] };

type Classifiable = Pick<ApiTrackedSubmission, "projectTitle"> & {
  projectBrief?: string | null;
  details?: { pitch?: string | null; appType?: string | null } | null;
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// A keyword matches at the start of a word, so "agent" also matches "agents"
// and "agentic", but "age" doesn't match "page".
const hits = (text: string, kw: string) => (text.match(new RegExp(`\\b${escape(kw.toLowerCase())}`, "g")) ?? []).length;

/**
 * The best-matching category: title hits count 3, pitch / brief / app type 1.
 * Ties go to the category listed first; no hit at all is "Other".
 */
export function classifySubmission(categories: SubmissionCategory[], s: Classifiable): CategoryMatch {
  const title = s.projectTitle.toLowerCase();
  const body = [s.details?.pitch, s.projectBrief, s.details?.appType].filter(Boolean).join(" \n ").toLowerCase();
  let best: CategoryMatch | null = null;
  let bestScore = 0;
  for (const c of categories) {
    let score = 0;
    const matched: string[] = [];
    for (const kw of c.keywords) {
      const n = 3 * hits(title, kw) + hits(body, kw);
      if (n > 0) {
        score += n;
        matched.push(kw);
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = { id: c.id, label: c.label, matched };
    }
  }
  return best ?? { ...OTHER_CATEGORY, matched: [] };
}

/** Counts per category in config order (Other last, only when used), largest first. */
export function countByCategory(categories: SubmissionCategory[], subs: Classifiable[]) {
  const counts = new Map<string, number>();
  for (const s of subs) {
    const c = classifySubmission(categories, s);
    counts.set(c.id, (counts.get(c.id) ?? 0) + 1);
  }
  return [...categories, OTHER_CATEGORY]
    .map((c) => ({ id: c.id, label: c.label, count: counts.get(c.id) ?? 0 }))
    .filter((c) => c.count > 0 || c.id !== OTHER_CATEGORY.id)
    .sort((a, b) => b.count - a.count);
}

/** The themes a submission picked, or "No theme" (e.g. Agentic-only entries). */
export const NO_THEME = "No theme";
export const themesOf = (s: { details?: { themes?: string[] | null } | null }) =>
  s.details?.themes?.length ? s.details.themes : [NO_THEME];
