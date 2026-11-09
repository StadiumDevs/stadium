// Judges' feedback per project (AI-written, fact-checked) from the versioned
// fixture. Port of server/api/services/project-feedback.service.js
// feedbackBySubmission, so the playground shows the same text.
import type { ApiProjectFeedback } from "./api";
import { matchReviewRows, type PrivacyReviewData } from "./privacyReview";

export type ProjectFeedbackData = {
  version: {
    version: string;
    generatedDate: string;
    generatedBy: string;
    projectCount: number;
    notesCount: number;
    projectsWithNotes: number;
    factCheckSources?: string[];
    changelog?: { version: string; date: string; text: string }[];
  };
  projects: {
    title: string;
    repo: string | null;
    basis: string;
    summary: string;
    worked: string[];
    improve: string[];
    facts: { text: string; source: string | null }[];
  }[];
};

type MatchSubmission = Parameters<typeof matchReviewRows>[1][number];

/** How the feedback was written (for the page's "AI-generated" popup); from the fixture's version block. */
const aboutOf = (v: ProjectFeedbackData["version"]): ApiProjectFeedback["about"] => ({
  model: (v.generatedBy.match(/\((claude-[\w-]+)/) ?? [])[1] ?? null,
  generatedDate: v.generatedDate,
  projectCount: v.projectCount,
  projectsWithNotes: v.projectsWithNotes,
  notesCount: v.notesCount,
  factCheckSources: v.factCheckSources ?? [],
  version: v.version,
  latestChange: v.changelog?.[0] && v.changelog[0].version === v.version ? v.changelog[0].text : null,
});

export function feedbackBySubmission(fb: ProjectFeedbackData | null, submissions: MatchSubmission[]): Map<string, ApiProjectFeedback> {
  const out = new Map<string, ApiProjectFeedback>();
  if (!fb) return out;
  const asReview = { version: fb.version, projects: fb.projects.map((p) => ({ shortName: p.title, title: p.title, repo: p.repo })) } as unknown as PrivacyReviewData;
  const byTitle = new Map(fb.projects.map((p) => [p.title, p]));
  const about = aboutOf(fb.version);
  for (const m of matchReviewRows(asReview, submissions)) {
    if (m.status !== "matched" || !m.submissionId) continue;
    const p = byTitle.get(m.shortName)!;
    out.set(m.submissionId, {
      summary: p.summary,
      worked: p.worked,
      improve: p.improve,
      facts: p.facts,
      basis: p.basis,
      version: fb.version.version,
      generatedDate: fb.version.generatedDate,
      generatedBy: fb.version.generatedBy,
      about,
    });
  }
  return out;
}
