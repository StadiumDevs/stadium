import type { ApiPublicSubmission, ApiTrackedSubmission, JudgedTrack } from "./api";

export const ANONYMOUS = "Anonymous";

/**
 * The public view of a submission: no emails or private check-in answers, and
 * anonymous entries hide every name. Used by the public page and by judges
 * (only admins read the full record). Prizes show only when `showPrizes`;
 * `showNames` keeps anonymous builders' names (admin views only).
 */
export const toPublicSubmission = (
  s: ApiTrackedSubmission,
  { showPrizes, showNames = false }: { showPrizes: boolean; showNames?: boolean },
): ApiPublicSubmission => {
  const { team, checkIns, ...rest } = s.details;
  const anon = !!s.details.anonymous && !showNames;
  return {
    id: s.id,
    projectTitle: s.projectTitle,
    projectBrief: s.projectBrief,
    submitterName: anon ? ANONYMOUS : s.submitterName,
    videoUrl: s.videoUrl,
    githubUrl: s.githubUrl,
    late: !!s.late,
    createdAt: s.createdAt,
    details: { ...rest, team: team.map((m) => ({ name: anon ? "Teammate" : m.name, role: m.role ?? null })) },
    prizes: showPrizes ? s.prizes : {},
    ecosystemPrize: showPrizes && s.ecosystemPrize,
  };
};

/** The (track, prize) pairs a public submission won. */
export const prizeEntries = (s: ApiPublicSubmission) =>
  (Object.entries(s.prizes) as [JudgedTrack, NonNullable<ApiPublicSubmission["prizes"][JudgedTrack]>][]).filter(
    ([, p]) => !!p,
  );

export const formatPrize = (p: { amount: number; currency: string }) =>
  p.currency === "USD" ? `$${p.amount.toLocaleString("en-US")}` : `${p.amount} ${p.currency}`;
