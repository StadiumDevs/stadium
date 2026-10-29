// The public, email-free view of a tracked submission (mirrors
// client/src/lib/trackedDisplay.ts toPublicSubmission). No emails; an
// anonymous entry hides the point person's and teammates' names, and the
// Bitrefill feedback is never public.
// Prizes by track arrive with the awards slice; until then none are shown.
export const ANONYMOUS = 'Anonymous';

export function toPublicSubmission(s) {
  const d = s.details || {};
  const anon = d.anonymous === true;
  // Bitrefill feedback goes to Bitrefill, not the public page.
  const { team = [], bitrefillFeedback: _bitrefillFeedback, ...rest } = d;
  return {
    id: s.id,
    projectTitle: s.projectTitle,
    projectBrief: s.projectBrief ?? '',
    submitterName: anon ? ANONYMOUS : s.submitterName,
    videoUrl: s.videoUrl,
    githubUrl: s.githubUrl,
    late: !!s.late,
    createdAt: s.createdAt,
    details: {
      ...rest,
      txCheck: rest.txCheck ?? null,
      milestone: rest.milestone ?? null,
      team: team.map((m) => ({ name: anon ? 'Teammate' : m.name, role: m.role ?? null })),
    },
    prizes: {},
    ecosystemPrize: false,
  };
}
