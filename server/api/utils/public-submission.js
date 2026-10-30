// The public, email-free view of a tracked submission (mirrors
// client/src/lib/trackedDisplay.ts toPublicSubmission). No emails; an
// anonymous entry hides the point person's and teammates' names, and the
// Bitrefill feedback is never public.
// Prizes, the Ecosystem Prize flag and the milestone show only once results
// are published (`published`).
export const ANONYMOUS = 'Anonymous';

export function toPublicSubmission(s, { published = false } = {}) {
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
      // Only an Ecosystem Prize project shows its milestone (an unflagged one keeps it private).
      milestone: published && s.ecosystemPrize === true ? rest.milestone ?? null : null,
      team: team.map((m) => ({ name: anon ? 'Teammate' : m.name, role: m.role ?? null })),
    },
    prizes: published ? s.prizes ?? {} : {},
    ecosystemPrize: published && s.ecosystemPrize === true,
  };
}

// Highest prize first once published (a project's best prize across tracks).
const bestPrize = (p) => Math.max(0, ...Object.values(p.prizes || {}).map((t) => t?.amount ?? 0));

/** The public list: submission order before results, best prize first after. */
export function toPublicList(rows, published) {
  const list = rows.map((s) => toPublicSubmission(s, { published }));
  if (!published) return list;
  return list
    .map((x, i) => ({ x, i }))
    .sort((a, b) => bestPrize(b.x) - bestPrize(a.x) || a.i - b.i)
    .map(({ x }) => x);
}
